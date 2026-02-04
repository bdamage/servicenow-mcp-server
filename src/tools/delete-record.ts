/**
 * Delete Record Tool
 * Delete a ServiceNow record by sys_id
 * USE WITH CAUTION - This operation cannot be undone
 */

import { z } from 'zod';
import { getClient } from '../servicenow/client.js';
import { handleError, formatSuccess } from '../utils/error-handler.js';
import { tableNameSchema, sysIdSchema } from '../utils/validation.js';

// Input schema for delete-record tool
const deleteRecordSchema = z.object({
  table: tableNameSchema,
  sys_id: sysIdSchema
});

export type DeleteRecordInput = z.infer<typeof deleteRecordSchema>;

/**
 * Execute delete-record tool
 */
export async function executeDeleteRecord(args: unknown) {
  try {
    // Validate inputs
    const params = deleteRecordSchema.parse(args);

    // Get ServiceNow client
    const client = getClient();

    // Delete the record
    await client.delete(params.table, params.sys_id);

    // Format response
    return formatSuccess({
      success: true,
      table: params.table,
      sys_id: params.sys_id,
      message: 'Record deleted successfully'
    });
  } catch (error) {
    return handleError(error, 'delete_record');
  }
}

// Tool schema for MCP registration
export const deleteRecordTool = {
  name: 'delete_record',
  description: 'Delete a ServiceNow record by its sys_id. WARNING: This operation cannot be undone. Use with caution.',
  inputSchema: {
    type: 'object',
    properties: {
      table: {
        type: 'string',
        description: 'ServiceNow table name (e.g., "incident")'
      },
      sys_id: {
        type: 'string',
        description: 'The sys_id of the record to delete (32-character hexadecimal string)'
      }
    },
    required: ['table', 'sys_id']
  }
};
