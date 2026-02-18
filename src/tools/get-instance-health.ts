/**
 * Get Instance Health Tool
 * Provides a consolidated health snapshot: version, node count, cluster state, and key metrics.
 * SOP 0 Section 1: Instance Connection & Identification.
 */

import { z } from 'zod';
import { getClient } from '../servicenow/client.js';
import { handleError, formatSuccess } from '../utils/error-handler.js';

const getInstanceHealthSchema = z.object({
  include_node_details: z.boolean().default(true)
    .describe('Include per-node cluster state details. Default: true.'),
  include_upgrade_history: z.boolean().default(true)
    .describe('Include recent upgrade/patch history. Default: true.')
});

export type GetInstanceHealthInput = z.infer<typeof getInstanceHealthSchema>;

// Known property names that carry version/build information
const VERSION_PROPERTY_NAMES = [
  'glide.buildtag',
  'glide.war.name',
  'glide.build.date',
  'glide.build.name'
];

export async function executeGetInstanceHealth(args: unknown) {
  try {
    const params = getInstanceHealthSchema.parse(args);
    const client = getClient();

    const clientInfo = client.getInstanceInfo();
    const assessmentTimestamp = new Date().toISOString();

    // Run all lookups in parallel for speed
    const [versionResult, clusterResult, upgradeResult] = await Promise.allSettled([
      // Version properties
      client.query('sys_properties', {
        sysparm_query: `name=${VERSION_PROPERTY_NAMES.join('^ORname=')}`,
        sysparm_fields: 'name,value',
        sysparm_limit: 10
      }),
      // Cluster state (nodes)
      params.include_node_details
        ? client.query('sys_cluster_state', {
            sysparm_fields: 'node_id,system_id,last_updated,status,created_on',
            sysparm_orderby: 'node_id',
            sysparm_limit: 50
          })
        : Promise.resolve(null),
      // Recent upgrade history
      params.include_upgrade_history
        ? client.query('sys_upgrade_history', {
            sysparm_fields: 'to_version,from_version,state,start_date,end_date,description',
            sysparm_orderby: 'start_date',
            sysparm_order_direction: 'desc',
            sysparm_limit: 5
          })
        : Promise.resolve(null)
    ]);

    // Parse version info
    const versionProperties: Record<string, string> = {};
    if (versionResult.status === 'fulfilled' && versionResult.value) {
      for (const prop of versionResult.value.result) {
        versionProperties[(prop as any).name] = (prop as any).value;
      }
    }

    // Parse cluster/node info
    let nodeInfo: any = null;
    if (params.include_node_details && clusterResult.status === 'fulfilled' && clusterResult.value) {
      const nodes = (clusterResult.value as any).result ?? [];
      const now = Date.now();
      const parsedNodes = nodes.map((n: any) => {
        const lastUpdated = new Date(n.last_updated);
        const staleSecs = Math.floor((now - lastUpdated.getTime()) / 1000);
        return {
          node_id: n.node_id,
          system_id: n.system_id,
          status: n.status ?? 'unknown',
          last_heartbeat: n.last_updated,
          stale_seconds: staleSecs,
          healthy: staleSecs < 120  // Node is healthy if heartbeat < 2 minutes old
        };
      });

      nodeInfo = {
        total_nodes: parsedNodes.length,
        healthy_nodes: parsedNodes.filter((n: any) => n.healthy).length,
        nodes: parsedNodes
      };
    }

    // Parse upgrade history
    let upgradeHistory: any[] = [];
    if (params.include_upgrade_history && upgradeResult.status === 'fulfilled' && upgradeResult.value) {
      upgradeHistory = ((upgradeResult.value as any).result ?? []).map((u: any) => ({
        to_version: u.to_version,
        from_version: u.from_version,
        state: u.state,
        started: u.start_date,
        completed: u.end_date
      }));
    }

    // Build health summary
    const currentVersion = versionProperties['glide.buildtag']
      ?? versionProperties['glide.war.name']
      ?? versionProperties['glide.build.name']
      ?? 'unknown';

    const allNodesHealthy = nodeInfo
      ? nodeInfo.healthy_nodes === nodeInfo.total_nodes
      : null;

    const healthStatus = allNodesHealthy === false
      ? '⚠️ DEGRADED — some nodes are not reporting healthy heartbeats'
      : '✅ OPERATIONAL';

    return formatSuccess({
      success: true,
      assessment_timestamp: assessmentTimestamp,
      instance: {
        url: clientInfo.instance,
        status: healthStatus
      },
      version: {
        build_tag: versionProperties['glide.buildtag'] ?? 'unknown',
        war_name: versionProperties['glide.war.name'] ?? 'unknown',
        build_date: versionProperties['glide.build.date'] ?? 'unknown',
        build_name: versionProperties['glide.build.name'] ?? 'unknown',
        current_version: currentVersion
      },
      cluster: nodeInfo,
      upgrade_history: upgradeHistory,
      note: 'Use get_system_properties and query_syslog for deeper health analysis.'
    });
  } catch (error) {
    return handleError(error, 'get_instance_health');
  }
}

export const getInstanceHealthTool = {
  name: 'get_instance_health',
  description: [
    'Returns a consolidated instance health snapshot: ServiceNow version, node/cluster status, and upgrade history.',
    'SOP 0 Section 1: Run as the first step of every War Room Assessment to document instance identity.',
    'Queries sys_properties for build version, sys_cluster_state for node health,',
    'and sys_upgrade_history for recent patch activity.',
    'All sub-queries run in parallel for fast results.'
  ].join(' '),
  inputSchema: {
    type: 'object',
    properties: {
      include_node_details: {
        type: 'boolean',
        description: 'Include per-node cluster heartbeat status. Default: true.',
        default: true
      },
      include_upgrade_history: {
        type: 'boolean',
        description: 'Include recent 5 upgrade/patch records from sys_upgrade_history. Default: true.',
        default: true
      }
    },
    required: []
  }
};
