/**
 * Query Events Tool
 * Query ServiceNow Event Management events with filtering
 */

import { z } from 'zod';
import { getClient } from '../servicenow/client.js';
import { handleError, formatSuccess } from '../utils/error-handler.js';
import { queryStringSchema, limitSchema, offsetSchema } from '../utils/validation.js';

// Input schema for query-events tool
const queryEventsSchema = z.object({
  source: z.string().optional(),
  node: z.string().optional(),
  severity: z.string().optional(),
  state: z.string().optional(), // Ready, Queued, Processing, Processed, Error
  time_range_hours: z.number().min(1).max(168).optional(), // Last N hours (max 1 week)
  custom_query: queryStringSchema,
  limit: limitSchema,
  offset: offsetSchema
});

export type QueryEventsInput = z.infer<typeof queryEventsSchema>;

/**
 * Execute query-events tool
 */
export async function executeQueryEvents(args: unknown) {
  try {
    // Validate inputs
    const params = queryEventsSchema.parse(args);

    // Get ServiceNow client
    const client = getClient();

    // Build query
    const queryParts: string[] = [];

    if (params.source) {
      queryParts.push(`source=${params.source}`);
    }

    if (params.node) {
      queryParts.push(`node=${params.node}`);
    }

    if (params.severity) {
      queryParts.push(`severity=${params.severity}`);
    }

    if (params.state) {
      queryParts.push(`state=${params.state}`);
    }

    if (params.time_range_hours) {
      // Query events from the last N hours
      queryParts.push(`sys_created_on>=javascript:gs.hoursAgo(${params.time_range_hours})`);
    }

    if (params.custom_query) {
      queryParts.push(params.custom_query);
    }

    // Build query parameters
    const queryParams: any = {
      sysparm_limit: params.limit,
      sysparm_offset: params.offset,
      sysparm_fields: 'sys_id,source,node,type,resource,severity,state,description,sys_created_on,message_key,ci_identifier',
      sysparm_display_value: 'all'
    };

    if (queryParts.length > 0) {
      queryParams.sysparm_query = queryParts.join('^');
    }

    // Add ordering by creation time (newest first)
    queryParams.sysparm_query = (queryParams.sysparm_query || '') + '^ORDERBYDESCsys_created_on';

    // Execute query
    const response = await client.query('em_event', queryParams);

    // Calculate event statistics
    const stats = {
      total: response.result.length,
      by_severity: {
        critical: 0,
        major: 0,
        minor: 0,
        warning: 0,
        info: 0,
        clear: 0
      },
      by_state: {
        ready: 0,
        queued: 0,
        processing: 0,
        processed: 0,
        error: 0
      }
    };

    response.result.forEach((event: any) => {
      // Count by severity
      const severity = event.severity?.value || event.severity;
      switch (severity) {
        case '1': stats.by_severity.critical++; break;
        case '2': stats.by_severity.major++; break;
        case '3': stats.by_severity.minor++; break;
        case '4': stats.by_severity.warning++; break;
        case '5': stats.by_severity.info++; break;
        case '0': stats.by_severity.clear++; break;
      }

      // Count by state
      const state = (event.state?.value || event.state || '').toLowerCase();
      if (state.includes('ready')) stats.by_state.ready++;
      else if (state.includes('queued')) stats.by_state.queued++;
      else if (state.includes('processing')) stats.by_state.processing++;
      else if (state.includes('processed')) stats.by_state.processed++;
      else if (state.includes('error')) stats.by_state.error++;
    });

    // Format response
    return formatSuccess({
      success: true,
      count: response.result.length,
      statistics: stats,
      events: response.result
    });
  } catch (error) {
    return handleError(error, 'query_events');
  }
}

// Tool schema for MCP registration
export const queryEventsTool = {
  name: 'query_events',
  description: 'Query Event Management events with filtering by source, node, severity, and time range. Includes statistics on event distribution.',
  inputSchema: {
    type: 'object',
    properties: {
      source: {
        type: 'string',
        description: 'Filter by event source system'
      },
      node: {
        type: 'string',
        description: 'Filter by source node/host name'
      },
      severity: {
        type: 'string',
        description: 'Filter by severity (0=Clear, 1=Critical, 2=Major, 3=Minor, 4=Warning, 5=Info)'
      },
      state: {
        type: 'string',
        description: 'Filter by processing state (Ready, Queued, Processing, Processed, Error)'
      },
      time_range_hours: {
        type: 'number',
        description: 'Only show events from the last N hours (1-168, max 1 week)'
      },
      custom_query: {
        type: 'string',
        description: 'Additional encoded query string'
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
