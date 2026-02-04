/**
 * Create Event Tool
 * Create an event in ServiceNow Event Management for monitoring and alerting
 */

import { z } from 'zod';
import { getClient } from '../servicenow/client.js';
import { handleError, formatSuccess } from '../utils/error-handler.js';

// Input schema for create-event tool
const createEventSchema = z.object({
  source: z.string().min(1),
  node: z.string().min(1),
  type: z.string().optional(),
  resource: z.string().optional(),
  severity: z.enum(['0', '1', '2', '3', '4', '5']).default('3'), // 0=Clear, 1=Critical, 2=Major, 3=Minor, 4=Warning, 5=Info
  description: z.string().min(1),
  message_key: z.string().optional(),
  additional_info: z.string().optional(),
  ci_identifier: z.string().optional(),
  metric_name: z.string().optional(),
  metric_value: z.string().optional()
});

export type CreateEventInput = z.infer<typeof createEventSchema>;

/**
 * Execute create-event tool
 */
export async function executeCreateEvent(args: unknown) {
  try {
    // Validate inputs
    const params = createEventSchema.parse(args);

    // Get ServiceNow client
    const client = getClient();

    // Build event data
    const eventData: any = {
      source: params.source,
      node: params.node,
      severity: params.severity,
      description: params.description
    };

    if (params.type) eventData.type = params.type;
    if (params.resource) eventData.resource = params.resource;
    if (params.message_key) eventData.message_key = params.message_key;
    if (params.additional_info) eventData.additional_info = params.additional_info;
    if (params.ci_identifier) eventData.ci_identifier = params.ci_identifier;
    if (params.metric_name) eventData.metric_name = params.metric_name;
    if (params.metric_value) eventData.metric_value = params.metric_value;

    // Create event in em_event table
    const response = await client.create('em_event', eventData);

    // Format response
    return formatSuccess({
      success: true,
      event_sys_id: response.result.sys_id,
      event: response.result,
      message: 'Event created successfully. It will be processed by Event Management rules.'
    });
  } catch (error) {
    return handleError(error, 'create_event');
  }
}

// Tool schema for MCP registration
export const createEventTool = {
  name: 'create_event',
  description: 'Create an event in ServiceNow Event Management for monitoring, alerting, and automated incident creation. Events can trigger alerts and automation workflows.',
  inputSchema: {
    type: 'object',
    properties: {
      source: {
        type: 'string',
        description: 'Event source system (e.g., "Nagios", "Splunk", "Custom Monitor")'
      },
      node: {
        type: 'string',
        description: 'Source node/host name (e.g., "webserver01.company.com")'
      },
      type: {
        type: 'string',
        description: 'Event type (e.g., "CPU", "Disk", "Memory", "Network")'
      },
      resource: {
        type: 'string',
        description: 'Affected resource (e.g., "CPU Core 1", "/dev/sda1")'
      },
      severity: {
        type: 'string',
        enum: ['0', '1', '2', '3', '4', '5'],
        description: 'Severity: 0=Clear, 1=Critical, 2=Major, 3=Minor, 4=Warning, 5=Info (default: 3)',
        default: '3'
      },
      description: {
        type: 'string',
        description: 'Event description/message'
      },
      message_key: {
        type: 'string',
        description: 'Unique message key for event correlation'
      },
      additional_info: {
        type: 'string',
        description: 'Additional context or details (JSON string supported)'
      },
      ci_identifier: {
        type: 'string',
        description: 'CI identifier to link event to a Configuration Item'
      },
      metric_name: {
        type: 'string',
        description: 'Metric name (e.g., "cpu_utilization", "disk_usage")'
      },
      metric_value: {
        type: 'string',
        description: 'Metric value (e.g., "95%", "450ms")'
      }
    },
    required: ['source', 'node', 'description']
  }
};
