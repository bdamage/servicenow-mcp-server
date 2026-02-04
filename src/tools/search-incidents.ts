/**
 * Search Incidents Tool
 * Specialized tool for searching incidents with common filters
 */

import { z } from 'zod';
import { getClient } from '../servicenow/client.js';
import { handleError, formatSuccess } from '../utils/error-handler.js';
import { limitSchema, offsetSchema } from '../utils/validation.js';

// Input schema for search-incidents tool
const searchIncidentsSchema = z.object({
  status: z.string().optional(),
  priority: z.string().optional(),
  assigned_to: z.string().optional(),
  assignment_group: z.string().optional(),
  search_text: z.string().optional(),
  limit: limitSchema,
  offset: offsetSchema
});

export type SearchIncidentsInput = z.infer<typeof searchIncidentsSchema>;

/**
 * Execute search-incidents tool
 */
export async function executeSearchIncidents(args: unknown) {
  try {
    // Validate inputs
    const params = searchIncidentsSchema.parse(args);

    // Get ServiceNow client
    const client = getClient();

    // Build encoded query string
    const queryParts: string[] = [];

    if (params.status) {
      queryParts.push(`state=${params.status}`);
    }

    if (params.priority) {
      queryParts.push(`priority=${params.priority}`);
    }

    if (params.assigned_to) {
      queryParts.push(`assigned_to.user_name=${params.assigned_to}`);
    }

    if (params.assignment_group) {
      queryParts.push(`assignment_group.name=${params.assignment_group}`);
    }

    if (params.search_text) {
      // Search in short_description OR description
      queryParts.push(`short_descriptionLIKE${params.search_text}^ORdescriptionLIKE${params.search_text}`);
    }

    // Build query parameters
    const queryParams: any = {
      sysparm_limit: params.limit,
      sysparm_offset: params.offset
    };

    if (queryParts.length > 0) {
      queryParams.sysparm_query = queryParts.join('^');
    }

    // Query the incident table
    const response = await client.query('incident', queryParams);

    // Format response
    return formatSuccess({
      success: true,
      count: response.result.length,
      incidents: response.result
    });
  } catch (error) {
    return handleError(error, 'search_incidents');
  }
}

// Tool schema for MCP registration
export const searchIncidentsTool = {
  name: 'search_incidents',
  description: 'Search ServiceNow incidents with common filters like status, priority, assignment, and text search. Simplified interface for incident management.',
  inputSchema: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        description: 'Incident state/status (e.g., "1" for New, "2" for In Progress, "6" for Resolved, "7" for Closed). Optional.'
      },
      priority: {
        type: 'string',
        description: 'Priority level (e.g., "1" for Critical, "2" for High, "3" for Moderate, "4" for Low, "5" for Planning). Optional.'
      },
      assigned_to: {
        type: 'string',
        description: 'Username of the assigned user. Optional.'
      },
      assignment_group: {
        type: 'string',
        description: 'Name of the assignment group. Optional.'
      },
      search_text: {
        type: 'string',
        description: 'Text to search for in short_description or description fields. Optional.'
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
    }
  }
};
