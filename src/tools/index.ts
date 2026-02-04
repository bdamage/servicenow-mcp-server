/**
 * Tool exports and registration
 */

export { queryTableTool, executeQueryTable } from './query-table.js';
export { getRecordTool, executeGetRecord } from './get-record.js';
export { searchIncidentsTool, executeSearchIncidents } from './search-incidents.js';
export { getUserTool, executeGetUser } from './get-user.js';
export { createRecordTool, executeCreateRecord } from './create-record.js';
export { updateRecordTool, executeUpdateRecord } from './update-record.js';
export { getTableSchemaTool, executeGetTableSchema } from './get-table-schema.js';
export { deleteRecordTool, executeDeleteRecord } from './delete-record.js';
export { batchCreateRecordsTool, executeBatchCreateRecords } from './batch-create-records.js';
export { batchUpdateRecordsTool, executeBatchUpdateRecords } from './batch-update-records.js';
export { batchQueryTablesTool, executeBatchQueryTables } from './batch-query-tables.js';

// Array of all tools for MCP server registration
export const ALL_TOOLS = [
  'query_table',
  'get_record',
  'search_incidents',
  'get_user',
  'create_record',
  'update_record',
  'get_table_schema',
  'delete_record',
  'batch_create_records',
  'batch_update_records',
  'batch_query_tables'
] as const;

export type ToolName = typeof ALL_TOOLS[number];
