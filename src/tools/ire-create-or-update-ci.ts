/**
 * IRE Create or Update CI Tool
 * Create or update a single Configuration Item using IRE identification and reconciliation
 */

import { z } from 'zod';
import { getClient } from '../servicenow/client.js';
import { handleError, formatSuccess } from '../utils/error-handler.js';
import { dataSourceSchema, ciClassNameSchema, recordDataSchema, ireRelationSchema } from '../utils/validation.js';

// Input schema for ire-create-or-update-ci tool
const ireCreateOrUpdateCiSchema = z.object({
  data_source: dataSourceSchema,
  class_name: ciClassNameSchema,
  values: recordDataSchema,
  internal_id: z.string().optional(),
  relations: z.array(ireRelationSchema).optional(),
  reference_items: z.array(z.any()).optional()
});

export type IreCreateOrUpdateCiInput = z.infer<typeof ireCreateOrUpdateCiSchema>;

/**
 * Execute ire-create-or-update-ci tool
 */
export async function executeIreCreateOrUpdateCi(args: unknown) {
  try {
    // Validate inputs
    const params = ireCreateOrUpdateCiSchema.parse(args);

    // Get ServiceNow client
    const client = getClient();

    // Build IRE item
    const ireItem = {
      className: params.class_name,
      values: params.values,
      internal_id: params.internal_id,
      relations: params.relations,
      referenceItems: params.reference_items
    };

    // Call IRE API
    const response = await client.createOrUpdateCI(params.data_source, ireItem);

    // Process response
    if (response.result && response.result.length > 0) {
      const result = response.result[0];

      return formatSuccess({
        success: result.operation !== 'error',
        operation: result.operation,
        sys_id: result.sys_id,
        ci_identifier: result.ci_identifier,
        status: result.status,
        error: result.error,
        message: getOperationMessage(result.operation)
      });
    } else {
      return formatSuccess({
        success: false,
        error: 'No result returned from IRE API'
      });
    }
  } catch (error) {
    return handleError(error, 'ire_create_or_update_ci');
  }
}

/**
 * Get user-friendly message for IRE operation
 */
function getOperationMessage(operation: string): string {
  switch (operation) {
    case 'created':
      return 'New CI created successfully via IRE';
    case 'updated':
      return 'Existing CI updated successfully via IRE';
    case 'identified':
      return 'Existing CI identified, no changes needed';
    case 'skipped':
      return 'CI skipped - validation failed or no changes detected';
    case 'error':
      return 'Error occurred during IRE processing';
    default:
      return `IRE operation completed: ${operation}`;
  }
}

// Tool schema for MCP registration
export const ireCreateOrUpdateCiTool = {
  name: 'ire_create_or_update_ci',
  description: `Create or update a Configuration Item using ServiceNow's Identification and Reconciliation Engine (IRE).

IRE provides several advantages over direct table operations:
- Automatic duplicate detection using identification rules
- Intelligent reconciliation with existing data
- Data source precedence handling
- Relationship management
- Better data quality through standardized import process

This tool is ideal for:
- Importing CIs from external data sources
- Synchronizing CMDB with discovery tools
- Preventing duplicate CI creation
- Maintaining data consistency across sources

Required: Data source must exist in discovery_source table. Use ire_list_data_sources to see available sources.`,
  inputSchema: {
    type: 'object',
    properties: {
      data_source: {
        type: 'string',
        description: 'Discovery source name (must be configured in ServiceNow)'
      },
      class_name: {
        type: 'string',
        description: 'CI class name (must start with "cmdb_ci", e.g., "cmdb_ci_server", "cmdb_ci_service")'
      },
      values: {
        type: 'object',
        description: 'CI attributes as key-value pairs (e.g., {"name": "server-01", "ip_address": "10.0.1.50"})'
      },
      internal_id: {
        type: 'string',
        description: 'Unique identifier from source system (optional but recommended for tracking)'
      },
      relations: {
        type: 'array',
        description: 'CI relationships (optional)',
        items: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Relationship type'
            },
            target: {
              type: 'string',
              description: 'Target CI sys_id'
            },
            properties: {
              type: 'object',
              description: 'Additional relationship properties'
            }
          },
          required: ['type', 'target']
        }
      },
      reference_items: {
        type: 'array',
        description: 'Reference field data (optional, advanced)'
      }
    },
    required: ['data_source', 'class_name', 'values']
  }
};
