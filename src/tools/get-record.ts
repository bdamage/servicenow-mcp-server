/**
 * Get Record Tool
 * Retrieve a single ServiceNow record by sys_id
 */

import { z } from 'zod';
import { getClient } from '../servicenow/client.js';
import { handleError, formatSuccess } from '../utils/error-handler.js';
import { tableNameSchema, sysIdSchema, fieldListSchema } from '../utils/validation.js';

// Input schema for get-record tool
const getRecordSchema = z.object({
  table: tableNameSchema,
  sys_id: sysIdSchema,
  fields: fieldListSchema
});

export type GetRecordInput = z.infer<typeof getRecordSchema>;

/**
 * Execute get-record tool
 */
export async function executeGetRecord(args: unknown) {
  try {
    // Validate inputs
    const params = getRecordSchema.parse(args);

    // Get ServiceNow client
    const client = getClient();

    // Build query parameters
    const queryParams: any = {};
    if (params.fields) {
      queryParams.sysparm_fields = params.fields;
    }

    // Get the record
    const response = await client.get(params.table, params.sys_id, queryParams);

    // Format response
    return formatSuccess({
      success: true,
      table: params.table,
      sys_id: params.sys_id,
      record: response.result
    });
  } catch (error) {
    return handleError(error, 'get_record');
  }
}

// Tool schema for MCP registration
export const getRecordTool = {
  name: 'get_record',
  description: 'Retrieve a single ServiceNow record by its sys_id. Returns the complete record with all requested fields.',
  inputSchema: {
    type: 'object',
    properties: {
      table: {
        type: 'string',
        description: 'ServiceNow table name (e.g., "incident", "sys_user")'
      },
      sys_id: {
        type: 'string',
        description: 'The sys_id of the record to retrieve (32-character hexadecimal string)'
      },
      fields: {
        type: 'string',
        description: 'Comma-separated list of fields to return. Optional. Returns all fields if not specified.'
      }
    },
    required: ['table', 'sys_id']
  }
};
