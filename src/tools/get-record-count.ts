/**
 * Get Record Count Tool
 * Returns accurate record counts using the ServiceNow Aggregate API (/api/now/stats).
 * DO NOT use query_table with limit=1 for counting — the total field is unreliable.
 * This tool is the correct method per SOP 0 War Room Assessment methodology.
 */

import { z } from 'zod';
import { getClient } from '../servicenow/client.js';
import { handleError, formatSuccess } from '../utils/error-handler.js';
import { tableNameSchema, queryStringSchema } from '../utils/validation.js';

const getRecordCountSchema = z.object({
  table: tableNameSchema,
  query: queryStringSchema,
  group_by: z.string()
    .regex(/^[a-zA-Z0-9_]+$/, 'group_by must be a valid field name')
    .optional()
    .describe('Optional field name to group counts by (e.g. "state", "priority")')
});

export type GetRecordCountInput = z.infer<typeof getRecordCountSchema>;

export async function executeGetRecordCount(args: unknown) {
  try {
    const params = getRecordCountSchema.parse(args);
    const client = getClient();

    const result = await client.getAggregateCount(params.table, params.query, params.group_by);

    return formatSuccess({
      success: true,
      table: params.table,
      query: params.query ?? '(all records)',
      count: result.count,
      ...(result.grouped ? { group_by: params.group_by, breakdown: result.grouped } : {})
    });
  } catch (error) {
    return handleError(error, 'get_record_count');
  }
}

export const getRecordCountTool = {
  name: 'get_record_count',
  description: [
    'Returns an accurate record count for any ServiceNow table using the Aggregate API.',
    'IMPORTANT: This is the CORRECT counting method per SOP 0 War Room methodology.',
    'Do NOT use query_table with limit=1 — the "total" field from that API is unreliable and returns false counts.',
    'Supports optional encoded query filters and group-by breakdowns.',
    'Use this to assess database bloat (e.g. syslog, sys_audit, sys_flow_context record counts).'
  ].join(' '),
  inputSchema: {
    type: 'object',
    properties: {
      table: {
        type: 'string',
        description: 'ServiceNow table name (e.g. "syslog", "sys_audit", "sys_flow_context")'
      },
      query: {
        type: 'string',
        description: 'Optional encoded query to filter records (e.g. "sys_created_on>javascript:gs.daysAgoStart(7)"). Omit to count all records.'
      },
      group_by: {
        type: 'string',
        description: 'Optional field to group the count by (e.g. "level" for syslog, "state" for incidents). Returns per-group counts plus total.'
      }
    },
    required: ['table']
  }
};
