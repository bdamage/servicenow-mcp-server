/**
 * IRE Batch Create or Update CIs Tool
 * Batch create or update multiple CIs using IRE identification and reconciliation
 */

import { z } from 'zod';
import { getClient } from '../servicenow/client.js';
import { handleError, formatSuccess } from '../utils/error-handler.js';
import { dataSourceSchema, ireItemSchema } from '../utils/validation.js';

// Input schema for ire-batch-create-or-update-cis tool
const ireBatchCreateOrUpdateCisSchema = z.object({
  data_source: dataSourceSchema,
  items: z.array(ireItemSchema).min(1, 'At least one item is required').max(100, 'Maximum 100 items per batch')
});

export type IreBatchCreateOrUpdateCisInput = z.infer<typeof ireBatchCreateOrUpdateCisSchema>;

/**
 * Execute ire-batch-create-or-update-cis tool
 */
export async function executeIreBatchCreateOrUpdateCis(args: unknown) {
  try {
    // Validate inputs
    const params = ireBatchCreateOrUpdateCisSchema.parse(args);

    // Get ServiceNow client
    const client = getClient();

    // Call IRE batch API
    const response = await client.batchCreateOrUpdateCIs(params.data_source, params.items);

    // Process results
    const stats = {
      total: params.items.length,
      created: 0,
      updated: 0,
      identified: 0,
      skipped: 0,
      failed: 0
    };

    const results: any[] = [];
    const errors: any[] = [];

    if (response.result) {
      response.result.forEach((item, index) => {
        const result = {
          index,
          operation: item.operation,
          sys_id: item.sys_id,
          ci_identifier: item.ci_identifier,
          status: item.status
        };

        switch (item.operation) {
          case 'created':
            stats.created++;
            results.push(result);
            break;
          case 'updated':
            stats.updated++;
            results.push(result);
            break;
          case 'identified':
            stats.identified++;
            results.push(result);
            break;
          case 'skipped':
            stats.skipped++;
            results.push(result);
            break;
          case 'error':
            stats.failed++;
            errors.push({
              index,
              error: item.error || item.status,
              item: params.items[index]
            });
            break;
        }
      });
    }

    // Format response
    return formatSuccess({
      success: stats.failed === 0,
      ...stats,
      results,
      errors: errors.length > 0 ? errors : undefined,
      summary: `Processed ${stats.total} CIs: ${stats.created} created, ${stats.updated} updated, ${stats.identified} identified, ${stats.skipped} skipped, ${stats.failed} failed`
    });
  } catch (error) {
    return handleError(error, 'ire_batch_create_or_update_cis');
  }
}

// Tool schema for MCP registration
export const ireBatchCreateOrUpdateCisTool = {
  name: 'ire_batch_create_or_update_cis',
  description: `Batch create or update multiple Configuration Items (up to 100) using ServiceNow's Identification and Reconciliation Engine (IRE).

IRE provides intelligent CMDB data management:
- Automatic duplicate detection for all items
- Efficient batch processing in a single API call
- Per-CI status tracking (created/updated/identified/skipped/failed)
- Data reconciliation with existing records
- Source precedence handling

This tool is ideal for:
- Bulk importing CIs from external systems
- Synchronizing large datasets with CMDB
- Discovery tool integrations
- Data migration with duplicate prevention

Returns detailed results for each CI including operation status and any errors.

Required: Data source must exist in discovery_source table. Use ire_list_data_sources to see available sources.`,
  inputSchema: {
    type: 'object',
    properties: {
      data_source: {
        type: 'string',
        description: 'Discovery source name (must be configured in ServiceNow)'
      },
      items: {
        type: 'array',
        description: 'Array of CI definitions to create or update (1-100 items)',
        minItems: 1,
        maxItems: 100,
        items: {
          type: 'object',
          properties: {
            className: {
              type: 'string',
              description: 'CI class name (must start with "cmdb_ci")'
            },
            values: {
              type: 'object',
              description: 'CI attributes as key-value pairs'
            },
            internal_id: {
              type: 'string',
              description: 'Unique identifier from source system (optional but recommended)'
            },
            relations: {
              type: 'array',
              description: 'CI relationships (optional)'
            },
            referenceItems: {
              type: 'array',
              description: 'Reference field data (optional)'
            }
          },
          required: ['className', 'values']
        }
      }
    },
    required: ['data_source', 'items']
  }
};
