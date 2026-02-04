/**
 * Get Table Schema Tool
 * Retrieve the structure and available fields of a ServiceNow table
 */

import { z } from 'zod';
import { getClient } from '../servicenow/client.js';
import { handleError, formatSuccess } from '../utils/error-handler.js';
import { tableNameSchema } from '../utils/validation.js';

// Input schema for get-table-schema tool
const getTableSchemaSchema = z.object({
  table: tableNameSchema
});

export type GetTableSchemaInput = z.infer<typeof getTableSchemaSchema>;

/**
 * Execute get-table-schema tool
 */
export async function executeGetTableSchema(args: unknown) {
  try {
    // Validate inputs
    const params = getTableSchemaSchema.parse(args);

    // Get ServiceNow client
    const client = getClient();

    // Query sys_dictionary to get table schema
    const response = await client.query('sys_dictionary', {
      sysparm_query: `name=${params.table}`,
      sysparm_fields: 'element,column_label,internal_type,max_length,mandatory,reference,default_value',
      sysparm_limit: 1000
    });

    // Format response
    const fields = response.result.map((field: any) => ({
      name: field.element,
      label: field.column_label,
      type: field.internal_type,
      max_length: field.max_length,
      mandatory: field.mandatory,
      reference: field.reference,
      default_value: field.default_value
    }));

    return formatSuccess({
      success: true,
      table: params.table,
      field_count: fields.length,
      fields: fields
    });
  } catch (error) {
    return handleError(error, 'get_table_schema');
  }
}

// Tool schema for MCP registration
export const getTableSchemaTool = {
  name: 'get_table_schema',
  description: 'Get the structure and available fields of a ServiceNow table. Returns field names, types, labels, and constraints.',
  inputSchema: {
    type: 'object',
    properties: {
      table: {
        type: 'string',
        description: 'ServiceNow table name to get schema for (e.g., "incident", "sys_user")'
      }
    },
    required: ['table']
  }
};
