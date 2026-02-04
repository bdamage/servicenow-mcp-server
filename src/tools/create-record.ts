/**
 * Create Record Tool
 * Create a new record in any ServiceNow table
 */

import { z } from 'zod';
import { getClient } from '../servicenow/client.js';
import { handleError, formatSuccess } from '../utils/error-handler.js';
import { tableNameSchema, recordDataSchema } from '../utils/validation.js';

// Input schema for create-record tool
const createRecordSchema = z.object({
  table: tableNameSchema,
  data: recordDataSchema
});

export type CreateRecordInput = z.infer<typeof createRecordSchema>;

/**
 * Execute create-record tool
 */
export async function executeCreateRecord(args: unknown) {
  try {
    // Validate inputs
    const params = createRecordSchema.parse(args);

    // Get ServiceNow client
    const client = getClient();

    // Create the record
    const response = await client.create(params.table, params.data);

    // Format response
    return formatSuccess({
      success: true,
      table: params.table,
      sys_id: response.result.sys_id,
      record: response.result
    });
  } catch (error) {
    return handleError(error, 'create_record');
  }
}

// Tool schema for MCP registration
export const createRecordTool = {
  name: 'create_record',
  description: 'Create a new record in any ServiceNow table. Returns the created record including its sys_id.',
  inputSchema: {
    type: 'object',
    properties: {
      table: {
        type: 'string',
        description: 'ServiceNow table name (e.g., "incident", "change_request")'
      },
      data: {
        type: 'object',
        description: 'Record data as key-value pairs (e.g., {"short_description": "Server down", "priority": "1"})'
      }
    },
    required: ['table', 'data']
  }
};
