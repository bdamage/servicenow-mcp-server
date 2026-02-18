/**
 * Toggle Scheduled Job Tool
 * Enable or disable a scheduled script execution by sys_id.
 * SOP 0 Priority 0: "Stop the Bleeding" — disabling toxic jobs halts syslog growth.
 */

import { z } from 'zod';
import { getClient } from '../servicenow/client.js';
import { handleError, formatSuccess } from '../utils/error-handler.js';
import { sysIdSchema } from '../utils/validation.js';

const toggleScheduledJobSchema = z.object({
  sys_id: sysIdSchema.describe('sys_id of the scheduled job (sysauto_script record)'),
  active: z.boolean().describe('true to enable the job, false to disable it'),
  reason: z.string().max(500).optional()
    .describe('Optional reason for the change, recorded in the response for audit purposes')
});

export type ToggleScheduledJobInput = z.infer<typeof toggleScheduledJobSchema>;

export async function executeToggleScheduledJob(args: unknown) {
  try {
    const params = toggleScheduledJobSchema.parse(args);
    const client = getClient();

    // Fetch current state first for audit trail
    const current = await client.get('sysauto_script', params.sys_id, {
      sysparm_fields: 'sys_id,name,active,run_period,run_type,sys_package'
    });

    const currentRecord = current.result as any;
    const wasActive = currentRecord.active === 'true' || currentRecord.active === true;

    if (wasActive === params.active) {
      return formatSuccess({
        success: true,
        changed: false,
        message: `Job "${currentRecord.name}" is already ${params.active ? 'enabled' : 'disabled'}. No change made.`,
        job: {
          sys_id: params.sys_id,
          name: currentRecord.name,
          active: wasActive,
          run_period: currentRecord.run_period
        }
      });
    }

    // Apply the change
    const updated = await client.update('sysauto_script', params.sys_id, {
      active: params.active
    });

    const updatedRecord = updated.result as any;

    return formatSuccess({
      success: true,
      changed: true,
      action: params.active ? 'ENABLED' : 'DISABLED',
      reason: params.reason ?? null,
      job: {
        sys_id: params.sys_id,
        name: updatedRecord.name ?? currentRecord.name,
        active_before: wasActive,
        active_after: params.active,
        run_period: currentRecord.run_period,
        application: currentRecord.sys_package?.display_value ?? currentRecord.sys_package ?? 'Unknown'
      },
      note: !params.active
        ? 'Job disabled. Syslog growth from this job should stop within the next polling cycle.'
        : 'Job enabled. Monitor syslog growth rate to confirm expected frequency.'
    });
  } catch (error) {
    return handleError(error, 'toggle_scheduled_job');
  }
}

export const toggleScheduledJobTool = {
  name: 'toggle_scheduled_job',
  description: [
    'Enable or disable a scheduled script execution (sysauto_script) by sys_id.',
    'SOP 0 Priority 0 action: disabling EXTREME/CRITICAL threat jobs stops syslog growth immediately.',
    'Per SOP approval matrix: no approval required to disable jobs running <30 seconds.',
    'Fetches current state before changing, returns before/after audit trail.',
    'Use query_scheduled_jobs first to identify sys_ids of toxic jobs.'
  ].join(' '),
  inputSchema: {
    type: 'object',
    properties: {
      sys_id: {
        type: 'string',
        description: '32-character sys_id of the scheduled job (sysauto_script record)'
      },
      active: {
        type: 'boolean',
        description: 'true to enable the job, false to disable it'
      },
      reason: {
        type: 'string',
        description: 'Optional reason for the change (e.g. "SOP 0 War Room — EXTREME threat, <10s interval"). Included in response for audit trail.'
      }
    },
    required: ['sys_id', 'active']
  }
};
