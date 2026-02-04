/**
 * Authentication utilities for ServiceNow REST API
 * Handles Basic Authentication
 */

/**
 * Generates Basic Authentication header
 * @param username ServiceNow username
 * @param password ServiceNow password
 * @returns Authorization header value
 */
export function generateBasicAuthHeader(username: string, password: string): string {
  const credentials = `${username}:${password}`;
  const encoded = Buffer.from(credentials).toString('base64');
  return `Basic ${encoded}`;
}
