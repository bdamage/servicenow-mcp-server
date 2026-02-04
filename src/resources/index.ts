/**
 * Resource exports
 */

export { INSTANCE_INFO_URI, getInstanceInfo } from './instance-info.js';
export { COMMON_TABLES_URI, getCommonTables } from './common-tables.js';

export const ALL_RESOURCE_URIS = [
  'servicenow://instance/info',
  'servicenow://tables/common'
] as const;

export type ResourceURI = typeof ALL_RESOURCE_URIS[number];
