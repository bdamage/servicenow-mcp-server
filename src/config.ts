/**
 * Configuration management for ServiceNow MCP Server
 * Validates and normalizes environment variables
 */

export interface ServiceNowConfig {
  instance: string;
  username: string;
  password: string;
  name: string;
}

/**
 * Normalizes the ServiceNow instance URL
 * - Adds https:// if missing
 * - Removes trailing slash
 */
function normalizeInstanceUrl(url: string): string {
  let normalized = url.trim();

  // Add https:// if no protocol specified
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = `https://${normalized}`;
  }

  // Remove trailing slash
  if (normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

/**
 * Loads and validates configuration from environment variables
 * Throws error if required variables are missing
 */
export function loadConfig(): ServiceNowConfig {
  const instance = process.env.SERVICENOW_INSTANCE;
  const username = process.env.SERVICENOW_USERNAME;
  const password = process.env.SERVICENOW_PASSWORD;
  const name = process.env.NAME;

  // Validate required environment variables
  const missing: string[] = [];

  if (!instance) missing.push('SERVICENOW_INSTANCE');
  if (!username) missing.push('SERVICENOW_USERNAME');
  if (!password) missing.push('SERVICENOW_PASSWORD');
  if (!name) missing.push('NAME');

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please set these variables in your MCP server configuration.'
    );
  }

  // TypeScript doesn't know these are non-undefined after the check, so we use non-null assertion
  return {
    instance: normalizeInstanceUrl(instance!),
    username: username!,
    password: password!,
    name: name!
  };
}
