/**
 * Create Scheduled Job Tool
 * Creates a scheduled script execution (sysauto_script) on the ServiceNow instance.
 * SOP 0 Priority 4: Create 7-day syslog retention policy and other maintenance jobs.
 *
 * Safety: enforces minimum 60-second interval for periodically-run jobs.
 */

import { z } from 'zod';
import { getClient } from '../servicenow/client.js';
import { handleError, formatSuccess } from '../utils/error-handler.js';

const runTypeEnum = z.enum(['daily', 'weekly', 'monthly', 'periodically', 'on_demand']);

const createScheduledJobSchema = z.object({
  name: z.string().min(1).max(200)
    .describe('Descriptive name for the scheduled job'),
  script: z.string().min(1)
    .describe('Server-side JavaScript to execute'),
  run_type: runTypeEnum
    .describe('Execution schedule type: "daily", "weekly", "monthly", "periodically", "on_demand"'),
  run_period_seconds: z.number().int().min(60).max(86400 * 365).optional()
    .describe('Required when run_type="periodically". Interval in seconds. Minimum 60 (1 minute) — enforced as a safety guard against toxic job creation.'),
  run_time: z.string().regex(/^\d{2}:\d{2}:\d{2}$/).optional()
    .describe('For daily/weekly/monthly: time of day to run in HH:MM:SS format (e.g. "02:00:00" for 2am).'),
  run_dayofweek: z.enum(['1','2','3','4','5','6','7']).optional()
    .describe('For weekly: day of week (1=Sunday, 2=Monday, ... 7=Saturday).'),
  active: z.boolean().default(true)
    .describe('Whether the job starts active. Default: true.'),
  description: z.string().max(1000).optional()
    .describe('Optional description for documentation purposes')
});

export type CreateScheduledJobInput = z.infer<typeof createScheduledJobSchema>;

/**
 * Convert seconds to ServiceNow interval string format "D HH:MM:SS"
 */
function secondsToInterval(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / 86400);
  const remaining = totalSeconds % 86400;
  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;
  return `${days} ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export async function executeCreateScheduledJob(args: unknown) {
  try {
    const params = createScheduledJobSchema.parse(args);

    // Validate periodically requires run_period_seconds
    if (params.run_type === 'periodically' && !params.run_period_seconds) {
      return handleError(
        new Error('run_period_seconds is required when run_type is "periodically"'),
        'create_scheduled_job'
      );
    }

    const client = getClient();

    const record: Record<string, any> = {
      name: params.name,
      script: params.script,
      run_type: params.run_type,
      active: params.active
    };

    if (params.description) record.description = params.description;

    if (params.run_type === 'periodically' && params.run_period_seconds) {
      record.run_period = secondsToInterval(params.run_period_seconds);
    }

    if (params.run_time) record.run_time = params.run_time;
    if (params.run_dayofweek) record.run_dayofweek = params.run_dayofweek;

    const response = await client.create('sysauto_script', record);
    const created = response.result as any;

    const humanInterval = params.run_period_seconds
      ? (() => {
          const s = params.run_period_seconds;
          if (s < 60) return `${s}s`;
          if (s < 3600) return `${Math.floor(s / 60)}m`;
          if (s < 86400) return `${Math.floor(s / 3600)}h`;
          return `${Math.floor(s / 86400)}d`;
        })()
      : null;

    return formatSuccess({
      success: true,
      sys_id: created.sys_id,
      name: params.name,
      run_type: params.run_type,
      run_period_seconds: params.run_period_seconds ?? null,
      run_period_human: humanInterval,
      active: params.active,
      note: params.active
        ? 'Job created and active. It will execute on its next scheduled trigger.'
        : 'Job created but inactive. Use toggle_scheduled_job to activate when ready.'
    });
  } catch (error) {
    return handleError(error, 'create_scheduled_job');
  }
}

export const createScheduledJobTool = {
  name: 'create_scheduled_job',
  description: [
    'Creates a new scheduled script execution (sysauto_script) on the ServiceNow instance.',
    'SOP 0 Priority 4: Use to create 7-day syslog retention policies, monitoring alerts, and cleanup jobs.',
    'Safety guard: enforces minimum 60-second interval for periodically-run jobs to prevent toxic job creation.',
    'Supports all ServiceNow schedule types: daily, weekly, monthly, periodically, on_demand.',
    'Returns sys_id of created job for use with toggle_scheduled_job if needed.'
  ].join(' '),
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Descriptive name for the job (e.g. "SOP0 - 7-Day Syslog Retention Policy")'
      },
      script: {
        type: 'string',
        description: 'Server-side JavaScript to execute. For syslog retention: use GlideRecord with addEncodedQuery to delete old records.'
      },
      run_type: {
        type: 'string',
        enum: ['daily', 'weekly', 'monthly', 'periodically', 'on_demand'],
        description: 'Schedule type. Use "daily" for retention policies, "periodically" for frequent checks.'
      },
      run_period_seconds: {
        type: 'number',
        description: 'Required for run_type="periodically". Interval in seconds. Minimum 60 (enforced). Example: 3600 = hourly, 86400 = daily.'
      },
      run_time: {
        type: 'string',
        description: 'For daily/weekly/monthly: time of day as HH:MM:SS (e.g. "02:00:00" for 2am maintenance window).'
      },
      run_dayofweek: {
        type: 'string',
        enum: ['1','2','3','4','5','6','7'],
        description: 'For weekly jobs: 1=Sunday, 2=Monday, 3=Tuesday, 4=Wednesday, 5=Thursday, 6=Friday, 7=Saturday.'
      },
      active: {
        type: 'boolean',
        description: 'Start the job active (true) or inactive (false). Default: true.',
        default: true
      },
      description: {
        type: 'string',
        description: 'Optional description for documentation (e.g. "Created by SOP 0 War Room remediation 2026-02-18").'
      }
    },
    required: ['name', 'script', 'run_type']
  }
};
