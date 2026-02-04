/**
 * Instance Info Resource
 * Provides ServiceNow instance metadata
 */

import { getClient } from '../servicenow/client.js';
import { loadConfig } from '../config.js';

export const INSTANCE_INFO_URI = 'servicenow://instance/info';

/**
 * Get instance information
 */
export function getInstanceInfo() {
  const config = loadConfig();
  const client = getClient();
  const instanceInfo = client.getInstanceInfo();

  return {
    uri: INSTANCE_INFO_URI,
    mimeType: 'application/json',
    text: JSON.stringify({
      name: config.name,
      instance: instanceInfo.instance,
      baseUrl: instanceInfo.baseUrl,
      apiVersion: 'now',
      description: 'ServiceNow instance connected to this MCP server'
    }, null, 2)
  };
}
