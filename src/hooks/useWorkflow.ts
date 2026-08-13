import { useState, useCallback, useEffect } from 'react';
import { NodeInstance } from '../core/NodeInstance';
import { Connection } from '../core/Connection';
import { WorkflowData } from '../core/Workflow';
import { nodeRegistry } from '../registry/nodeRegistry';
import { resourceStore } from '../core/ResourceStore';
import { workflowExecutor } from '../core/WorkflowExecutor';
import { useToast } from '../components/UI/ToastContainer';
import { useLanguage } from '../i18n/LanguageContext';
import { serializeWorkflow, deserializeWorkflow } from '../core/serialization';
import { prepareDemoWorkflow } from '../core/demoWorkflow';

export function useWorkflow() {
  const [nodes, setNodes] = useState<NodeInstance[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Global draftParams map for real-time draft state sharing
  const [draftParamsMap, setDraftParamsMapState] = useState<Record<string, Record<string, any>>>({});

  // Versioning state for propagation & edge coloring
  const [nodeVersions, setNodeVersions] = useState<Record<string, number>>({});
  const [lastConsumedVersions, setLastConsumedVersions] = useState<Record<string, Record<string, number>>>({});

  const [isInitializing, setIsInitializing] = useState(true);

  const { showToast } = useToast();
  const { t } = useLanguage();

  // Initialize ResourceStore & Load Demo Workflow (always)
  useEffect(() => {
    let isMounted = true;

    async function initWorkflow() {
      await resourceStore.init();

      // Always load Demo Workflow on page load/refresh
      try {
        const demoData = await prepareDemoWorkflow();
        if (isMounted) {
          setNodes(demoData.workflow.nodes);
          setConnections(demoData.workflow.connections);
          setNodeVersions(demoData.nodeVersions);
          setLastConsumedVersions(demoData.lastConsumedVersions);
          setIsInitializing(false);
        }
      } catch (err) {
        console.error('[initWorkflow] Failed to prepare demo workflow:', err);
        if (isMounted) setIsInitializing(false);
      }
    }

    initWorkflow();

    return () => {
      isMounted = false;
    };
  }, []);

  // Public method: Reload Demo Workflow on demand
  const loadDemoWorkflow = useCallback(async () => {
    try {
      const demoData = await prepareDemoWorkflow();
      setNodes(demoData.workflow.nodes);
      setConnections(demoData.workflow.connections);
      setSelectedNodeId(null);
      setDraftParamsMapState({});
      (window as any).__SUZU_DRAFT_PARAMS__ = {};
      setNodeVersions(demoData.nodeVersions);
      setLastConsumedVersions(demoData.lastConsumedVersions);
      showToast('演示工作流已加载！', 'success');
      return true;
    } catch (err) {
      console.error('Failed to load demo workflow:', err);
      showToast('加载演示工作流失败', 'error');
      return false;
    }
  }, [showToast]);

  const setDraftParams = useCallback((nodeId: string, params: Record<string, any>) => {
    setDraftParamsMapState((prev) => {
      const next = {
        ...prev,
        [nodeId]: params
      };
      (window as any).__SUZU_DRAFT_PARAMS__ = next;
      window.dispatchEvent(new CustomEvent('suzu_draft_updated', { detail: { nodeId, params } }));
      return next;
    });
  }, []);

  const getDraftParams = useCallback((nodeId: string | null): Record<string, any> | null => {
    if (!nodeId) return null;
    return draftParamsMap[nodeId] || (window as any).__SUZU_DRAFT_PARAMS__?.[nodeId] || null;
  }, [draftParamsMap]);

  const clearDraftParams = useCallback((nodeId: string) => {
    setDraftParamsMapState((prev) => {
      const next = { ...prev };
      delete next[nodeId];
      (window as any).__SUZU_DRAFT_PARAMS__ = next;
      window.dispatchEvent(new CustomEvent('suzu_draft_updated', { detail: { nodeId } }));
      return next;
    });
  }, []);

  // 查找某个节点的所有递归下游节点 (Downstream Node IDs BFS 追溯)
  const getDownstreamNodeIds = useCallback((startNodeId: string): Set<string> => {
    const activeConnections = (window as any).__SUZU_WORKFLOW_DATA__?.connections || connections;
    const downstream = new Set<string>();
    const queue = [startNodeId];

    while (queue.length > 0) {
      const currId = queue.shift()!;
      const outgoingConns = activeConnections.filter((c: Connection) => c.sourceNodeId === currId);
      for (const conn of outgoingConns) {
        if (!downstream.has(conn.targetNodeId)) {
          downstream.add(conn.targetNodeId);
          queue.push(conn.targetNodeId);
        }
      }
    }

    return downstream;
  }, [connections]);

  // 批量清除指定节点列表的 Dirty 标记
  const cleanNodesDirty = useCallback((nodeIdsToClean: string[]) => {
    const cleanSet = new Set(nodeIdsToClean);
    setNodes((prevNodes) =>
      prevNodes.map((node) => {
        if (cleanSet.has(node.id)) {
          return {
            ...node,
            dirty: false
          };
        }
        return node;
      })
    );
  }, []);

  // Record node execution version & update consumed upstream versions for target node
  const recordNodeExecuted = useCallback((nodeId: string) => {
    // 读取最新的 connections
    const currentConns = (window as any).__SUZU_WORKFLOW_DATA__?.connections || connections;

    setNodeVersions((prev) => {
      const currentVer = prev[nodeId] || 0;
      const nextVer = currentVer + 1;
      const updatedNodeVersions = {
        ...prev,
        [nodeId]: nextVer
      };

      setLastConsumedVersions((lastConsumedPrev) => {
        const incomingConns = currentConns.filter((c: Connection) => c.targetNodeId === nodeId);
        const targetConsumed = { ...(lastConsumedPrev[nodeId] || {}) };

        for (const conn of incomingConns) {
          // 多输入端口兼容：包含 targetPortId 唯一确定边
          const edgeKey = `${conn.sourceNodeId}:${conn.sourcePortId}->${conn.targetNodeId}:${conn.targetPortId}`;
          // 记录当前目标节点对该条输入边已消费的 source 节点版本
          const sourceVer = updatedNodeVersions[conn.sourceNodeId] || prev[conn.sourceNodeId] || 0;
          targetConsumed[edgeKey] = sourceVer;
        }

        return {
          ...lastConsumedPrev,
          [nodeId]: targetConsumed
        };
      });

      return updatedNodeVersions;
    });

    // 成功执行节点后，清除该节点上的 Dirty 状态，递增 outputRevision，并记录其输出资源 outputResourceId
    const executionState = workflowExecutor.getExecutionState(nodeId);

    setNodes((prevNodes) =>
      prevNodes.map((node) => {
        if (node.id === nodeId) {
          const currentRev = node.outputRevision || 0;
          return {
            ...node,
            dirty: false,
            outputRevision: currentRev + 1,
            outputResourceId: executionState.outputResourceId || node.outputResourceId
          };
        }
        return node;
      })
    );
  }, [connections]);

  // 统一的路径渲染结果提交函数 (一次性原子处理已运行和跳过节点)
  const applyExecutionPathResult = useCallback((result: { success: boolean; processedNodeIds: string[]; skippedNodeIds: string[]; failedNodeId?: string }) => {
    if (!result.success && !result.processedNodeIds.length && !result.skippedNodeIds.length) return;

    // A. 对真正运行成功的节点：记录版本并清除 Dirty
    result.processedNodeIds.forEach((id) => {
      recordNodeExecuted(id);
    });

    // B. 对 Cache Skip 命中的节点：仅清理 Dirty，绝对不加版本
    if (result.skippedNodeIds.length > 0) {
      cleanNodesDirty(result.skippedNodeIds);
    }
  }, [recordNodeExecuted, cleanNodesDirty]);

  // 节点变动（如草稿调整、参数 commit 或资源上传）时触发递归标记当前节点及其所有下游节点为 Dirty
  // 注意：不递增 outputRevision，因为节点尚未点击渲染生成新输出！
  const markNodeAndDownstreamDirty = useCallback((nodeId: string) => {
    const downstreamIds = getDownstreamNodeIds(nodeId);
    const affectedNodeIds = new Set([nodeId, ...Array.from(downstreamIds)]);

    setNodes((prevNodes) =>
      prevNodes.map((node) => {
        if (affectedNodeIds.has(node.id)) {
          return {
            ...node,
            dirty: true
          };
        }
        return node;
      })
    );
  }, [getDownstreamNodeIds]);

  // 暴露 window 全局标记钩子供组件级无损调用
  useEffect(() => {
    (window as any).__SUZU_MARK_DIRTY__ = markNodeAndDownstreamDirty;
    (window as any).__SUZU_CLEAN_NODES_DIRTY__ = cleanNodesDirty;
    (window as any).__SUZU_APPLY_EXECUTION_RESULT__ = applyExecutionPathResult;
  }, [markNodeAndDownstreamDirty, cleanNodesDirty, applyExecutionPathResult]);

  // Update parameter value on a node (Committed State update)
  const updateNodeParameter = useCallback((nodeId: string, paramId: string, value: any) => {
    setNodes((prev) =>
      prev.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            parameters: {
              ...node.parameters,
              [paramId]: value
            }
          };
        }
        return node;
      })
    );
    setDraftParamsMapState((prev) => {
      const currentDraft = prev[nodeId] || {};
      return {
        ...prev,
        [nodeId]: {
          ...currentDraft,
          [paramId]: value
        }
      };
    });
  }, []);

  // Update multiple parameter values on a node atomically (Single re-render)
  const updateNodeParametersBatch = useCallback((nodeId: string, newParameters: Record<string, any>) => {
    setNodes((prev) =>
      prev.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            parameters: {
              ...node.parameters,
              ...newParameters
            }
          };
        }
        return node;
      })
    );
    setDraftParamsMapState((prev) => {
      const currentDraft = prev[nodeId] || {};
      return {
        ...prev,
        [nodeId]: {
          ...currentDraft,
          ...newParameters
        }
      };
    });
  }, []);

  // Unified Commit & Execute Node function
  const commitAndExecuteNode = useCallback(async (nodeId: string, draftParams?: Record<string, any>) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const activeDraft = draftParams || draftParamsMap[nodeId] || {};

    // A. Merge committed & draft parameters
    const committedParams = {
      ...node.parameters,
      ...activeDraft
    };

    // B. Build workflow snapshot
    const activeWorkflow = (window as any).__SUZU_WORKFLOW_DATA__ || { nodes, connections };
    const workflowSnapshot: WorkflowData = {
      ...activeWorkflow,
      nodes: (activeWorkflow.nodes || []).map((n: any) =>
        n.id === nodeId ? { ...n, parameters: { ...committedParams } } : n
      )
    };

    // C. Batch update parameters to committed state
    updateNodeParametersBatch(nodeId, committedParams);

    // D. Execute calculation via WorkflowExecutor
    await workflowExecutor.executeToNode(nodeId, workflowSnapshot, nodeVersions);

    // E. Record execution version
    recordNodeExecuted(nodeId);

    // F. Write back outputResourceId (non input.image nodes)
    const state = workflowExecutor.getExecutionState(nodeId);
    if (state.outputResourceId && node.type !== 'input.image') {
      updateNodeParameter(nodeId, 'resourceId', state.outputResourceId);
    }

    showToast('提交渲染成功！', 'success');
  }, [nodes, connections, draftParamsMap, nodeVersions, updateNodeParametersBatch, updateNodeParameter, recordNodeExecuted, showToast]);

  // Rule 1: Add Node
  const addNode = useCallback(
    (nodeType: string, position: { x: number; y: number }) => {
      const def = nodeRegistry.get(nodeType);
      if (!def) return;

      const defaultParams: Record<string, any> = {};
      def.parameters.forEach((p) => {
        defaultParams[p.id] = p.defaultValue;
      });

      if (nodeType === 'input.image') {
        defaultParams.resourceId = undefined;
      }

      const newNode: NodeInstance = {
        id: `node_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type: nodeType,
        position,
        parameters: defaultParams
      };

      setNodes((prev) => [...prev, newNode]);
      setSelectedNodeId(newNode.id);
    },
    [nodes, showToast, t]
  );

  const updateNodePosition = useCallback((nodeId: string, position: { x: number; y: number }) => {
    setNodes((prev) =>
      prev.map((node) => (node.id === nodeId ? { ...node, position } : node))
    );
  }, []);

  const updateNodeSize = useCallback((nodeId: string, width: number, height: number) => {
    setNodes((prev) =>
      prev.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              size: { width: Math.round(width), height: Math.round(height) },
              width: Math.round(width),
              height: Math.round(height)
            }
          : node
      )
    );
  }, []);

  const removeNode = useCallback((nodeId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setConnections((prev) =>
      prev.filter((c) => c.sourceNodeId !== nodeId && c.targetNodeId !== nodeId)
    );
    setDraftParamsMapState((prev) => {
      const next = { ...prev };
      delete next[nodeId];
      return next;
    });
    setNodeVersions((prev) => {
      const next = { ...prev };
      delete next[nodeId];
      return next;
    });
    setLastConsumedVersions((prev) => {
      const next = { ...prev };
      delete next[nodeId];
      return next;
    });
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
  }, [selectedNodeId]);

  const addConnection = useCallback((connection: Omit<Connection, 'id'>) => {
    setConnections((prev) => {
      const filtered = prev.filter(
        (c) => !(c.targetNodeId === connection.targetNodeId && c.targetPortId === connection.targetPortId)
      );
      const newConn: Connection = {
        ...connection,
        id: `conn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
      };
      // 连接变化时污染目标节点及其所有下游
      markNodeAndDownstreamDirty(connection.targetNodeId);
      return [...filtered, newConn];
    });
  }, [markNodeAndDownstreamDirty]);

  const removeConnection = useCallback((connectionId: string) => {
    const targetConn = connections.find((c) => c.id === connectionId);
    if (targetConn) {
      markNodeAndDownstreamDirty(targetConn.targetNodeId);
      const edgeKey = `${targetConn.sourceNodeId}:${targetConn.sourcePortId}->${targetConn.targetPortId}`;
      setLastConsumedVersions((prev) => {
        const targetObj = prev[targetConn.targetNodeId];
        if (!targetObj) return prev;
        const updated = { ...targetObj };
        delete updated[edgeKey];
        return {
          ...prev,
          [targetConn.targetNodeId]: updated
        };
      });
    }
    setConnections((prev) => prev.filter((c) => c.id !== connectionId));
  }, [connections, markNodeAndDownstreamDirty]);

  const clearWorkflow = useCallback(() => {
    setNodes([]);
    setConnections([]);
    setSelectedNodeId(null);
    setDraftParamsMapState({});
    setNodeVersions({});
    setLastConsumedVersions({});
  }, []);

  const exportWorkflowJSON = useCallback(() => {
    const workflowFile = serializeWorkflow(nodes, connections);
    return JSON.stringify(workflowFile, null, 2);
  }, [nodes, connections]);

  const importWorkflowJSON = useCallback((jsonString: string): boolean => {
    try {
      const deserialized = deserializeWorkflow(jsonString);

      // Clean all runtime & execution state and perform clean full workflow replacement
      setNodes(deserialized.nodes);
      setConnections(deserialized.connections);
      setSelectedNodeId(null);

      setDraftParamsMapState({});
      (window as any).__SUZU_DRAFT_PARAMS__ = {};
      window.dispatchEvent(new CustomEvent('suzu_draft_updated', { detail: {} }));

      setNodeVersions({});
      setLastConsumedVersions({});

      showToast('工作流 JSON 已成功导入！', 'success');
      return true;
    } catch (e: any) {
      console.error('Workflow JSON Import Failed:', e);
      showToast(e.message || '无法解析导入的工作流文件', 'error');
      throw e;
    }
  }, [showToast]);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;

  return {
    nodes,
    connections,
    selectedNodeId,
    selectedNode,
    draftParamsMap,
    nodeVersions,
    lastConsumedVersions,
    commitAndExecuteNode,
    recordNodeExecuted,
    markNodeAndDownstreamDirty,
    setDraftParams,
    getDraftParams,
    clearDraftParams,
    setSelectedNodeId,
    addNode,
    updateNodePosition,
    updateNodeSize,
    updateNodeParameter,
    updateNodeParametersBatch,
    removeNode,
    addConnection,
    removeConnection,
    clearWorkflow,
    exportWorkflowJSON,
    importWorkflowJSON,
    loadDemoWorkflow,
    isInitializing
  };
}
