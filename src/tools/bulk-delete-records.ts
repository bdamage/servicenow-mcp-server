/**
 * Bulk Delete Records Tool
 * Deletes records matching a query in safe chunks using server-side script execution.
 * SOP 0 Priority 1: Aggressive Cleanup — chunked syslog deletion.
 *
 * SAFETY: dry_run defaults to true. Always review the count before setting dry_run=false.
 * Requires admin or script_debugger role (uses execute_script internally for server-side deletion).
 */

import { z } from 'zod';
import { getClient } from '../servicenow/client.js';
import { handleError, formatSuccess } from '../utils/error-handler.js';
import { tableNameSchema, queryStringSchema } from '../utils/validation.js';

const bulkDeleteRecordsSchema = z.object({
  table: tableNameSchema,
  query: z.string().min(1, 'query is required — a filter is mandatory to prevent accidental full-table deletion'),
  chunk_size: z.number().int().min(100).max(50000).default(10000)
    .describe('Number of records to delete per script execution call. Default: 10000.'),
  dry_run: z.boolean().default(true)
    .describe('SAFETY DEFAULT: true. Returns count of records that WOULD be deleted without deleting. Set false to actually delete.')
});

export type BulkDeleteRecordsInput = z.infer<typeof bulkDeleteRecordsSchema>;

export async function executeBulkDeleteRecords(args: unknown) {
  try {
    const params = bulkDeleteRecordsSchema.parse(args);
    const client = getClient();

    // Always get count first for transparency
    const countResult = await client.getAggregateCount(params.table, params.query);

    if (params.dry_run) {
      return formatSuccess({
        success: true,
        dry_run: true,
        table: params.table,
        query: params.query,
        records_matching: countResult.count,
        chunk_size: params.chunk_size,
        estimated_chunks: Math.ceil(countResult.count / params.chunk_size),
        message: `DRY RUN: ${countResult.count.toLocaleString()} records match the query in table "${params.table}". ` +
          `Set dry_run=false to delete in chunks of ${params.chunk_size.toLocaleString()}. ` +
          (countResult.count > 5000000
            ? `WARNING: ${countResult.count.toLocaleString()} records is a large deletion. ` +
              'Confirm this is intentional and that toxic jobs have been disabled first (SOP Priority 0).'
            : '')
      });
    }

    // Actual deletion via server-side script (much faster than REST per-record deletes)
    // Script deletes one chunk and returns how many were deleted
    // Escape single quotes and backslashes to prevent script injection
    const safeTable = params.table.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const safeQuery = params.query.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const script = [
      '(function() {',
      `  var gr = new GlideRecord('${safeTable}');`,
      `  gr.addEncodedQuery('${safeQuery}');`,
      `  gr.setLimit(${params.chunk_size});`,
      '  gr.query();',
      '  var count = 0;',
      '  while (gr.next()) {',
      '    gr.deleteRecord();',
      '    count++;',
      '  }',
      '  return count;',
      '})()'
    ].join('\n');

    let deleted: number;
    try {
      const scriptResult = await client.executeScript(script);
      // Result may be a number or string
      deleted = typeof scriptResult === 'number'
        ? scriptResult
        : parseInt(String(scriptResult), 10) || 0;
    } catch (scriptError: any) {
      return formatSuccess({
        success: false,
        dry_run: false,
        table: params.table,
        query: params.query,
        records_matching: countResult.count,
        deleted: 0,
        error: scriptError?.message ?? String(scriptError),
        note: 'Script execution failed. This tool requires admin or script_debugger role. ' +
          'Alternatively use the REST-based delete_record tool in a loop for smaller datasets.'
      });
    }

    // Count remaining for progress visibility
    const remaining = await client.getAggregateCount(params.table, params.query);

    return formatSuccess({
      success: true,
      dry_run: false,
      table: params.table,
      query: params.query,
      deleted_this_call: deleted,
      remaining: remaining.count,
      complete: remaining.count === 0,
      next_action: remaining.count > 0
        ? `${remaining.count.toLocaleString()} records remain. Call bulk_delete_records again with the same parameters to delete the next chunk.`
        : 'All matching records have been deleted.'
    });
  } catch (error) {
    return handleError(error, 'bulk_delete_records');
  }
}

export const bulkDeleteRecordsTool = {
  name: 'bulk_delete_records',
  description: [
    'Deletes records matching a query in chunks using server-side GlideRecord script execution.',
    'SAFETY: dry_run=true by default — always shows count before deleting.',
    'Designed for SOP 0 Priority 1 aggressive cleanup (e.g. deleting 15M+ syslog records).',
    'Each call deletes up to chunk_size records (default 10,000) then returns remaining count.',
    'Call repeatedly until remaining=0 for full cleanup, monitoring progress between calls.',
    'REQUIRES: admin or script_debugger role on the ServiceNow instance.',
    'WARNING: deletions are permanent. Disable toxic scheduled jobs (Priority 0) before running cleanup.'
  ].join(' '),
  inputSchema: {
    type: 'object',
    properties: {
      table: {
        type: 'string',
        description: 'Table to delete records from (e.g. "syslog", "syslog0000", "sys_flow_context")'
      },
      query: {
        type: 'string',
        description: 'Encoded query to filter which records to delete. REQUIRED — prevents accidental full-table wipe. Example: "sys_created_on<javascript:gs.daysAgoStart(7)" to delete records older than 7 days.'
      },
      chunk_size: {
        type: 'number',
        description: 'Records to delete per call (100–50000). Default: 10000. Smaller chunks are safer; larger chunks are faster.',
        default: 10000
      },
      dry_run: {
        type: 'boolean',
        description: 'SAFETY DEFAULT: true. Returns record count without deleting. Set to false only after reviewing the count.',
        default: true
      }
    },
    required: ['table', 'query']
  }
};
