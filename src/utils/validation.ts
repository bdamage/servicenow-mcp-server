/**
 * Input validation utilities using Zod
 */

import { z } from 'zod';

/**
 * Validates ServiceNow table names
 * - Must be non-empty
 * - Alphanumeric with underscores
 */
export const tableNameSchema = z.string()
  .min(1, 'Table name is required')
  .regex(/^[a-zA-Z0-9_]+$/, 'Table name must contain only letters, numbers, and underscores');

/**
 * Validates ServiceNow sys_id format
 * - Must be 32 characters
 * - Hexadecimal characters only
 */
export const sysIdSchema = z.string()
  .length(32, 'sys_id must be exactly 32 characters')
  .regex(/^[a-fA-F0-9]+$/, 'sys_id must contain only hexadecimal characters');

/**
 * Validates query strings
 * - Optional string
 */
export const queryStringSchema = z.string().optional();

/**
 * Validates field lists
 * - Comma-separated field names
 */
export const fieldListSchema = z.string()
  .regex(/^[a-zA-Z0-9_,]+$/, 'Fields must be comma-separated alphanumeric names')
  .optional();

/**
 * Validates pagination limit
 * - Between 1 and 1000
 */
export const limitSchema = z.number()
  .int('Limit must be an integer')
  .min(1, 'Limit must be at least 1')
  .max(1000, 'Limit cannot exceed 1000')
  .default(100);

/**
 * Validates pagination offset
 * - Non-negative integer
 */
export const offsetSchema = z.number()
  .int('Offset must be an integer')
  .min(0, 'Offset must be non-negative')
  .default(0);

/**
 * Validates record data
 * - Must be an object
 */
export const recordDataSchema = z.record(z.any());

/**
 * Validates CI class name
 * - Must start with cmdb_ci
 */
export const ciClassNameSchema = z.string()
  .min(1, 'CI class name is required')
  .regex(/^cmdb_ci/, 'CI class must start with "cmdb_ci"');

/**
 * Validates data source name
 * - Alphanumeric with dashes/underscores
 */
export const dataSourceSchema = z.string()
  .min(1, 'Data source is required')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Data source must be alphanumeric with dashes/underscores');

/**
 * Validates IRE relation structure
 */
export const ireRelationSchema = z.object({
  type: z.string().min(1, 'Relation type is required'),
  target: z.string().min(1, 'Relation target is required'),
  properties: recordDataSchema.optional()
});

/**
 * Validates IRE item structure
 */
export const ireItemSchema = z.object({
  className: ciClassNameSchema,
  values: recordDataSchema,
  internal_id: z.string().optional(),
  sys_object_source_info: z.object({
    source: z.string()
  }).optional(),
  relations: z.array(ireRelationSchema).optional(),
  referenceItems: z.array(z.any()).optional()
});

/**
 * Validates batch IRE items
 * - Between 1 and 100 items
 */
export const ireBatchItemsSchema = z.array(ireItemSchema)
  .min(1, 'At least one item is required')
  .max(100, 'Maximum 100 items per batch');
