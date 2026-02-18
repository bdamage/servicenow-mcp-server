/**
 * Assess Database Health Tool
 * Counts records across all SOP 0 target tables in parallel and applies severity thresholds.
 * Combines discover_tables (for rotation table discovery) + get_record_count (for Aggregate API)
 * into a single call that returns a complete Section 2 database health assessment.
 *
 * SOP 0 Section 2: Database Health Assessment — CRITICAL FOCUS
 */

import { z } from 'zod';
import { getClient } from '../servicenow/client.js';
import { handleError, formatSuccess } from '../utils/error-handler.js';

/**
 * SOP 0 severity thresholds per table.
 * Key = table name (or base name for rotation families), value = threshold config.
 */
const SOP_THRESHOLDS: Record<string, { critical: number; elevated: number; label: string }> = {
  syslog:           { critical: 20_000_000, elevated: 5_000_000,  label: 'Syslog (incl. rotation tables)' },
  sys_audit:        { critical: 50_000_000, elevated: 10_000_000, label: 'Audit Log' },
  sys_journal_field:{ critical: 20_000_000, elevated: 5_000_000,  label: 'Journal Fields' },
  sys_flow_context: { critical: 1_000_000,  elevated: 400_000,    label: 'Flow Context' }
};

const DEFAULT_TABLES = ['syslog', 'sys_audit', 'sys_journal_field', 'sys_flow_context'];

const assessDatabaseHealthSchema = z.object({
  tables: z.array(z.string().min(1)).max(20).optional()
    .describe('Tables to assess. Default: syslog, sys_audit, sys_journal_field, sys_flow_context (SOP 0 core set). Syslog rotation tables are auto-discovered.'),
  include_syslog_rotations: z.boolean().default(true)
    .describe('Auto-discover and count syslog rotation tables (syslog0000, syslog0001, etc.). Default: true.'),
  custom_thresholds: z.record(z.object({
    critical: z.number().min(0),
    elevated: z.number().min(0)
  })).optional()
    .describe('Override severity thresholds per table. Example: {"sys_flow_context": {"critical": 2000000, "elevated": 500000}}')
});

export type AssessDatabaseHealthInput = z.infer<typeof assessDatabaseHealthSchema>;

function classifySeverity(count: number, critical: number, elevated: number): string {
  if (count >= critical) return 'CRITICAL';
  if (count >= elevated) return 'ELEVATED';
  return 'HEALTHY';
}

function severityEmoji(severity: string): string {
  if (severity === 'CRITICAL') return '🔴';
  if (severity === 'ELEVATED') return '🟡';
  return '🟢';
}

export async function executeAssessDatabaseHealth(args: unknown) {
  try {
    const params = assessDatabaseHealthSchema.parse(args);
    const client = getClient();
    const assessmentTimestamp = new Date().toISOString();
    const targetTables = params.tables ?? DEFAULT_TABLES;

    // Merge thresholds: built-in defaults + user overrides
    const thresholds = { ...SOP_THRESHOLDS };
    if (params.custom_thresholds) {
      for (const [table, t] of Object.entries(params.custom_thresholds)) {
        thresholds[table] = {
          critical: t.critical,
          elevated: t.elevated,
          label: thresholds[table]?.label ?? table
        };
      }
    }

    // Step 1: Discover syslog rotation tables if requested
    let syslogRotationTables: string[] = [];
    if (params.include_syslog_rotations && targetTables.includes('syslog')) {
      try {
        const dbObjResponse = await client.query('sys_db_object', {
          sysparm_query: 'nameSTARTSWITHsyslog^nameNOT LIKEsyslog_^ORDERBYname',
          sysparm_fields: 'name',
          sysparm_limit: 50
        });

        const rotationPattern = /^syslog\d{4}$/;
        for (const record of dbObjResponse.result) {
          const name = (record as any).name;
          if (name && rotationPattern.test(name)) {
            syslogRotationTables.push(name);
          }
        }
      } catch {
        // Rotation discovery failed — continue with main syslog only
      }
    }

    // Step 2: Build the full list of tables to count
    // For syslog, we count the base table + all rotation tables, then sum
    const countTasks: Array<{ table: string; group: string }> = [];

    for (const table of targetTables) {
      countTasks.push({ table, group: table });

      // Add rotation tables under the syslog group
      if (table === 'syslog') {
        for (const rotTable of syslogRotationTables) {
          countTasks.push({ table: rotTable, group: 'syslog' });
        }
      }
    }

    // Step 3: Count all tables in parallel using Aggregate API
    const countResults = await Promise.all(
      countTasks.map(async (task) => {
        try {
          const result = await client.getAggregateCount(task.table);
          return { table: task.table, group: task.group, count: result.count, error: null };
        } catch (e: any) {
          return { table: task.table, group: task.group, count: 0, error: e?.message ?? 'Query failed' };
        }
      })
    );

    // Step 4: Aggregate by group (syslog + rotations get summed)
    const groupTotals: Record<string, { total: number; tables: Array<{ table: string; count: number; error: string | null }> }> = {};

    for (const result of countResults) {
      if (!groupTotals[result.group]) {
        groupTotals[result.group] = { total: 0, tables: [] };
      }
      groupTotals[result.group].total += result.count;
      groupTotals[result.group].tables.push({
        table: result.table,
        count: result.count,
        error: result.error
      });
    }

    // Step 5: Apply severity thresholds and build assessment
    const tableAssessments: any[] = [];
    let overallSeverity = 'HEALTHY';

    for (const [group, data] of Object.entries(groupTotals)) {
      const threshold = thresholds[group];
      const severity = threshold
        ? classifySeverity(data.total, threshold.critical, threshold.elevated)
        : 'UNCLASSIFIED';

      if (severity === 'CRITICAL') overallSeverity = 'CRITICAL';
      else if (severity === 'ELEVATED' && overallSeverity !== 'CRITICAL') overallSeverity = 'ELEVATED';

      const assessment: any = {
        table: group,
        label: threshold?.label ?? group,
        total_records: data.total,
        severity: `${severityEmoji(severity)} ${severity}`,
        thresholds: threshold
          ? { critical: threshold.critical, elevated: threshold.elevated }
          : null
      };

      // Show per-table breakdown if there are rotation tables
      if (data.tables.length > 1) {
        assessment.breakdown = data.tables.sort((a, b) => b.count - a.count);
        assessment.rotation_tables_found = data.tables.length - 1; // exclude base table
      }

      tableAssessments.push(assessment);
    }

    // Step 6: Path classification per SOP 0
    let pathClassification: string;
    const hasCritical = tableAssessments.some((a: any) => a.severity.includes('CRITICAL'));
    const hasElevated = tableAssessments.some((a: any) => a.severity.includes('ELEVATED'));

    if (hasCritical) {
      pathClassification = 'Path 2 (Emergency) — Critical intervention required. Proceed to Priority 0: Stop the Bleeding.';
    } else if (hasElevated) {
      pathClassification = 'Path 1 (Proactive) — Elevated but stable. Schedule cleanup within 24-48 hours.';
    } else {
      pathClassification = 'Path 0 (SOP) — Standard operations. All tables within healthy limits.';
    }

    // Step 7: Generate errors summary
    const errors = countResults.filter(r => r.error !== null);

    return formatSuccess({
      success: true,
      assessment_timestamp: assessmentTimestamp,
      overall_severity: `${severityEmoji(overallSeverity)} ${overallSeverity}`,
      path_classification: pathClassification,
      tables_assessed: tableAssessments.length,
      syslog_rotation_tables_found: syslogRotationTables.length,
      assessments: tableAssessments,
      ...(errors.length > 0 ? { query_errors: errors } : {}),
      next_steps: hasCritical
        ? [
            'Run query_scheduled_jobs to identify toxic jobs (SOP Section 3)',
            'Run query_syslog with levels=[0,1] to check for critical errors (SOP Section 4)',
            'Disable toxic jobs with toggle_scheduled_job (Priority 0)',
            'Begin chunked cleanup with bulk_delete_records (Priority 1)'
          ]
        : hasElevated
          ? [
              'Run query_scheduled_jobs to audit job frequencies',
              'Review syslog error patterns with query_syslog',
              'Consider proactive cleanup with bulk_delete_records'
            ]
          : ['Instance database health is within normal limits. No immediate action required.']
    });
  } catch (error) {
    return handleError(error, 'assess_database_health');
  }
}

export const assessDatabaseHealthTool = {
  name: 'assess_database_health',
  description: [
    'Performs a complete SOP 0 Section 2 Database Health Assessment in a single call.',
    'Counts records across all critical tables (syslog + rotation tables, sys_audit, sys_journal_field, sys_flow_context)',
    'using the Aggregate API, applies severity thresholds, and returns a Path 0/1/2 classification.',
    'Auto-discovers syslog rotation tables (syslog0000, syslog0001, etc.) and sums their counts.',
    'Thresholds: syslog >20M = CRITICAL, >5M = ELEVATED; sys_flow_context >1M = CRITICAL, >400K = ELEVATED.',
    'Run this as the FIRST database assessment step in every War Room Assessment.',
    'For deeper analysis of individual tables, use get_record_count or query_syslog.'
  ].join(' '),
  inputSchema: {
    type: 'object',
    properties: {
      tables: {
        type: 'array',
        items: { type: 'string' },
        description: 'Tables to assess. Default: ["syslog", "sys_audit", "sys_journal_field", "sys_flow_context"]. Add custom tables as needed.'
      },
      include_syslog_rotations: {
        type: 'boolean',
        description: 'Auto-discover and count syslog rotation tables. Default: true.',
        default: true
      },
      custom_thresholds: {
        type: 'object',
        description: 'Override severity thresholds. Example: {"sys_flow_context": {"critical": 2000000, "elevated": 500000}}',
        additionalProperties: {
          type: 'object',
          properties: {
            critical: { type: 'number' },
            elevated: { type: 'number' }
          },
          required: ['critical', 'elevated']
        }
      }
    },
    required: []
  }
};
