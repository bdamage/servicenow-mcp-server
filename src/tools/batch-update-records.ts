/**
 * Batch Update Records Tool
 * Update multiple records in a single operation (executed in parallel)
 */

import { z } from 'zod';
import { getClient } from '../servicenow/client.js';
import { handleError, formatSuccess } from '../utils/error-handler.js';
import { tableNameSchema, sysIdSchema, recordDataSchema } from '../utils/validation.js';

// Schema for a single update operation
const updateOperationSchema = z.object({
  sys_id: sysIdSchema,
  data: recordDataSchema
});

// Input schema for batch-update-records tool
const batchUpdateRecordsSchema = z.object({
  table: tableNameSchema,
  updates: z.array(updateOperationSchema).min(1, 'At least one update is required').max(100, 'Maximum 100 updates per batch')
});

export type BatchUpdateRecordsInput = z.infer<typeof batchUpdateRecordsSchema>;

/**
 * Execute batch-update-records tool
 */
export async function executeBatchUpdateRecords(args: unknown) {
  try {
    // Validate inputs
    const params = batchUpdateRecordsSchema.parse(args);

    // Get ServiceNow client
    const client = getClient();

    // Execute batch update
    const result = await client.batchUpdate(params.table, params.updates);

    // Format response
    return formatSuccess({
      success: result.success,
      table: params.table,
      total: params.updates.length,
      updated: result.results.length,
      failed: result.errors.length,
      results: result.results,
      errors: result.errors.length > 0 ? result.errors : undefined
    });
  } catch (error) {
    return handleError(error, 'batch_update_records');
  }
}

// Tool schema for MCP registration
export const batchUpdateRecordsTool = {
  name: 'batch_update_records',
  description: 'Update multiple records in a ServiceNow table in a single batch operation. Records are updated in parallel for better performance. Returns results for all records including any failures.',
  inputSchema: {
    type: 'object',
    properties: {
      table: {
        type: 'string',
        description: 'ServiceNow table name (e.g., "incident", "sys_user")'
      },
      updates: {
        type: 'array',
        description: 'Array of update operations. Each operation specifies a sys_id and the data to update. Maximum 100 updates per batch.',
        items: {
          type: 'object',
          properties: {
            sys_id: {
              type: 'string',
              description: 'The sys_id of the record to update (32-character hexadecimal string)'
            },
            data: {
              type: 'object',
              description: 'Fields to update as key-value pairs (e.g., {"state": "6", "close_notes": "Resolved"})'
            }
          },
          required: ['sys_id', 'data']
        },
        minItems: 1,
        maxItems: 100
      }
    },
    required: ['table', 'updates']
  }
};
