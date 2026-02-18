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

// Script execution
export { executeScriptTool, executeExecuteScript } from './execute-script.js';

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

// IRE (Identification and Reconciliation Engine) operations
export { ireCreateOrUpdateCiTool, executeIreCreateOrUpdateCi } from './ire-create-or-update-ci.js';
export { ireBatchCreateOrUpdateCisTool, executeIreBatchCreateOrUpdateCis } from './ire-batch-create-or-update-cis.js';
export { ireListDataSourcesTool, executeIreListDataSources } from './ire-list-data-sources.js';

// Instance Health & War Room Assessment tools (SOP 0)
export { getRecordCountTool, executeGetRecordCount } from './get-record-count.js';
export { discoverTablesTool, executeDiscoverTables } from './discover-tables.js';
export { queryScheduledJobsTool, executeQueryScheduledJobs } from './query-scheduled-jobs.js';
export { toggleScheduledJobTool, executeToggleScheduledJob } from './toggle-scheduled-job.js';
export { bulkDeleteRecordsTool, executeBulkDeleteRecords } from './bulk-delete-records.js';
export { querySyslogTool, executeQuerySyslog } from './query-syslog.js';
export { getSystemPropertiesTool, executeGetSystemProperties } from './get-system-properties.js';
export { getInstanceHealthTool, executeGetInstanceHealth } from './get-instance-health.js';
export { createScheduledJobTool, executeCreateScheduledJob } from './create-scheduled-job.js';
export { assessDatabaseHealthTool, executeAssessDatabaseHealth } from './assess-database-health.js';

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
  'execute_script',
  'get_ci_relationships',
  'get_impact_analysis',
  'query_cmdb_ci',
  'create_event',
  'query_events',
  'create_service',
  'link_ci_to_service',
  'get_service_map',
  'ire_create_or_update_ci',
  'ire_batch_create_or_update_cis',
  'ire_list_data_sources',
  'get_record_count',
  'discover_tables',
  'query_scheduled_jobs',
  'toggle_scheduled_job',
  'bulk_delete_records',
  'query_syslog',
  'get_system_properties',
  'get_instance_health',
  'create_scheduled_job',
  'assess_database_health'
] as const;

export type ToolName = typeof ALL_TOOLS[number];
