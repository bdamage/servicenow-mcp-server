/**
 * Error handling utilities for MCP tool responses
 */

import { z } from 'zod';

/**
 * Formats errors for MCP tool responses
 * @param error The error to format
 * @param toolName Name of the tool that encountered the error
 * @returns MCP-formatted error response
 */
export function handleError(error: unknown, toolName: string) {
  let errorMessage: string;

  if (error instanceof z.ZodError) {
    // Zod validation errors
    const issues = error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`);
    errorMessage = `Validation error in ${toolName}:\n${issues.join('\n')}`;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  } else {
    errorMessage = String(error);
  }

  return {
    content: [
      {
        type: 'text',
        text: `Error: ${errorMessage}`
      }
    ],
    isError: true
  };
}

/**
 * Formats successful tool responses
 */
export function formatSuccess(data: any) {
  return {
    content: [
      {
        type: 'text',
        text: typeof data === 'string' ? data : JSON.stringify(data, null, 2)
      }
    ]
  };
}
