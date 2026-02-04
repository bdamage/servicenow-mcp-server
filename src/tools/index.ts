/**
 * Tool exports and registration
 */

// Basic CRUD operations
export { queryTableTool, executeQueryTable } from './query-table.js';
export { getRecordTool, executeGetRecord } from './get-record.js';
export { searchIncidentsTool, executeSearchIncidents } from './search-incidents.js';
export { getUserTool, executeGetUser } from './get-user.js';
export { createRecordTool, executeCreateRecord } from './create-record.js';
export { updateRecordTool, executeUpdateRecord } from './update-record.js';
export { getTableSchemaTool, executeGetTableSchema } from './get-table-schema.js';
export { deleteRecordTool, executeDeleteRecord } from './delete-record.js';

// Batch operations
export { batchCreateRecordsTool, executeBatchCreateRecords } from './batch-create-records.js';
export { batchUpdateRecordsTool, executeBatchUpdateRecords } from './batch-update-records.js';
export { batchQueryTablesTool, executeBatchQueryTables } from './batch-query-tables.js';

// CMDB operations
export { getCiRelationshipsTool, executeGetCiRelationships } from './get-ci-relationships.js';
export { getImpactAnalysisTool, executeGetImpactAnalysis } from './get-impact-analysis.js';
export { queryCmdbCiTool, executeQueryCmdbCi } from './query-cmdb-ci.js';

// Event Management
export { createEventTool, executeCreateEvent } from './create-event.js';
export { queryEventsTool, executeQueryEvents } from './query-events.js';

// Service Management
export { createServiceTool, executeCreateService } from './create-service.js';
export { linkCiToServiceTool, executeLinkCiToService } from './link-ci-to-service.js';
export { getServiceMapTool, executeGetServiceMap } from './get-service-map.js';

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
  'batch_query_tables',
  'get_ci_relationships',
  'get_impact_analysis',
  'query_cmdb_ci',
  'create_event',
  'query_events',
  'create_service',
  'link_ci_to_service',
  'get_service_map'
] as const;

export type ToolName = typeof ALL_TOOLS[number];
