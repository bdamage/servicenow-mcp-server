/**
 * Get Impact Analysis Tool
 * Analyze the impact of a CI outage on dependent services and CIs
 */

import { z } from 'zod';
import { getClient } from '../servicenow/client.js';
import { handleError, formatSuccess } from '../utils/error-handler.js';
import { sysIdSchema } from '../utils/validation.js';

// Input schema for get-impact-analysis tool
const getImpactAnalysisSchema = z.object({
  ci_sys_id: sysIdSchema,
  include_services: z.boolean().default(true),
  max_depth: z.number().min(1).max(5).default(3)
});

export type GetImpactAnalysisInput = z.infer<typeof getImpactAnalysisSchema>;

/**
 * Execute get-impact-analysis tool
 */
export async function executeGetImpactAnalysis(args: unknown) {
  try {
    // Validate inputs
    const params = getImpactAnalysisSchema.parse(args);

    // Get ServiceNow client
    const client = getClient();

    // Get the source CI
    const ciResponse = await client.get('cmdb_ci', params.ci_sys_id, {
      sysparm_fields: 'sys_id,name,sys_class_name,operational_status,support_group,u_environment'
    });

    // Get all downstream dependencies (children)
    const dependenciesResponse = await client.query('cmdb_rel_ci', {
      sysparm_query: `parent.sys_id=${params.ci_sys_id}`,
      sysparm_fields: 'child,type,sys_id',
      sysparm_limit: 1000
    });

    // Get affected CIs
    const affectedCiIds = dependenciesResponse.result
      .map((rel: any) => rel.child?.value)
      .filter(Boolean);

    let affectedCis: any[] = [];
    if (affectedCiIds.length > 0) {
      const affectedResponse = await client.query('cmdb_ci', {
        sysparm_query: `sys_idIN${affectedCiIds.join(',')}`,
        sysparm_fields: 'sys_id,name,sys_class_name,operational_status,support_group',
        sysparm_limit: 1000
      });
      affectedCis = affectedResponse.result;
    }

    // Get related services if requested
    let affectedServices: any[] = [];
    if (params.include_services) {
      // Query service relationships
      const serviceRelResponse = await client.query('cmdb_rel_ci', {
        sysparm_query: `child.sys_id=${params.ci_sys_id}^parent.sys_class_nameLIKEcmdb_ci_service`,
        sysparm_fields: 'parent,type',
        sysparm_limit: 100
      });

      const serviceIds = serviceRelResponse.result
        .map((rel: any) => rel.parent?.value)
        .filter(Boolean);

      if (serviceIds.length > 0) {
        const servicesResponse = await client.query('cmdb_ci_service', {
          sysparm_query: `sys_idIN${serviceIds.join(',')}`,
          sysparm_fields: 'sys_id,name,busines_criticality,service_classification,operational_status',
          sysparm_limit: 100
        });
        affectedServices = servicesResponse.result;
      }
    }

    // Calculate impact summary
    const criticalCis = affectedCis.filter((ci: any) =>
      ci.operational_status === '1' // Operational
    ).length;

    const criticalServices = affectedServices.filter((svc: any) =>
      svc.busines_criticality === '1' || svc.busines_criticality === '2' // Mission Critical or High
    ).length;

    // Format response
    return formatSuccess({
      success: true,
      source_ci: {
        sys_id: ciResponse.result.sys_id,
        name: ciResponse.result.name,
        class: ciResponse.result.sys_class_name,
        status: ciResponse.result.operational_status
      },
      impact_summary: {
        total_affected_cis: affectedCis.length,
        critical_cis: criticalCis,
        total_affected_services: affectedServices.length,
        critical_services: criticalServices,
        risk_level: criticalServices > 0 ? 'HIGH' : affectedCis.length > 10 ? 'MEDIUM' : 'LOW'
      },
      affected_cis: affectedCis,
      affected_services: affectedServices,
      dependency_chain: dependenciesResponse.result
    });
  } catch (error) {
    return handleError(error, 'get_impact_analysis');
  }
}

// Tool schema for MCP registration
export const getImpactAnalysisTool = {
  name: 'get_impact_analysis',
  description: 'Analyze the potential impact of a CI outage on dependent services and configuration items. Provides risk assessment and identifies critical affected services.',
  inputSchema: {
    type: 'object',
    properties: {
      ci_sys_id: {
        type: 'string',
        description: 'The sys_id of the Configuration Item to analyze'
      },
      include_services: {
        type: 'boolean',
        description: 'Include affected business services in analysis (default: true)',
        default: true
      },
      max_depth: {
        type: 'number',
        description: 'Maximum depth of dependency traversal (1-5, default: 3)',
        default: 3
      }
    },
    required: ['ci_sys_id']
  }
};
