import { NodeInstance } from './NodeInstance';
import { Connection } from './Connection';
import { WorkflowData } from './Workflow';
import { nodeRegistry } from '../registry/nodeRegistry';

export interface WorkflowFile {
  metadata: {
    schemaVersion: string;
    exportedAt: string;
    name?: string;
    description?: string;
    [key: string]: any;
  };
  nodes: {
    id: string;
    type: string;
    position: { x: number; y: number };
    size?: { width: number; height: number };
    parameters: Record<string, any>;
  }[];
  connections: {
    id: string;
    sourceNodeId: string;
    sourcePortId: string;
    targetNodeId: string;
    targetPortId: string;
  }[];
}

/**
 * Migration placeholder for schema version updates
 */
function migrateWorkflow(doc: any): any {
  // Schema version 0.0.0 -> 1.0.0 migration steps can be added here
  return doc;
}

/**
 * Serializes current workflow into a clean, portable WorkflowFile JSON structure
 */
export function serializeWorkflow(
  nodes: NodeInstance[],
  connections: Connection[],
  metadata?: any
): WorkflowFile {
  const serializedNodes = nodes.map((node) => {
    const def = nodeRegistry.get(node.type);
    const serializedParams: Record<string, any> = {};

    if (def) {
      for (const p of def.parameters) {
        // Exclude resource parameters (e.g. resourceId) and non-persisted parameters
        if (p.id === 'resourceId' || (p as any).persist === false || (p as any).resource === true) {
          continue;
        }
        if (node.parameters && node.parameters[p.id] !== undefined) {
          serializedParams[p.id] = node.parameters[p.id];
        } else {
          serializedParams[p.id] = p.defaultValue;
        }
      }
    } else if (node.parameters) {
      // Fallback for unregistered definition
      Object.keys(node.parameters).forEach((key) => {
        if (key !== 'resourceId') {
          serializedParams[key] = node.parameters[key];
        }
      });
    }

    return {
      id: node.id,
      type: node.type,
      position: { x: node.position.x, y: node.position.y },
      size: node.size ? { width: node.size.width, height: node.size.height } : undefined,
      parameters: serializedParams
    };
  });

  const serializedConnections = connections.map((conn) => ({
    id: conn.id,
    sourceNodeId: conn.sourceNodeId,
    sourcePortId: conn.sourcePortId,
    targetNodeId: conn.targetNodeId,
    targetPortId: conn.targetPortId
  }));

  return {
    metadata: {
      schemaVersion: '1.0.0',
      exportedAt: new Date().toISOString(),
      name: metadata?.name || 'Workflow Pipeline',
      description: metadata?.description
    },
    nodes: serializedNodes,
    connections: serializedConnections
  };
}

/**
 * Deserializes and sanitizes JSON string into a valid WorkflowData structure
 */
export function deserializeWorkflow(jsonText: string): WorkflowData {
  let parsed: any;
  try {
    parsed = JSON.parse(jsonText);
  } catch (err) {
    throw new Error('JSON 解析失败，请输入有效的 JSON 文本');
  }

  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.nodes)) {
    throw new Error('不是合法的工作流文件（缺失 nodes 数组）');
  }

  const migrated = migrateWorkflow(parsed);

  // 1. Filter out unregistered node types and sanitize parameters
  const validNodes: NodeInstance[] = [];

  for (const rawNode of migrated.nodes) {
    if (!rawNode || !rawNode.type || !rawNode.id) continue;

    const def = nodeRegistry.get(rawNode.type);
    if (!def) {
      console.warn(`[Deserialize] Skipping unknown node type: "${rawNode.type}" (id: ${rawNode.id})`);
      continue;
    }

    const importedParams = rawNode.parameters || {};
    const mergedParams: Record<string, any> = { ...importedParams };

    // Delete resourceId from imported parameters
    delete mergedParams.resourceId;

    // Validate parameters against definition
    for (const p of def.parameters) {
      if (p.id === 'resourceId') continue;

      let val = mergedParams[p.id];

      if (p.type === 'slider' || p.type === 'number') {
        if (val === undefined || typeof val !== 'number' || isNaN(val)) {
          val = p.defaultValue;
        }
        if (p.min !== undefined && val < p.min) val = p.min;
        if (p.max !== undefined && val > p.max) val = p.max;
      } else if (p.type === 'select') {
        const validOptions = p.options?.map((opt) => opt.value) || [];
        if (validOptions.length > 0 && !validOptions.includes(val)) {
          val = p.defaultValue;
        }
      } else if (p.type === 'boolean') {
        val = Boolean(val);
      } else if (p.type === 'string' || p.type === 'text' || p.type === 'color') {
        if (typeof val !== 'string') {
          val = String(p.defaultValue ?? '');
        }
      }

      mergedParams[p.id] = val;
    }

    validNodes.push({
      id: String(rawNode.id),
      type: String(rawNode.type),
      position: {
        x: typeof rawNode.position?.x === 'number' ? rawNode.position.x : 0,
        y: typeof rawNode.position?.y === 'number' ? rawNode.position.y : 0
      },
      size: rawNode.size && typeof rawNode.size.width === 'number' && typeof rawNode.size.height === 'number'
        ? { width: rawNode.size.width, height: rawNode.size.height }
        : undefined,
      parameters: mergedParams
    });
  }

  // 2. Clean dangling connections
  const validNodeMap = new Map<string, NodeInstance>();
  validNodes.forEach((n) => validNodeMap.set(n.id, n));

  const validConnections: Connection[] = [];
  const rawConnections = Array.isArray(migrated.connections) ? migrated.connections : [];

  for (const rawConn of rawConnections) {
    if (!rawConn || !rawConn.sourceNodeId || !rawConn.targetNodeId) continue;

    const sourceNode = validNodeMap.get(rawConn.sourceNodeId);
    const targetNode = validNodeMap.get(rawConn.targetNodeId);

    if (!sourceNode || !targetNode) continue;

    const sourceDef = nodeRegistry.get(sourceNode.type);
    const targetDef = nodeRegistry.get(targetNode.type);

    if (!sourceDef || !targetDef) continue;

    const hasSourcePort = sourceDef.outputs.some((p) => p.id === rawConn.sourcePortId);
    const hasTargetPort = targetDef.inputs.some((p) => p.id === rawConn.targetPortId);

    if (!hasSourcePort || !hasTargetPort) continue;

    validConnections.push({
      id: String(rawConn.id || `conn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`),
      sourceNodeId: String(rawConn.sourceNodeId),
      sourcePortId: String(rawConn.sourcePortId),
      targetNodeId: String(rawConn.targetNodeId),
      targetPortId: String(rawConn.targetPortId)
    });
  }

  return {
    metadata: migrated.metadata,
    nodes: validNodes,
    connections: validConnections
  };
}
