/**
 * Create Service Tool
 * Create a business or technical service with criticality and service offerings
 */

import { z } from 'zod';
import { getClient } from '../servicenow/client.js';
import { handleError, formatSuccess } from '../utils/error-handler.js';

// Input schema for create-service tool
const createServiceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  service_classification: z.enum(['Business Service', 'Technical Service', 'Service Offering', 'Application Service']).default('Business Service'),
  business_criticality: z.enum(['1', '2', '3', '4', '5']).default('3'), // 1=Mission Critical, 2=High, 3=Medium, 4=Low, 5=Planning
  operational_status: z.enum(['1', '2', '3', '4', '5', '6']).default('1'), // 1=Operational, 2=Non-Operational, etc.
  owned_by: z.string().optional(), // sys_id of owner
  managed_by: z.string().optional(), // sys_id of managing group
  parent_service: z.string().optional(), // sys_id of parent service
  service_owner: z.string().optional(), // Username or sys_id
  support_group: z.string().optional(), // Support group name
  used_for: z.enum(['Production', 'Staging', 'QA', 'Development', 'Disaster Recovery']).optional(),
  version: z.string().optional()
});

export type CreateServiceInput = z.infer<typeof createServiceSchema>;

/**
 * Execute create-service tool
 */
export async function executeCreateService(args: unknown) {
  try {
    // Validate inputs
    const params = createServiceSchema.parse(args);

    // Get ServiceNow client
    const client = getClient();

    // Build service data
    const serviceData: any = {
      name: params.name,
      service_classification: params.service_classification,
      busines_criticality: params.business_criticality,
      operational_status: params.operational_status
    };

    if (params.description) serviceData.short_description = params.description;
    if (params.owned_by) serviceData.owned_by = params.owned_by;
    if (params.managed_by) serviceData.managed_by = params.managed_by;
    if (params.parent_service) serviceData.parent = params.parent_service;
    if (params.version) serviceData.version = params.version;
    if (params.used_for) serviceData.used_for = params.used_for;

    // If service_owner is provided, look up the user
    if (params.service_owner) {
      try {
        const userResponse = await client.query('sys_user', {
          sysparm_query: `user_name=${params.service_owner}^ORsys_id=${params.service_owner}`,
          sysparm_limit: 1,
          sysparm_fields: 'sys_id'
        });

        if (userResponse.result.length > 0) {
          serviceData.service_owner = userResponse.result[0].sys_id;
        }
      } catch (err) {
        // Continue without service owner if lookup fails
      }
    }

    // If support_group is provided, look it up
    if (params.support_group) {
      try {
        const groupResponse = await client.query('sys_user_group', {
          sysparm_query: `name=${params.support_group}`,
          sysparm_limit: 1,
          sysparm_fields: 'sys_id'
        });

        if (groupResponse.result.length > 0) {
          serviceData.support_group = groupResponse.result[0].sys_id;
        }
      } catch (err) {
        // Continue without support group if lookup fails
      }
    }

    // Create service
    const response = await client.create('cmdb_ci_service', serviceData);

    // Format response
    return formatSuccess({
      success: true,
      service_sys_id: response.result.sys_id,
      service: response.result,
      message: 'Service created successfully. You can now link CIs to this service.'
    });
  } catch (error) {
    return handleError(error, 'create_service');
  }
}

// Tool schema for MCP registration
export const createServiceTool = {
  name: 'create_service',
  description: 'Create a business or technical service in the CMDB with criticality, classification, and ownership. Services can be linked to CIs and service offerings.',
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Service name (required)'
      },
      description: {
        type: 'string',
        description: 'Service description'
      },
      service_classification: {
        type: 'string',
        enum: ['Business Service', 'Technical Service', 'Service Offering', 'Application Service'],
        description: 'Type of service (default: Business Service)',
        default: 'Business Service'
      },
      business_criticality: {
        type: 'string',
        enum: ['1', '2', '3', '4', '5'],
        description: '1=Mission Critical, 2=High, 3=Medium, 4=Low, 5=Planning (default: 3)',
        default: '3'
      },
      operational_status: {
        type: 'string',
        enum: ['1', '2', '3', '4', '5', '6'],
        description: '1=Operational, 2=Non-Operational, 3=Repair in Progress, etc. (default: 1)',
        default: '1'
      },
      owned_by: {
        type: 'string',
        description: 'sys_id of service owner'
      },
      managed_by: {
        type: 'string',
        description: 'sys_id of managing group'
      },
      parent_service: {
        type: 'string',
        description: 'sys_id of parent service (for service hierarchies)'
      },
      service_owner: {
        type: 'string',
        description: 'Username or sys_id of service owner'
      },
      support_group: {
        type: 'string',
        description: 'Name of support group responsible for this service'
      },
      used_for: {
        type: 'string',
        enum: ['Production', 'Staging', 'QA', 'Development', 'Disaster Recovery'],
        description: 'Service environment/purpose'
      },
      version: {
        type: 'string',
        description: 'Service version'
      }
    },
    required: ['name']
  }
};
