/**
 * Query Scheduled Jobs Tool
 * Audits scheduled script executions for toxic frequency patterns.
 * Core tool for SOP 0 Section 3: Toxic Scheduled Jobs Audit.
 * Classifies jobs by threat level: EXTREME (<10s), CRITICAL (<30s), HIGH (<60s).
 */

import { z } from 'zod';
import { getClient } from '../servicenow/client.js';
import { handleError, formatSuccess } from '../utils/error-handler.js';

const queryScheduledJobsSchema = z.object({
  max_frequency_seconds: z.number().int().min(1).max(86400).default(3600)
    .describe('Return only jobs running at this interval or faster (in seconds). Default 3600 = 1 hour.'),
  include_inactive: z.boolean().default(false)
    .describe('Include disabled/inactive jobs in results. Default: false (active only).'),
  name_filter: z.string().optional()
    .describe('Optional substring to filter job names (case-insensitive LIKE match).')
});

export type QueryScheduledJobsInput = z.infer<typeof queryScheduledJobsSchema>;

/**
 * Parse ServiceNow interval string into total seconds.
 * ServiceNow stores run_period as "days HH:MM:SS" e.g. "0 00:00:10" = 10 seconds.
 */
function parseIntervalToSeconds(interval: string | null | undefined): number | null {
  if (!interval) return null;
  const str = interval.trim();
  if (!str) return null;

  let days = 0;
  let timePart = str;
  const spaceParts = str.split(' ');
  if (spaceParts.length === 2) {
    days = parseInt(spaceParts[0], 10) || 0;
    timePart = spaceParts[1];
  }

  const colonParts = timePart.split(':');
  if (colonParts.length !== 3) return null;

  const hours = parseInt(colonParts[0], 10) || 0;
  const minutes = parseInt(colonParts[1], 10) || 0;
  const seconds = parseInt(colonParts[2], 10) || 0;

  return (days * 86400) + (hours * 3600) + (minutes * 60) + seconds;
}

function classifyThreatLevel(seconds: number): string {
  if (seconds < 10) return 'EXTREME';
  if (seconds < 30) return 'CRITICAL';
  if (seconds < 60) return 'HIGH';
  if (seconds < 300) return 'MODERATE';
  return 'LOW';
}

/**
 * Known toxic job patterns from SOP fleet experience.
 * Each entry: pattern to match against job name (case-insensitive), and context.
 */
const KNOWN_TOXIC_PATTERNS: Array<{ pattern: RegExp; label: string; context: string }> = [
  { pattern: /virtual\s*agent.*adapter/i,          label: 'Virtual Agent Adapter Update',         context: 'Known to run at <10s intervals on demo instances. Generates massive syslog volume.' },
  { pattern: /metric\s*binding/i,                   label: 'Event Management Metric Binding',      context: 'Event Management metric collector. Often runs at <10s. Major syslog contributor.' },
  { pattern: /geocod/i,                             label: 'Geocoding Request',                    context: 'Geocoding API calls on demo instances with bad data. Creates continuous error loop.' },
  { pattern: /service\s*conversion.*progress/i,     label: 'Service Conversion Progress Refresher', context: 'Refreshes migration progress at high frequency. Safe to disable on non-migrating instances.' },
  { pattern: /ev_mgmt.*collect/i,                   label: 'Event Management Collector',           context: 'Event collection job. Can be aggressive on instances with Event Management enabled.' },
  { pattern: /discovery.*schedule/i,                label: 'Discovery Schedule',                   context: 'Discovery scan schedule. Review scope before disabling — may affect CMDB accuracy.' },
  { pattern: /pa.*collect/i,                        label: 'Performance Analytics Collector',      context: 'PA data collection. High frequency can impact DB. Review collection scope.' },
  { pattern: /mid.*server.*heartbeat/i,             label: 'MID Server Heartbeat',                 context: 'MID server health check. Typically safe but can be noisy at low intervals.' }
];

function matchKnownToxicPattern(jobName: string): { label: string; context: string } | null {
  for (const entry of KNOWN_TOXIC_PATTERNS) {
    if (entry.pattern.test(jobName)) {
      return { label: entry.label, context: entry.context };
    }
  }
  return null;
}

function formatInterval(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

export async function executeQueryScheduledJobs(args: unknown) {
  try {
    const params = queryScheduledJobsSchema.parse(args);
    const client = getClient();

    // Build query: periodically-run jobs within threshold, optionally active only
    const conditions: string[] = ['run_type=periodically'];
    if (!params.include_inactive) conditions.push('active=true');
    if (params.name_filter) conditions.push(`nameLIKE${params.name_filter}`);

    const response = await client.query('sysauto_script', {
      sysparm_query: conditions.join('^'),
      sysparm_fields: 'sys_id,name,active,run_type,run_period,run_start,sys_package,description',
      sysparm_limit: 500
    });

    const allJobs = response.result;

    // Parse intervals, match known toxic patterns, and filter by threshold
    const analyzedJobs = allJobs
      .map((job: any) => {
        const intervalSeconds = parseIntervalToSeconds(job.run_period);
        const toxicMatch = matchKnownToxicPattern(job.name ?? '');
        return {
          sys_id: job.sys_id,
          name: job.name,
          active: job.active === 'true' || job.active === true,
          run_period_raw: job.run_period,
          interval_seconds: intervalSeconds,
          interval_human: intervalSeconds !== null ? formatInterval(intervalSeconds) : 'unknown',
          application: job.sys_package?.display_value ?? job.sys_package ?? 'Unknown',
          description: job.description ?? '',
          threat_level: intervalSeconds !== null ? classifyThreatLevel(intervalSeconds) : 'UNKNOWN',
          known_toxic_match: toxicMatch
        };
      })
      .filter((job: any) =>
        job.interval_seconds !== null && job.interval_seconds <= params.max_frequency_seconds
      )
      .sort((a: any, b: any) => (a.interval_seconds ?? 999999) - (b.interval_seconds ?? 999999));

    // Summary by threat level
    const summary = {
      EXTREME: analyzedJobs.filter((j: any) => j.threat_level === 'EXTREME').length,
      CRITICAL: analyzedJobs.filter((j: any) => j.threat_level === 'CRITICAL').length,
      HIGH: analyzedJobs.filter((j: any) => j.threat_level === 'HIGH').length,
      MODERATE: analyzedJobs.filter((j: any) => j.threat_level === 'MODERATE').length,
      LOW: analyzedJobs.filter((j: any) => j.threat_level === 'LOW').length,
      total: analyzedJobs.length
    };

    const hasEmergencyJobs = summary.EXTREME > 0 || summary.CRITICAL > 0;
    const classification = hasEmergencyJobs
      ? 'EMERGENCY — toxic jobs detected. Immediate disable required (SOP 0 Priority 0).'
      : summary.HIGH > 0
        ? 'ELEVATED — high-frequency jobs present. Review recommended.'
        : 'CLEAN — no toxic job patterns detected.';

    // Collect jobs matching known toxic patterns
    const knownToxicMatches = analyzedJobs
      .filter((j: any) => j.known_toxic_match !== null)
      .map((j: any) => ({
        sys_id: j.sys_id,
        name: j.name,
        interval: j.interval_human,
        threat_level: j.threat_level,
        matched_pattern: j.known_toxic_match.label,
        context: j.known_toxic_match.context
      }));

    return formatSuccess({
      success: true,
      filter: {
        max_frequency_seconds: params.max_frequency_seconds,
        include_inactive: params.include_inactive,
        name_filter: params.name_filter ?? null
      },
      assessment: classification,
      summary,
      known_toxic_matches: knownToxicMatches.length > 0 ? knownToxicMatches : [],
      known_toxic_match_count: knownToxicMatches.length,
      jobs: analyzedJobs,
      remediation_targets: analyzedJobs
        .filter((j: any) => ['EXTREME', 'CRITICAL'].includes(j.threat_level))
        .map((j: any) => ({
          sys_id: j.sys_id,
          name: j.name,
          interval: j.interval_human,
          threat_level: j.threat_level,
          known_pattern: j.known_toxic_match?.label ?? null,
          action: 'DISABLE IMMEDIATELY — use toggle_scheduled_job'
        }))
    });
  } catch (error) {
    return handleError(error, 'query_scheduled_jobs');
  }
}

export const queryScheduledJobsTool = {
  name: 'query_scheduled_jobs',
  description: [
    'Audits scheduled script executions (sysauto_script) for toxic frequency patterns.',
    'Classifies each job by threat level: EXTREME (<10s), CRITICAL (<30s), HIGH (<60s), MODERATE (<300s).',
    'Identifies known toxic patterns: Virtual Agent adapter updates, Event Management metric binding,',
    'geocoding requests, and other high-frequency jobs that cause syslog bloat and CPU spikes.',
    'Returns a prioritized list of remediation targets with sys_ids ready for toggle_scheduled_job.',
    'SOP 0 Section 3: Run this as part of every War Room Assessment.'
  ].join(' '),
  inputSchema: {
    type: 'object',
    properties: {
      max_frequency_seconds: {
        type: 'number',
        description: 'Return only jobs running at this interval or faster. Default: 3600 (1 hour). Use 60 to find only toxic jobs per SOP threshold.',
        default: 3600
      },
      include_inactive: {
        type: 'boolean',
        description: 'Include disabled/inactive jobs. Default: false (active jobs only).',
        default: false
      },
      name_filter: {
        type: 'string',
        description: 'Optional substring to filter job names (e.g. "Virtual Agent", "metric binding").'
      }
    },
    required: []
  }
};
