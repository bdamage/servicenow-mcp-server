/**
 * IRE List Data Sources Tool
 * List available discovery data sources for use with IRE operations
 */

import { z } from 'zod';
import { getClient } from '../servicenow/client.js';
import { handleError, formatSuccess } from '../utils/error-handler.js';

// Input schema for ire-list-data-sources tool
const ireListDataSourcesSchema = z.object({
  active_only: z.boolean().default(true)
});

export type IreListDataSourcesInput = z.infer<typeof ireListDataSourcesSchema>;

/**
 * Execute ire-list-data-sources tool
 */
export async function executeIreListDataSources(args: unknown) {
  try {
    // Validate inputs
    const params = ireListDataSourcesSchema.parse(args);

    // Get ServiceNow client
    const client = getClient();

    // Query data sources
    const response = await client.listDataSources(params.active_only);

    // Format response
    return formatSuccess({
      success: true,
      count: response.result.length,
      sources: response.result.map(source => ({
        name: source.name,
        label: source.label,
        active: source.active,
        type: source.type
      }))
    });
  } catch (error) {
    return handleError(error, 'ire_list_data_sources');
  }
}

// Tool schema for MCP registration
export const ireListDataSourcesTool = {
  name: 'ire_list_data_sources',
  description: 'List available discovery data sources for use with IRE (Identification and Reconciliation Engine) operations. Data sources must be configured in ServiceNow before using IRE tools to create or update CIs.',
  inputSchema: {
    type: 'object',
    properties: {
      active_only: {
        type: 'boolean',
        description: 'Show only active data sources (default: true)',
        default: true
      }
    }
  }
};
