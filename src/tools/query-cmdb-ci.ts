/**
 * Query CMDB CI Tool
 * Advanced query for Configuration Items with filtering by class, environment, status
 */

import { z } from 'zod';
import { getClient } from '../servicenow/client.js';
import { handleError, formatSuccess } from '../utils/error-handler.js';
import { queryStringSchema, fieldListSchema, limitSchema, offsetSchema } from '../utils/validation.js';

// Input schema for query-cmdb-ci tool
const queryCmdbCiSchema = z.object({
  ci_class: z.string().optional(),
  name_contains: z.string().optional(),
  operational_status: z.string().optional(),
  environment: z.string().optional(),
  support_group: z.string().optional(),
  custom_query: queryStringSchema,
  fields: fieldListSchema,
  limit: limitSchema,
  offset: offsetSchema
});

export type QueryCmdbCiInput = z.infer<typeof queryCmdbCiSchema>;

/**
 * Execute query-cmdb-ci tool
 */
export async function executeQueryCmdbCi(args: unknown) {
  try {
    // Validate inputs
    const params = queryCmdbCiSchema.parse(args);

    // Get ServiceNow client
    const client = getClient();

    // Build query
    const queryParts: string[] = [];

    if (params.ci_class) {
      queryParts.push(`sys_class_name=${params.ci_class}`);
    }

    if (params.name_contains) {
      queryParts.push(`nameLIKE${params.name_contains}`);
    }

    if (params.operational_status) {
      queryParts.push(`operational_status=${params.operational_status}`);
    }

    if (params.environment) {
      queryParts.push(`u_environment=${params.environment}`);
    }

    if (params.support_group) {
      queryParts.push(`support_group.name=${params.support_group}`);
    }

    if (params.custom_query) {
      queryParts.push(params.custom_query);
    }

    // Build query parameters
    const queryParams: any = {
      sysparm_limit: params.limit,
      sysparm_offset: params.offset
    };

    if (queryParts.length > 0) {
      queryParams.sysparm_query = queryParts.join('^');
    }

    if (params.fields) {
      queryParams.sysparm_fields = params.fields;
    }

    // Execute query
    const response = await client.query('cmdb_ci', queryParams);

    // Format response
    return formatSuccess({
      success: true,
      count: response.result.length,
      cis: response.result
    });
  } catch (error) {
    return handleError(error, 'query_cmdb_ci');
  }
}

// Tool schema for MCP registration
export const queryCmdbCiTool = {
  name: 'query_cmdb_ci',
  description: 'Query Configuration Items from the CMDB with advanced filtering by class, status, environment, and support group.',
  inputSchema: {
    type: 'object',
    properties: {
      ci_class: {
        type: 'string',
        description: 'CI class name (e.g., "cmdb_ci_server", "cmdb_ci_database", "cmdb_ci_app_server")'
      },
      name_contains: {
        type: 'string',
        description: 'Search for CIs with names containing this text'
      },
      operational_status: {
        type: 'string',
        description: 'Operational status (1=Operational, 2=Non-Operational, etc.)'
      },
      environment: {
        type: 'string',
        description: 'Environment (e.g., "Production", "Development", "Test")'
      },
      support_group: {
        type: 'string',
        description: 'Name of the support group'
      },
      custom_query: {
        type: 'string',
        description: 'Additional encoded query string'
      },
      fields: {
        type: 'string',
        description: 'Comma-separated field list'
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
    }
  }
};
