/**
 * Update Record Tool
 * Update an existing ServiceNow record by sys_id
 */

import { z } from 'zod';
import { getClient } from '../servicenow/client.js';
import { handleError, formatSuccess } from '../utils/error-handler.js';
import { tableNameSchema, sysIdSchema, recordDataSchema } from '../utils/validation.js';

// Input schema for update-record tool
const updateRecordSchema = z.object({
  table: tableNameSchema,
  sys_id: sysIdSchema,
  data: recordDataSchema
});

export type UpdateRecordInput = z.infer<typeof updateRecordSchema>;

/**
 * Execute update-record tool
 */
export async function executeUpdateRecord(args: unknown) {
  try {
    // Validate inputs
    const params = updateRecordSchema.parse(args);

    // Get ServiceNow client
    const client = getClient();

    // Update the record
    const response = await client.update(params.table, params.sys_id, params.data);

    // Format response
    return formatSuccess({
      success: true,
      table: params.table,
      sys_id: params.sys_id,
      record: response.result
    });
  } catch (error) {
    return handleError(error, 'update_record');
  }
}

// Tool schema for MCP registration
export const updateRecordTool = {
  name: 'update_record',
  description: 'Update an existing ServiceNow record by its sys_id. Only the fields specified in data will be modified.',
  inputSchema: {
    type: 'object',
    properties: {
      table: {
        type: 'string',
        description: 'ServiceNow table name (e.g., "incident", "sys_user")'
      },
      sys_id: {
        type: 'string',
        description: 'The sys_id of the record to update (32-character hexadecimal string)'
      },
      data: {
        type: 'object',
        description: 'Fields to update as key-value pairs (e.g., {"state": "6", "close_notes": "Resolved"})'
      }
    },
    required: ['table', 'sys_id', 'data']
  }
};
