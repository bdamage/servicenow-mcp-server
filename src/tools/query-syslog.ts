/**
 * Query Syslog Tool
 * Queries syslog across the main table AND all rotation tables (syslog0000–syslog000N).
 * SOP 0 Section 4: Error Pattern Analysis + Section 2: Database Health Assessment.
 *
 * Handles the rotation table complexity automatically — no need to manually query each table.
 */

import { z } from 'zod';
import { getClient } from '../servicenow/client.js';
import { handleError, formatSuccess } from '../utils/error-handler.js';

// ServiceNow syslog level constants
const LEVEL_NAMES: Record<number, string> = {
  0: 'CRITICAL',
  1: 'ERROR',
  2: 'WARNING',
  3: 'INFO',
  4: 'DEBUG'
};

const querySyslogSchema = z.object({
  since_minutes: z.number().int().min(1).max(44640).default(60)
    .describe('Look back this many minutes. Default: 60 (last hour). Max: 44640 (31 days).'),
  levels: z.array(z.number().int().min(0).max(7)).optional()
    .describe('Filter by syslog level numbers. 0=CRITICAL, 1=ERROR, 2=WARNING, 3=INFO, 4=DEBUG. Omit for all levels.'),
  message_contains: z.string().optional()
    .describe('Filter entries where message contains this string (case-insensitive LIKE).'),
  source_filter: z.string().optional()
    .describe('Filter by log source field (e.g. "DefaultSystem", "GlideRecord").'),
  include_rotation_tables: z.boolean().default(true)
    .describe('Query rotation tables (syslog0000, syslog0001, etc.) in addition to main syslog. Default: true.'),
  limit_per_table: z.number().int().min(1).max(10000).default(200)
    .describe('Max records to fetch per table. Default: 200. Increase for deeper analysis.'),
  count_only: z.boolean().default(false)
    .describe('If true, return only record counts per table (fast, accurate). If false, return actual log entries.')
});

export type QuerySyslogInput = z.infer<typeof querySyslogSchema>;

export async function executeQuerySyslog(args: unknown) {
  try {
    const params = querySyslogSchema.parse(args);
    const client = getClient();

    // Build the encoded query
    const conditions: string[] = [
      `sys_created_on>javascript:gs.minutesAgoStart(${params.since_minutes})`
    ];

    if (params.levels && params.levels.length > 0) {
      const levelConditions = params.levels.map(l => `level=${l}`).join('^OR');
      conditions.push(`(${levelConditions})`);
    }

    if (params.message_contains) {
      conditions.push(`messageLIKE${params.message_contains}`);
    }

    if (params.source_filter) {
      conditions.push(`sourceLIKE${params.source_filter}`);
    }

    const query = conditions.join('^');

    // Discover which tables to query
    const tablesToQuery: string[] = ['syslog'];

    if (params.include_rotation_tables) {
      try {
        const dbObjResponse = await client.query('sys_db_object', {
          sysparm_query: 'nameSTARTSWITHsyslog^nameNOT LIKEsyslog_^ORDERBYname',
          sysparm_fields: 'name',
          sysparm_limit: 50
        });

        const rotationPattern = /^syslog\d{4}$/;
        for (const record of dbObjResponse.result) {
          const name = (record as any).name;
          if (name && name !== 'syslog' && rotationPattern.test(name)) {
            tablesToQuery.push(name);
          }
        }
      } catch {
        // Rotation table discovery failed — continue with main table only
      }
    }

    if (params.count_only) {
      // Fast count mode: use aggregate API per table in parallel
      const countPromises = tablesToQuery.map(async (table) => {
        try {
          const result = await client.getAggregateCount(table, query);
          return { table, count: result.count, error: null };
        } catch (e: any) {
          return { table, count: 0, error: e?.message ?? 'Query failed' };
        }
      });

      const counts = await Promise.all(countPromises);
      const totalCount = counts.reduce((sum, r) => sum + r.count, 0);

      const severity = totalCount > 20000000
        ? '🔴 CRITICAL — Immediate intervention required (>20M records)'
        : totalCount > 5000000
          ? '🟡 ELEVATED — Monitor closely (>5M records)'
          : '🟢 HEALTHY — Within normal limits';

      return formatSuccess({
        success: true,
        mode: 'count_only',
        since_minutes: params.since_minutes,
        tables_queried: tablesToQuery,
        total_records: totalCount,
        severity,
        per_table: counts,
        note: 'Sum per_table counts for true total. For full log entries, set count_only=false.'
      });
    }

    // Full entry mode: query all tables in parallel
    const queryPromises = tablesToQuery.map(async (table) => {
      try {
        const response = await client.query(table, {
          sysparm_query: query,
          sysparm_fields: 'sys_id,level,source,message,sys_created_on,messageid',
          sysparm_limit: params.limit_per_table,
          sysparm_orderby: 'sys_created_on',
          sysparm_order_direction: 'desc'
        });
        return {
          table,
          count: response.result.length,
          records: response.result,
          error: null
        };
      } catch (e: any) {
        return { table, count: 0, records: [], error: e?.message ?? 'Query failed' };
      }
    });

    const tableResults = await Promise.all(queryPromises);

    // Aggregate and sort by timestamp (most recent first)
    const allRecords: any[] = [];
    for (const result of tableResults) {
      for (const r of result.records) {
        allRecords.push({
          ...r,
          _table: result.table,
          level_name: LEVEL_NAMES[parseInt(r.level, 10)] ?? `LEVEL_${r.level}`
        });
      }
    }
    allRecords.sort((a, b) =>
      new Date(b.sys_created_on).getTime() - new Date(a.sys_created_on).getTime()
    );

    // Error pattern analysis
    const patternCounts: Record<string, number> = {};
    for (const r of allRecords) {
      if (r.message) {
        const key = r.message.substring(0, 80).replace(/\s+/g, ' ').trim();
        patternCounts[key] = (patternCounts[key] ?? 0) + 1;
      }
    }
    const topPatterns = Object.entries(patternCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([message, count]) => ({ count, message }));

    const levelSummary: Record<string, number> = {};
    for (const r of allRecords) {
      const levelName = r.level_name;
      levelSummary[levelName] = (levelSummary[levelName] ?? 0) + 1;
    }

    return formatSuccess({
      success: true,
      mode: 'entries',
      since_minutes: params.since_minutes,
      tables_queried: tablesToQuery,
      total_entries_returned: allRecords.length,
      level_summary: levelSummary,
      top_error_patterns: topPatterns,
      records: allRecords,
      note: `Showing up to ${params.limit_per_table} records per table, sorted newest first. ` +
        'For accurate total counts, use count_only=true.'
    });
  } catch (error) {
    return handleError(error, 'query_syslog');
  }
}

export const querySyslogTool = {
  name: 'query_syslog',
  description: [
    'Queries syslog entries across the main syslog table AND all rotation tables (syslog0000, syslog0001, etc.).',
    'Handles rotation table discovery automatically.',
    'SOP 0 dual purpose: (1) count_only=true for Section 2 DB health assessment with accurate per-table counts,',
    '(2) count_only=false for Section 4 error pattern analysis (fetches entries + summarizes top patterns).',
    'Filters by time range, log level (0=CRITICAL, 1=ERROR, 2=WARNING), message content, and source.',
    'Returns level breakdown and top recurring error patterns for report generation.'
  ].join(' '),
  inputSchema: {
    type: 'object',
    properties: {
      since_minutes: {
        type: 'number',
        description: 'How far back to look in minutes. Default: 60 (last hour). Use 1440 for last 24h.',
        default: 60
      },
      levels: {
        type: 'array',
        items: { type: 'number' },
        description: 'Log level filter: 0=CRITICAL, 1=ERROR, 2=WARNING, 3=INFO, 4=DEBUG. Omit for all levels. Example: [0,1] for critical+error only.'
      },
      message_contains: {
        type: 'string',
        description: 'Filter entries where message contains this text (LIKE match).'
      },
      source_filter: {
        type: 'string',
        description: 'Filter by log source field.'
      },
      include_rotation_tables: {
        type: 'boolean',
        description: 'Auto-discover and query rotation tables. Default: true. Set false to query only main syslog table.',
        default: true
      },
      limit_per_table: {
        type: 'number',
        description: 'Max entries to return per table (1–10000). Default: 200. Only applies when count_only=false.',
        default: 200
      },
      count_only: {
        type: 'boolean',
        description: 'true = fast accurate counts per table (for DB health assessment). false = return actual log entries with pattern analysis.',
        default: false
      }
    },
    required: []
  }
};
