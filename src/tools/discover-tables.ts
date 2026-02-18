/**
 * Discover Tables Tool
 * Discovers ServiceNow tables matching a name pattern, including rotation tables.
 * Essential for SOP 0 assessments — finds syslog0000, syslog0001, etc. automatically.
 */

import { z } from 'zod';
import { getClient } from '../servicenow/client.js';
import { handleError, formatSuccess } from '../utils/error-handler.js';

const discoverTablesSchema = z.object({
  name_pattern: z.string()
    .min(1, 'name_pattern is required')
    .describe('Base table name or pattern to search for (e.g. "syslog" finds syslog + all rotation tables)'),
  match_type: z.enum(['starts_with', 'contains'])
    .default('starts_with')
    .describe('How to match the pattern: "starts_with" (default) or "contains"'),
  limit: z.number().int().min(1).max(500).default(100)
    .describe('Maximum number of matching tables to return')
});

export type DiscoverTablesInput = z.infer<typeof discoverTablesSchema>;

export async function executeDiscoverTables(args: unknown) {
  try {
    const params = discoverTablesSchema.parse(args);
    const client = getClient();

    const operator = params.match_type === 'contains' ? 'LIKE' : 'STARTSWITH';
    const query = `name${operator}${params.name_pattern}^ORDERBYname`;

    const response = await client.query('sys_db_object', {
      sysparm_query: query,
      sysparm_fields: 'name,label,super_class.name',
      sysparm_limit: params.limit
    });

    const tables = response.result.map((r: any) => ({
      name: r.name,
      label: r.label,
      parent_table: r['super_class.name'] ?? null
    }));

    // Identify which are likely rotation tables (base name + 4-digit suffix)
    // Escape regex special characters in user-provided pattern
    const escapedPattern = params.name_pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rotationPattern = new RegExp(`^${escapedPattern}\\d{4}$`);
    const baseTables = tables.filter((t: any) => !rotationPattern.test(t.name));
    const rotationTables = tables.filter((t: any) => rotationPattern.test(t.name));

    return formatSuccess({
      success: true,
      pattern: params.name_pattern,
      match_type: params.match_type,
      total_found: tables.length,
      base_tables: baseTables,
      rotation_tables: rotationTables,
      all_table_names: tables.map((t: any) => t.name),
      note: rotationTables.length > 0
        ? `Found ${rotationTables.length} rotation table(s). When counting records, sum all rotation tables + base table for true total.`
        : 'No rotation tables found. Only base table(s) exist.'
    });
  } catch (error) {
    return handleError(error, 'discover_tables');
  }
}

export const discoverTablesTool = {
  name: 'discover_tables',
  description: [
    'Discovers ServiceNow tables matching a name pattern by querying sys_db_object.',
    'Automatically identifies rotation tables (e.g. syslog0000, syslog0001) vs base tables.',
    'Critical for SOP 0 War Room Assessment: use this before counting syslog records',
    'to find all rotation tables, then sum their counts for the true total.',
    'Example: name_pattern="syslog" finds syslog, syslog0000, syslog0001, syslog0002, etc.'
  ].join(' '),
  inputSchema: {
    type: 'object',
    properties: {
      name_pattern: {
        type: 'string',
        description: 'Base name to search for (e.g. "syslog", "sys_audit", "sys_flow"). Case-insensitive.'
      },
      match_type: {
        type: 'string',
        enum: ['starts_with', 'contains'],
        description: '"starts_with" (default) finds tables whose name begins with the pattern. "contains" finds any table with the pattern anywhere in the name.',
        default: 'starts_with'
      },
      limit: {
        type: 'number',
        description: 'Maximum tables to return (1-500). Default: 100',
        default: 100
      }
    },
    required: ['name_pattern']
  }
};
