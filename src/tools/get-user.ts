/**
 * Get User Tool
 * Retrieve user information by username or sys_id
 */

import { z } from 'zod';
import { getClient } from '../servicenow/client.js';
import { handleError, formatSuccess } from '../utils/error-handler.js';
import { fieldListSchema } from '../utils/validation.js';

// Input schema for get-user tool
const getUserSchema = z.object({
  identifier: z.string().min(1, 'User identifier is required'),
  fields: fieldListSchema
});

export type GetUserInput = z.infer<typeof getUserSchema>;

/**
 * Execute get-user tool
 */
export async function executeGetUser(args: unknown) {
  try {
    // Validate inputs
    const params = getUserSchema.parse(args);

    // Get ServiceNow client
    const client = getClient();

    // Build query parameters
    const queryParams: any = {
      sysparm_limit: 1
    };

    if (params.fields) {
      queryParams.sysparm_fields = params.fields;
    }

    // Check if identifier is a sys_id (32-character hex) or username
    const isSysId = /^[a-fA-F0-9]{32}$/.test(params.identifier);

    let response;
    if (isSysId) {
      // Get by sys_id
      response = await client.get('sys_user', params.identifier, queryParams);
      return formatSuccess({
        success: true,
        user: response.result
      });
    } else {
      // Query by username
      queryParams.sysparm_query = `user_name=${params.identifier}`;
      const queryResponse = await client.query('sys_user', queryParams);

      if (queryResponse.result.length === 0) {
        return formatSuccess({
          success: false,
          message: `No user found with username: ${params.identifier}`
        });
      }

      return formatSuccess({
        success: true,
        user: queryResponse.result[0]
      });
    }
  } catch (error) {
    return handleError(error, 'get_user');
  }
}

// Tool schema for MCP registration
export const getUserTool = {
  name: 'get_user',
  description: 'Retrieve ServiceNow user information by username or sys_id. Returns user details from the sys_user table.',
  inputSchema: {
    type: 'object',
    properties: {
      identifier: {
        type: 'string',
        description: 'Username (e.g., "admin") or sys_id (32-character hex string) of the user to retrieve'
      },
      fields: {
        type: 'string',
        description: 'Comma-separated list of fields to return. Optional. Returns all fields if not specified.'
      }
    },
    required: ['identifier']
  }
};
