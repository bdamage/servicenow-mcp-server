/**
 * Query Table Tool
 * Query any ServiceNow table with filters, pagination, and field selection
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

// Input schema for query-table tool
const queryTableSchema = z.object({
  table: tableNameSchema,
  query: queryStringSchema,
  fields: fieldListSchema,
  limit: limitSchema,
  offset: offsetSchema
});

export type QueryTableInput = z.infer<typeof queryTableSchema>;

/**
 * Execute query-table tool
 */
export async function executeQueryTable(args: unknown) {
  try {
    // Validate inputs
    const params = queryTableSchema.parse(args);

    // Get ServiceNow client
    const client = getClient();

    // Build query parameters
    const queryParams: any = {
      sysparm_limit: params.limit,
      sysparm_offset: params.offset
    };

    if (params.query) {
      queryParams.sysparm_query = params.query;
    }

    if (params.fields) {
      queryParams.sysparm_fields = params.fields;
    }

    // Execute query
    const response = await client.query(params.table, queryParams);

    // Format response
    return formatSuccess({
      success: true,
      table: params.table,
      count: response.result.length,
      records: response.result
    });
  } catch (error) {
    return handleError(error, 'query_table');
  }
}

// Tool schema for MCP registration
export const queryTableTool = {
  name: 'query_table',
  description: 'Query any ServiceNow table with filters, pagination, and field selection. Returns matching records from the specified table.',
  inputSchema: {
    type: 'object',
    properties: {
      table: {
        type: 'string',
        description: 'ServiceNow table name (e.g., "incident", "sys_user", "change_request")'
      },
      query: {
        type: 'string',
        description: 'Encoded query string (e.g., "active=true^priority=1"). Optional. Uses ServiceNow query syntax.'
      },
      fields: {
        type: 'string',
        description: 'Comma-separated list of fields to return (e.g., "number,short_description,priority"). Optional. Returns all fields if not specified.'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of records to return (1-1000). Default: 100',
        default: 100
      },
      offset: {
        type: 'number',
        description: 'Number of records to skip for pagination. Default: 0',
        default: 0
      }
    },
    required: ['table']
  }
};
