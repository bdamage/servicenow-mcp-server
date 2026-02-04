/**
 * Batch Query Tables Tool
 * Query multiple tables in a single operation (executed in parallel)
 */

import { z } from 'zod';
import { getClient } from '../servicenow/client.js';
import { handleError, formatSuccess } from '../utils/error-handler.js';
import {
  tableNameSchema,
  queryStringSchema,
  fieldListSchema,
  limitSchema,
  offsetSchema
} from '../utils/validation.js';

// Schema for a single query operation
const queryOperationSchema = z.object({
  table: tableNameSchema,
  query: queryStringSchema,
  fields: fieldListSchema,
  limit: limitSchema,
  offset: offsetSchema
});

// Input schema for batch-query-tables tool
const batchQueryTablesSchema = z.object({
  queries: z.array(queryOperationSchema).min(1, 'At least one query is required').max(20, 'Maximum 20 queries per batch')
});

export type BatchQueryTablesInput = z.infer<typeof batchQueryTablesSchema>;

/**
 * Execute batch-query-tables tool
 */
export async function executeBatchQueryTables(args: unknown) {
  try {
    // Validate inputs
    const params = batchQueryTablesSchema.parse(args);

    // Get ServiceNow client
    const client = getClient();

    // Build query parameters for each query
    const queryRequests = params.queries.map(q => {
      const queryParams: any = {
        sysparm_limit: q.limit,
        sysparm_offset: q.offset
      };

      if (q.query) {
        queryParams.sysparm_query = q.query;
      }

      if (q.fields) {
        queryParams.sysparm_fields = q.fields;
      }

      return {
        table: q.table,
        params: queryParams
      };
    });

    // Execute batch query
    const result = await client.batchQuery(queryRequests);

    // Format response
    return formatSuccess({
      success: result.success,
      total: params.queries.length,
      succeeded: result.results.length,
      failed: result.errors.length,
      results: result.results,
      errors: result.errors.length > 0 ? result.errors : undefined
    });
  } catch (error) {
    return handleError(error, 'batch_query_tables');
  }
}

// Tool schema for MCP registration
export const batchQueryTablesTool = {
  name: 'batch_query_tables',
  description: 'Query multiple ServiceNow tables in a single batch operation. Queries are executed in parallel for better performance. Useful for gathering related data from different tables simultaneously.',
  inputSchema: {
    type: 'object',
    properties: {
      queries: {
        type: 'array',
        description: 'Array of query operations. Each operation specifies a table and query parameters. Maximum 20 queries per batch.',
        items: {
          type: 'object',
          properties: {
            table: {
              type: 'string',
              description: 'ServiceNow table name (e.g., "incident", "sys_user")'
            },
            query: {
              type: 'string',
              description: 'Encoded query string (optional)'
            },
            fields: {
              type: 'string',
              description: 'Comma-separated field list (optional)'
            },
            limit: {
              type: 'number',
              description: 'Max records (default: 100)',
              default: 100
            },
            offset: {
              type: 'number',
              description: 'Pagination offset (default: 0)',
              default: 0
            }
          },
          required: ['table']
        },
        minItems: 1,
        maxItems: 20
      }
    },
    required: ['queries']
  }
};
