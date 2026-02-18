#!/usr/bin/env node

/**
 * ServiceNow MCP Server
 * Main entry point for the Model Context Protocol server
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

// Configuration and client
import { loadConfig } from './config.js';
import { initializeClient } from './servicenow/client.js';
import { logger } from './utils/logger.js';

// Tools
import {
  queryTableTool,
  getRecordTool,
  searchIncidentsTool,
  getUserTool,
  createRecordTool,
  updateRecordTool,
  getTableSchemaTool,
  deleteRecordTool,
  batchCreateRecordsTool,
  batchUpdateRecordsTool,
  batchQueryTablesTool,
  getCiRelationshipsTool,
  getImpactAnalysisTool,
  queryCmdbCiTool,
  createEventTool,
  queryEventsTool,
  createServiceTool,
  linkCiToServiceTool,
  getServiceMapTool,
  ireCreateOrUpdateCiTool,
  ireBatchCreateOrUpdateCisTool,
  ireListDataSourcesTool,
  executeScriptTool,
  executeQueryTable,
  executeGetRecord,
  executeSearchIncidents,
  executeGetUser,
  executeCreateRecord,
  executeUpdateRecord,
  executeGetTableSchema,
  executeDeleteRecord,
  executeBatchCreateRecords,
  executeBatchUpdateRecords,
  executeBatchQueryTables,
  executeGetCiRelationships,
  executeGetImpactAnalysis,
  executeQueryCmdbCi,
  executeCreateEvent,
  executeQueryEvents,
  executeCreateService,
  executeLinkCiToService,
  executeGetServiceMap,
  executeIreCreateOrUpdateCi,
  executeIreBatchCreateOrUpdateCis,
  executeIreListDataSources,
  executeExecuteScript,
  getRecordCountTool,
  executeGetRecordCount,
  discoverTablesTool,
  executeDiscoverTables,
  queryScheduledJobsTool,
  executeQueryScheduledJobs,
  toggleScheduledJobTool,
  executeToggleScheduledJob,
  bulkDeleteRecordsTool,
  executeBulkDeleteRecords,
  querySyslogTool,
  executeQuerySyslog,
  getSystemPropertiesTool,
  executeGetSystemProperties,
  getInstanceHealthTool,
  executeGetInstanceHealth,
  createScheduledJobTool,
  executeCreateScheduledJob,
  assessDatabaseHealthTool,
  executeAssessDatabaseHealth
} from './tools/index.js';

// Resources
import {
  INSTANCE_INFO_URI,
  COMMON_TABLES_URI,
  getInstanceInfo,
  getCommonTables
} from './resources/index.js';

/**
 * Main server initialization
 */
async function main() {
  try {
    // Load and validate configuration
    logger.info('Loading configuration...');
    const config = loadConfig();
    logger.info(`Configuration loaded for instance: ${config.instance}`);

    // Initialize ServiceNow client
    logger.info('Initializing ServiceNow client...');
    initializeClient(config.instance, config.username, config.password);
    logger.info('ServiceNow client initialized successfully');

    // Create MCP server
    const server = new Server(
      {
        name: 'servicenow-mcp-server',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {},
          resources: {}
        }
      }
    );

    // Register list tools handler
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      logger.debug('Handling ListTools request');
      return {
        tools: [
          queryTableTool,
          getRecordTool,
          searchIncidentsTool,
          getUserTool,
          createRecordTool,
          updateRecordTool,
          getTableSchemaTool,
          deleteRecordTool,
          batchCreateRecordsTool,
          batchUpdateRecordsTool,
          batchQueryTablesTool,
          getCiRelationshipsTool,
          getImpactAnalysisTool,
          queryCmdbCiTool,
          createEventTool,
          queryEventsTool,
          createServiceTool,
          linkCiToServiceTool,
          getServiceMapTool,
          ireCreateOrUpdateCiTool,
          ireBatchCreateOrUpdateCisTool,
          ireListDataSourcesTool,
          executeScriptTool,
          getRecordCountTool,
          discoverTablesTool,
          queryScheduledJobsTool,
          toggleScheduledJobTool,
          bulkDeleteRecordsTool,
          querySyslogTool,
          getSystemPropertiesTool,
          getInstanceHealthTool,
          createScheduledJobTool,
          assessDatabaseHealthTool
        ]
      };
    });

    // Register call tool handler
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      logger.info(`Executing tool: ${name}`);
      logger.debug(`Tool arguments: ${JSON.stringify(args)}`);

      try {
        switch (name) {
          case 'query_table':
            return await executeQueryTable(args);
          case 'get_record':
            return await executeGetRecord(args);
          case 'search_incidents':
            return await executeSearchIncidents(args);
          case 'get_user':
            return await executeGetUser(args);
          case 'create_record':
            return await executeCreateRecord(args);
          case 'update_record':
            return await executeUpdateRecord(args);
          case 'get_table_schema':
            return await executeGetTableSchema(args);
          case 'delete_record':
            return await executeDeleteRecord(args);
          case 'batch_create_records':
            return await executeBatchCreateRecords(args);
          case 'batch_update_records':
            return await executeBatchUpdateRecords(args);
          case 'batch_query_tables':
            return await executeBatchQueryTables(args);
          case 'get_ci_relationships':
            return await executeGetCiRelationships(args);
          case 'get_impact_analysis':
            return await executeGetImpactAnalysis(args);
          case 'query_cmdb_ci':
            return await executeQueryCmdbCi(args);
          case 'create_event':
            return await executeCreateEvent(args);
          case 'query_events':
            return await executeQueryEvents(args);
          case 'create_service':
            return await executeCreateService(args);
          case 'link_ci_to_service':
            return await executeLinkCiToService(args);
          case 'get_service_map':
            return await executeGetServiceMap(args);
          case 'ire_create_or_update_ci':
            return await executeIreCreateOrUpdateCi(args);
          case 'ire_batch_create_or_update_cis':
            return await executeIreBatchCreateOrUpdateCis(args);
          case 'ire_list_data_sources':
            return await executeIreListDataSources(args);
          case 'execute_script':
            return await executeExecuteScript(args);
          case 'get_record_count':
            return await executeGetRecordCount(args);
          case 'discover_tables':
            return await executeDiscoverTables(args);
          case 'query_scheduled_jobs':
            return await executeQueryScheduledJobs(args);
          case 'toggle_scheduled_job':
            return await executeToggleScheduledJob(args);
          case 'bulk_delete_records':
            return await executeBulkDeleteRecords(args);
          case 'query_syslog':
            return await executeQuerySyslog(args);
          case 'get_system_properties':
            return await executeGetSystemProperties(args);
          case 'get_instance_health':
            return await executeGetInstanceHealth(args);
          case 'create_scheduled_job':
            return await executeCreateScheduledJob(args);
          case 'assess_database_health':
            return await executeAssessDatabaseHealth(args);
          default:
            logger.error(`Unknown tool: ${name}`);
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        logger.error(`Error executing tool ${name}:`, error);
        throw error;
      }
    });

    // Register list resources handler
    server.setRequestHandler(ListResourcesRequestSchema, async () => {
      logger.debug('Handling ListResources request');
      return {
        resources: [
          {
            uri: INSTANCE_INFO_URI,
            name: 'Instance Information',
            description: 'ServiceNow instance metadata and connection details',
            mimeType: 'application/json'
          },
          {
            uri: COMMON_TABLES_URI,
            name: 'Common Tables',
            description: 'List of frequently used ServiceNow tables with their primary fields',
            mimeType: 'application/json'
          }
        ]
      };
    });

    // Register read resource handler
    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      logger.info(`Reading resource: ${uri}`);

      try {
        if (uri === INSTANCE_INFO_URI) {
          const resource = getInstanceInfo();
          return {
            contents: [
              {
                uri: resource.uri,
                mimeType: resource.mimeType,
                text: resource.text
              }
            ]
          };
        } else if (uri === COMMON_TABLES_URI) {
          const resource = getCommonTables();
          return {
            contents: [
              {
                uri: resource.uri,
                mimeType: resource.mimeType,
                text: resource.text
              }
            ]
          };
        } else {
          logger.error(`Unknown resource URI: ${uri}`);
          throw new Error(`Unknown resource: ${uri}`);
        }
      } catch (error) {
        logger.error(`Error reading resource ${uri}:`, error);
        throw error;
      }
    });

    // Create stdio transport
    logger.info('Creating stdio transport...');
    const transport = new StdioServerTransport();

    // Connect server to transport
    logger.info('Connecting server to transport...');
    await server.connect(transport);

    logger.info('='.repeat(50));
    logger.info('ServiceNow MCP Server started successfully');
    logger.info(`Instance: ${config.name} (${config.instance})`);
    logger.info(`Tools available: 33 (8 basic + 3 batch + 1 script + 3 CMDB + 2 events + 3 services + 3 IRE + 10 health-assessment)`);
    logger.info(`Resources available: 2`);
    logger.info('='.repeat(50));
  } catch (error) {
    logger.error('Failed to start ServiceNow MCP server:', error);
    process.exit(1);
  }
}

// Start the server
main();
