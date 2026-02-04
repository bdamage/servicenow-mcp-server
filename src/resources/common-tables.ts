/**
 * Common Tables Resource
 * Provides a list of frequently used ServiceNow tables
 */

export const COMMON_TABLES_URI = 'servicenow://tables/common';

const commonTables = [
  {
    name: 'incident',
    label: 'Incident',
    description: 'IT incidents and service disruptions',
    primaryFields: ['number', 'short_description', 'priority', 'state', 'assigned_to', 'assignment_group']
  },
  {
    name: 'sys_user',
    label: 'User',
    description: 'System users',
    primaryFields: ['user_name', 'first_name', 'last_name', 'email', 'active', 'title', 'department']
  },
  {
    name: 'sys_user_group',
    label: 'Group',
    description: 'User groups and assignment groups',
    primaryFields: ['name', 'description', 'type', 'active', 'manager']
  },
  {
    name: 'change_request',
    label: 'Change Request',
    description: 'Change management records',
    primaryFields: ['number', 'short_description', 'priority', 'state', 'type', 'risk', 'impact']
  },
  {
    name: 'problem',
    label: 'Problem',
    description: 'Problem management records',
    primaryFields: ['number', 'short_description', 'priority', 'state', 'assigned_to']
  },
  {
    name: 'cmdb_ci',
    label: 'Configuration Item',
    description: 'Configuration items from the CMDB',
    primaryFields: ['name', 'asset_tag', 'serial_number', 'sys_class_name', 'operational_status']
  },
  {
    name: 'kb_knowledge',
    label: 'Knowledge Article',
    description: 'Knowledge base articles',
    primaryFields: ['number', 'short_description', 'text', 'workflow_state', 'author']
  },
  {
    name: 'task',
    label: 'Task',
    description: 'Generic task records (parent of incident, change, etc.)',
    primaryFields: ['number', 'short_description', 'priority', 'state', 'assigned_to']
  },
  {
    name: 'sc_request',
    label: 'Service Catalog Request',
    description: 'Service catalog requests',
    primaryFields: ['number', 'short_description', 'state', 'requested_for', 'request_state']
  },
  {
    name: 'sc_req_item',
    label: 'Requested Item',
    description: 'Individual items from service catalog requests',
    primaryFields: ['number', 'short_description', 'state', 'request']
  }
];

/**
 * Get common tables information
 */
export function getCommonTables() {
  return {
    uri: COMMON_TABLES_URI,
    mimeType: 'application/json',
    text: JSON.stringify({
      description: 'Frequently used ServiceNow tables',
      count: commonTables.length,
      tables: commonTables
    }, null, 2)
  };
}
