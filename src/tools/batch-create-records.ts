/**
 * Batch Create Records Tool
 * Create multiple records in a single operation (executed in parallel)
 */

import { z } from 'zod';
import { getClient } from '../servicenow/client.js';
import { handleError, formatSuccess } from '../utils/error-handler.js';
import { tableNameSchema, recordDataSchema } from '../utils/validation.js';

// Input schema for batch-create-records tool
const batchCreateRecordsSchema = z.object({
  table: tableNameSchema,
  records: z.array(recordDataSchema).min(1, 'At least one record is required').max(100, 'Maximum 100 records per batch')
});

export type BatchCreateRecordsInput = z.infer<typeof batchCreateRecordsSchema>;

/**
 * Execute batch-create-records tool
 */
export async function executeBatchCreateRecords(args: unknown) {
  try {
    // Validate inputs
    const params = batchCreateRecordsSchema.parse(args);

    // Get ServiceNow client
    const client = getClient();

    // Execute batch create
    const result = await client.batchCreate(params.table, params.records);

    // Format response
    return formatSuccess({
      success: result.success,
      table: params.table,
      total: params.records.length,
      created: result.results.length,
      failed: result.errors.length,
      results: result.results,
      errors: result.errors.length > 0 ? result.errors : undefined
    });
  } catch (error) {
    return handleError(error, 'batch_create_records');
  }
}

// Tool schema for MCP registration
export const batchCreateRecordsTool = {
  name: 'batch_create_records',
  description: 'Create multiple records in a ServiceNow table in a single batch operation. Records are created in parallel for better performance. Returns results for all records including any failures.',
  inputSchema: {
    type: 'object',
    properties: {
      table: {
        type: 'string',
        description: 'ServiceNow table name (e.g., "incident", "change_request")'
      },
      records: {
        type: 'array',
        description: 'Array of record data objects to create. Each object contains field key-value pairs. Maximum 100 records per batch.',
        items: {
          type: 'object',
          description: 'Record data as key-value pairs (e.g., {"short_description": "Issue description", "priority": "2"})'
        },
        minItems: 1,
        maxItems: 100
      }
    },
    required: ['table', 'records']
  }
};
