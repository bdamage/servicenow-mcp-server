/**
 * Execute Script Tool
 * Execute server-side JavaScript code on the ServiceNow instance
 *
 * SECURITY WARNING: This tool requires admin or script_debugger role
 * Use with caution as it can modify data and execute arbitrary code
 */

import { z } from 'zod';
import { getClient } from '../servicenow/client.js';
import { handleError, formatSuccess } from '../utils/error-handler.js';
import { logger } from '../utils/logger.js';

// Input schema for execute-script tool
const executeScriptSchema = z.object({
  script: z.string()
    .min(1, 'Script cannot be empty')
    .max(100000, 'Script exceeds maximum length of 100,000 characters'),
  description: z.string()
    .optional()
    .describe('Optional description of what this script does (for logging purposes)')
});

export type ExecuteScriptInput = z.infer<typeof executeScriptSchema>;

/**
 * Execute execute-script tool
 */
export async function executeExecuteScript(args: unknown) {
  try {
    // Validate inputs
    const params = executeScriptSchema.parse(args);

    // Log script execution (truncate for logging)
    const scriptPreview = params.script.length > 200
      ? params.script.substring(0, 200) + '...'
      : params.script;

    logger.info('Executing background script');
    if (params.description) {
      logger.info(`Script description: ${params.description}`);
    }
    logger.debug(`Script preview: ${scriptPreview}`);

    // Get ServiceNow client
    const client = getClient();

    // Execute the script
    const result = await client.executeScript(params.script);

    // Format response
    return formatSuccess({
      success: true,
      result: result,
      script_length: params.script.length,
      description: params.description
    });
  } catch (error) {
    // Enhanced error handling for script execution
    if (error instanceof Error) {
      // Check for permission errors
      if (error.message.includes('Forbidden') || error.message.includes('403')) {
        return handleError(
          new Error(
            'Script execution failed: User lacks required permissions. ' +
            'The ServiceNow user must have the "admin" or "script_debugger" role to execute scripts.'
          ),
          'execute_script'
        );
      }
    }
    return handleError(error, 'execute_script');
  }
}

// Tool schema for MCP registration
export const executeScriptTool = {
  name: 'execute_script',
  description: `Execute server-side JavaScript code on the ServiceNow instance. This allows running background scripts for complex operations, data analysis, calling Script Includes, or administrative tasks.

⚠️ SECURITY WARNING: This tool requires the ServiceNow user to have the "admin" or "script_debugger" role. Scripts execute with the permissions of the authenticated user and can modify data.

Common use cases:
- Complex GlideRecord queries that go beyond Table API capabilities
- Calling existing Script Includes or Business Rules
- Data manipulation and bulk updates with custom logic
- System diagnostics and health checks
- Custom calculations and reporting
- Testing and debugging

Available APIs in scripts:
- GlideRecord for database operations
- GlideSystem (gs) for system operations
- All standard ServiceNow server-side APIs
- Custom Script Includes defined in your instance

Example scripts:
1. Count records: "var gr = new GlideRecord('incident'); gr.query(); gr.getRowCount();"
2. Call Script Include: "var util = new MyCustomUtil(); util.performAction();"
3. Complex query: "var gr = new GlideRecord('incident'); gr.addQuery('priority', '1'); gr.query(); var results = []; while(gr.next()) { results.push(gr.getValue('number')); } results;"`,
  inputSchema: {
    type: 'object',
    properties: {
      script: {
        type: 'string',
        description: 'Server-side JavaScript code to execute. Can include GlideRecord queries, Script Include calls, and other ServiceNow server-side APIs. The last expression value will be returned as the result.'
      },
      description: {
        type: 'string',
        description: 'Optional description of what this script does (for logging and audit purposes)'
      }
    },
    required: ['script']
  }
};
