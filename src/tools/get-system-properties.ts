/**
 * Get System Properties Tool
 * Reads ServiceNow sys_properties for instance configuration inspection.
 * Essential for understanding retention settings, feature flags, and configuration state.
 */

import { z } from 'zod';
import { getClient } from '../servicenow/client.js';
import { handleError, formatSuccess } from '../utils/error-handler.js';

const getSystemPropertiesSchema = z.object({
  name_pattern: z.string().optional()
    .describe('Filter by property name pattern (LIKE match, e.g. "glide.syslog", "com.glide.email").'),
  names: z.array(z.string().min(1)).max(50).optional()
    .describe('Fetch specific properties by exact name. Takes precedence over name_pattern.'),
  category: z.string().optional()
    .describe('Filter by property category field (e.g. "Email", "Security").'),
  limit: z.number().int().min(1).max(500).default(100)
    .describe('Maximum properties to return. Default: 100.')
});

export type GetSystemPropertiesInput = z.infer<typeof getSystemPropertiesSchema>;

export async function executeGetSystemProperties(args: unknown) {
  try {
    const params = getSystemPropertiesSchema.parse(args);
    const client = getClient();

    let query: string;

    if (params.names && params.names.length > 0) {
      // Exact name lookup
      query = params.names.map(n => `name=${n}`).join('^OR');
    } else {
      const conditions: string[] = [];
      if (params.name_pattern) conditions.push(`nameLIKE${params.name_pattern}`);
      if (params.category) conditions.push(`categoryLIKE${params.category}`);
      query = conditions.length > 0 ? conditions.join('^') : '';
    }

    const queryParams: any = {
      sysparm_fields: 'name,value,description,type,category,suffix',
      sysparm_limit: params.limit,
      sysparm_orderby: 'name'
    };

    if (query) queryParams.sysparm_query = query;

    const response = await client.query('sys_properties', queryParams);

    const properties = response.result.map((r: any) => ({
      name: r.name,
      value: r.value,
      description: r.description ?? '',
      type: r.type ?? '',
      category: r.category ?? ''
    }));

    return formatSuccess({
      success: true,
      count: properties.length,
      filter: {
        names: params.names ?? null,
        name_pattern: params.name_pattern ?? null,
        category: params.category ?? null
      },
      properties
    });
  } catch (error) {
    return handleError(error, 'get_system_properties');
  }
}

export const getSystemPropertiesTool = {
  name: 'get_system_properties',
  description: [
    'Reads instance configuration from sys_properties.',
    'Use for: verifying retention policies, feature flag states, email/notification settings,',
    'syslog configuration (glide.syslog.*), and any named system property.',
    'Supports fuzzy name search, multi-property exact lookup, and category filtering.',
    'SOP 0 use: verify cleanup scripts created retention policies correctly.'
  ].join(' '),
  inputSchema: {
    type: 'object',
    properties: {
      name_pattern: {
        type: 'string',
        description: 'Filter by property name containing this string (e.g. "glide.syslog" to see all syslog-related properties).'
      },
      names: {
        type: 'array',
        items: { type: 'string' },
        description: 'Fetch specific properties by exact name. Overrides name_pattern. Example: ["glide.buildtag", "instance.name"]'
      },
      category: {
        type: 'string',
        description: 'Filter by category field (e.g. "Email", "Logging").'
      },
      limit: {
        type: 'number',
        description: 'Max properties to return (1–500). Default: 100.',
        default: 100
      }
    },
    required: []
  }
};
