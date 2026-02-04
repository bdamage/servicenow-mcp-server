/**
 * Get CI Relationships Tool
 * Retrieve all relationships for a Configuration Item (CI)
 */

import { z } from 'zod';
import { getClient } from '../servicenow/client.js';
import { handleError, formatSuccess } from '../utils/error-handler.js';
import { sysIdSchema } from '../utils/validation.js';

// Input schema for get-ci-relationships tool
const getCiRelationshipsSchema = z.object({
  ci_sys_id: sysIdSchema,
  relationship_type: z.enum(['parent', 'child', 'all']).default('all'),
  depth: z.number().min(1).max(3).default(1)
});

export type GetCiRelationshipsInput = z.infer<typeof getCiRelationshipsSchema>;

/**
 * Execute get-ci-relationships tool
 */
export async function executeGetCiRelationships(args: unknown) {
  try {
    // Validate inputs
    const params = getCiRelationshipsSchema.parse(args);

    // Get ServiceNow client
    const client = getClient();

    // Get the CI details first
    const ciResponse = await client.get('cmdb_ci', params.ci_sys_id);
    const ci = ciResponse.result;

    // Query relationships from cmdb_rel_ci table
    let relationshipQuery = '';
    if (params.relationship_type === 'parent') {
      relationshipQuery = `child.sys_id=${params.ci_sys_id}`;
    } else if (params.relationship_type === 'child') {
      relationshipQuery = `parent.sys_id=${params.ci_sys_id}`;
    } else {
      relationshipQuery = `parent.sys_id=${params.ci_sys_id}^ORchild.sys_id=${params.ci_sys_id}`;
    }

    const relationshipsResponse = await client.query('cmdb_rel_ci', {
      sysparm_query: relationshipQuery,
      sysparm_fields: 'parent,child,type,sys_id',
      sysparm_limit: 1000
    });

    // Get related CIs details
    const relatedCiIds = new Set<string>();
    relationshipsResponse.result.forEach((rel: any) => {
      if (rel.parent?.value && rel.parent.value !== params.ci_sys_id) {
        relatedCiIds.add(rel.parent.value);
      }
      if (rel.child?.value && rel.child.value !== params.ci_sys_id) {
        relatedCiIds.add(rel.child.value);
      }
    });

    // Get details for related CIs
    const relatedCis: any[] = [];
    if (relatedCiIds.size > 0) {
      const ciIdsArray = Array.from(relatedCiIds);
      const ciDetailsResponse = await client.query('cmdb_ci', {
        sysparm_query: `sys_idIN${ciIdsArray.join(',')}`,
        sysparm_fields: 'sys_id,name,sys_class_name,operational_status,u_environment',
        sysparm_limit: 1000
      });
      relatedCis.push(...ciDetailsResponse.result);
    }

    // Format response
    return formatSuccess({
      success: true,
      ci: {
        sys_id: ci.sys_id,
        name: ci.name,
        class: ci.sys_class_name,
        status: ci.operational_status
      },
      relationships: {
        count: relationshipsResponse.result.length,
        items: relationshipsResponse.result
      },
      related_cis: {
        count: relatedCis.length,
        items: relatedCis
      }
    });
  } catch (error) {
    return handleError(error, 'get_ci_relationships');
  }
}

// Tool schema for MCP registration
export const getCiRelationshipsTool = {
  name: 'get_ci_relationships',
  description: 'Get all relationships for a Configuration Item (CI) from the CMDB. Shows parent, child, or all relationships with details about related CIs.',
  inputSchema: {
    type: 'object',
    properties: {
      ci_sys_id: {
        type: 'string',
        description: 'The sys_id of the Configuration Item'
      },
      relationship_type: {
        type: 'string',
        enum: ['parent', 'child', 'all'],
        description: 'Type of relationships to retrieve (default: all)',
        default: 'all'
      },
      depth: {
        type: 'number',
        description: 'Depth of relationship traversal (1-3, default: 1)',
        default: 1
      }
    },
    required: ['ci_sys_id']
  }
};
