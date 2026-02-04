/**
 * Get Service Map Tool
 * Retrieve service topology including all related CIs, dependencies, and criticality
 */

import { z } from 'zod';
import { getClient } from '../servicenow/client.js';
import { handleError, formatSuccess } from '../utils/error-handler.js';
import { sysIdSchema } from '../utils/validation.js';

// Input schema for get-service-map tool
const getServiceMapSchema = z.object({
  service_sys_id: sysIdSchema,
  include_child_services: z.boolean().default(true),
  max_depth: z.number().min(1).max(5).default(3)
});

export type GetServiceMapInput = z.infer<typeof getServiceMapSchema>;

/**
 * Execute get-service-map tool
 */
export async function executeGetServiceMap(args: unknown) {
  try {
    // Validate inputs
    const params = getServiceMapSchema.parse(args);

    // Get ServiceNow client
    const client = getClient();

    // Get service details
    const serviceResponse = await client.get('cmdb_ci_service', params.service_sys_id, {
      sysparm_fields: 'sys_id,name,service_classification,busines_criticality,operational_status,service_owner,support_group,parent,used_for,version'
    });

    const service = serviceResponse.result;

    // Get all CIs related to this service
    const ciRelationshipsResponse = await client.query('cmdb_rel_ci', {
      sysparm_query: `parent.sys_id=${params.service_sys_id}`,
      sysparm_fields: 'child,type,sys_id',
      sysparm_limit: 1000
    });

    // Extract CI sys_ids
    const ciSysIds = ciRelationshipsResponse.result
      .map((rel: any) => rel.child?.value)
      .filter(Boolean);

    // Get CI details
    let relatedCis: any[] = [];
    if (ciSysIds.length > 0) {
      const cisResponse = await client.query('cmdb_ci', {
        sysparm_query: `sys_idIN${ciSysIds.join(',')}`,
        sysparm_fields: 'sys_id,name,sys_class_name,operational_status,support_group,u_environment',
        sysparm_limit: 1000
      });
      relatedCis = cisResponse.result;
    }

    // Get child services if requested
    let childServices: any[] = [];
    if (params.include_child_services) {
      const childServicesResponse = await client.query('cmdb_ci_service', {
        sysparm_query: `parent.sys_id=${params.service_sys_id}`,
        sysparm_fields: 'sys_id,name,service_classification,busines_criticality,operational_status',
        sysparm_limit: 100
      });
      childServices = childServicesResponse.result;
    }

    // Categorize CIs by class
    const cisByClass: { [key: string]: any[] } = {};
    relatedCis.forEach((ci: any) => {
      const className = ci.sys_class_name || 'unknown';
      if (!cisByClass[className]) {
        cisByClass[className] = [];
      }
      cisByClass[className].push(ci);
    });

    // Calculate health metrics
    const operationalCis = relatedCis.filter((ci: any) => ci.operational_status === '1').length;
    const healthPercentage = relatedCis.length > 0
      ? Math.round((operationalCis / relatedCis.length) * 100)
      : 100;

    // Format response
    return formatSuccess({
      success: true,
      service: {
        sys_id: service.sys_id,
        name: service.name,
        classification: service.service_classification,
        criticality: service.busines_criticality,
        criticality_label: getCriticalityLabel(service.busines_criticality),
        status: service.operational_status,
        owner: service.service_owner,
        support_group: service.support_group,
        used_for: service.used_for,
        version: service.version
      },
      topology: {
        total_cis: relatedCis.length,
        total_child_services: childServices.length,
        operational_cis: operationalCis,
        health_percentage: healthPercentage,
        cis_by_class: Object.keys(cisByClass).map(className => ({
          class: className,
          count: cisByClass[className].length,
          cis: cisByClass[className]
        }))
      },
      related_cis: relatedCis,
      child_services: childServices,
      relationships: ciRelationshipsResponse.result,
      risk_assessment: {
        level: service.busines_criticality === '1' || service.busines_criticality === '2' ? 'HIGH' : 'MEDIUM',
        reason: service.busines_criticality === '1'
          ? 'Mission critical service - outage would have severe business impact'
          : service.busines_criticality === '2'
            ? 'High criticality service - outage would significantly impact business'
            : 'Standard service criticality'
      }
    });
  } catch (error) {
    return handleError(error, 'get_service_map');
  }
}

/**
 * Helper to get criticality label
 */
function getCriticalityLabel(criticality: string): string {
  switch (criticality) {
    case '1': return 'Mission Critical';
    case '2': return 'High';
    case '3': return 'Medium';
    case '4': return 'Low';
    case '5': return 'Planning';
    default: return 'Unknown';
  }
}

// Tool schema for MCP registration
export const getServiceMapTool = {
  name: 'get_service_map',
  description: 'Get complete service topology including all related CIs, child services, dependencies, criticality assessment, and health metrics. Visualizes service architecture.',
  inputSchema: {
    type: 'object',
    properties: {
      service_sys_id: {
        type: 'string',
        description: 'sys_id of the service to map'
      },
      include_child_services: {
        type: 'boolean',
        description: 'Include child services in the map (default: true)',
        default: true
      },
      max_depth: {
        type: 'number',
        description: 'Maximum depth of service hierarchy to traverse (1-5, default: 3)',
        default: 3
      }
    },
    required: ['service_sys_id']
  }
};
