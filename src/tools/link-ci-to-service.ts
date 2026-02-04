/**
 * Link CI to Service Tool
 * Create a relationship between a Configuration Item and a Service
 */

import { z } from 'zod';
import { getClient } from '../servicenow/client.js';
import { handleError, formatSuccess } from '../utils/error-handler.js';
import { sysIdSchema } from '../utils/validation.js';

// Input schema for link-ci-to-service tool
const linkCiToServiceSchema = z.object({
  service_sys_id: sysIdSchema,
  ci_sys_id: sysIdSchema,
  relationship_type: z.string().default('Depends On::Used By')
});

export type LinkCiToServiceInput = z.infer<typeof linkCiToServiceSchema>;

/**
 * Execute link-ci-to-service tool
 */
export async function executeLinkCiToService(args: unknown) {
  try {
    // Validate inputs
    const params = linkCiToServiceSchema.parse(args);

    // Get ServiceNow client
    const client = getClient();

    // Verify service exists
    const serviceResponse = await client.get('cmdb_ci_service', params.service_sys_id, {
      sysparm_fields: 'sys_id,name,service_classification,busines_criticality'
    });

    // Verify CI exists
    const ciResponse = await client.get('cmdb_ci', params.ci_sys_id, {
      sysparm_fields: 'sys_id,name,sys_class_name'
    });

    // Check if relationship already exists
    const existingRelResponse = await client.query('cmdb_rel_ci', {
      sysparm_query: `parent.sys_id=${params.service_sys_id}^child.sys_id=${params.ci_sys_id}`,
      sysparm_limit: 1
    });

    if (existingRelResponse.result.length > 0) {
      return formatSuccess({
        success: true,
        message: 'Relationship already exists',
        relationship_sys_id: existingRelResponse.result[0].sys_id,
        relationship: existingRelResponse.result[0]
      });
    }

    // Create relationship
    const relationshipData: any = {
      parent: params.service_sys_id,
      child: params.ci_sys_id,
      type: params.relationship_type
    };

    const relResponse = await client.create('cmdb_rel_ci', relationshipData);

    // Format response
    return formatSuccess({
      success: true,
      relationship_sys_id: (relResponse.result as any).sys_id,
      service: {
        sys_id: serviceResponse.result.sys_id,
        name: serviceResponse.result.name,
        criticality: serviceResponse.result.busines_criticality
      },
      ci: {
        sys_id: ciResponse.result.sys_id,
        name: ciResponse.result.name,
        class: ciResponse.result.sys_class_name
      },
      relationship: relResponse.result,
      message: 'CI successfully linked to service'
    });
  } catch (error) {
    return handleError(error, 'link_ci_to_service');
  }
}

// Tool schema for MCP registration
export const linkCiToServiceTool = {
  name: 'link_ci_to_service',
  description: 'Create a relationship between a Configuration Item and a Service in the CMDB. This defines service dependencies on infrastructure.',
  inputSchema: {
    type: 'object',
    properties: {
      service_sys_id: {
        type: 'string',
        description: 'sys_id of the service'
      },
      ci_sys_id: {
        type: 'string',
        description: 'sys_id of the Configuration Item to link'
      },
      relationship_type: {
        type: 'string',
        description: 'Relationship type (default: "Depends On::Used By")',
        default: 'Depends On::Used By'
      }
    },
    required: ['service_sys_id', 'ci_sys_id']
  }
};
