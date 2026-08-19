import React, { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  Connection as RFConnection,
  Edge,
  useReactFlow,
  ReactFlowProvider,
  NodeTypes
} from '@xyflow/react';

import { NodeInstance } from '../../core/NodeInstance';
import { Connection } from '../../core/Connection';
import { CustomNode } from '../Node/CustomNode';
import {
  coreNodesToFlowNodes,
  coreConnectionsToFlowEdges
} from '../../adapter/reactFlowAdapter';
import { getLoopEasterEgg } from '../../utils/loopEasterEgg';
import { useLanguage } from '../../i18n/LanguageContext';

const nodeTypes: NodeTypes = {
  customNode: CustomNode as any
};

interface FlowCanvasContentProps {
  nodes: NodeInstance[];
  connections: Connection[];
  selectedNodeId: string | null;
  enableEdgeAnimation?: boolean;
  enableMagnifier?: boolean;
  bgVariant?: 'dots' | 'lines' | 'cross';
  nodeVersions?: Record<string, number>;
  lastConsumedVersions?: Record<string, Record<string, number>>;
  onDraftParamsChange?: (nodeId: string, params: Record<string, any>) => void;
  onRecordNodeExecuted?: (nodeId: string) => void;
  markNodeAndDownstreamDirty?: (nodeId: string) => void;
  onSelectNode: (nodeId: string | null) => void;
  onNodePositionChange: (nodeId: string, position: { x: number; y: number }) => void;
  onNodeSizeChange: (nodeId: string, width: number, height: number) => void;
  onAddConnection: (conn: Omit<Connection, 'id'>) => void;
  onRemoveConnection: (connId: string) => void;
  onAddNode: (nodeType: string, position: { x: number; y: number }) => void;
  onUpdateParameter: (nodeId: string, paramId: string, value: any) => void;
  onRemoveNode: (nodeId: string) => void;
}

const FlowCanvasContent: React.FC<FlowCanvasContentProps> = ({
  nodes,
  connections,
  selectedNodeId,
  enableEdgeAnimation = true,
  enableMagnifier = true,
  bgVariant = 'dots',
  nodeVersions = {},
  lastConsumedVersions = {},
  onDraftParamsChange,
  onRecordNodeExecuted,
  markNodeAndDownstreamDirty,
  onSelectNode,
  onNodePositionChange,
  onNodeSizeChange,
  onAddConnection,
  onRemoveConnection,
  onAddNode,
  onUpdateParameter,
  onRemoveNode
}) => {
  const { lang, t } = useLanguage();
  const { screenToFlowPosition } = useReactFlow();

  // 双向点选连线状态（Tap-to-Connect for mobile/touch）
  const [connectingPort, setConnectingPort] = React.useState<{
    nodeId: string;
    portId: string;
    isSource: boolean;
  } | null>(null);

  // 构造 nodesMap 方便快速索引 NodeInstance 对象
  const nodesMap = useMemo(() => {
    const map = new Map<string, NodeInstance>();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  // Convert Core model to React Flow model - Stable reference without nodeVersions in node deps
  const flowNodes = useMemo(() => {
    return coreNodesToFlowNodes(
      nodes,
      onUpdateParameter,
      onRemoveNode,
      onNodeSizeChange,
      enableMagnifier,
      onDraftParamsChange,
      onRecordNodeExecuted,
      markNodeAndDownstreamDirty
    ).map((fn) => ({
      ...fn,
      selected: fn.id === selectedNodeId
    }));
  }, [nodes, selectedNodeId, onUpdateParameter, onRemoveNode, onNodeSizeChange, enableMagnifier, onDraftParamsChange, onRecordNodeExecuted, markNodeAndDownstreamDirty]);

  // Convert Core connections to React Flow edges with nodeVersions & lastConsumedVersions for pending propagation coloring
  const flowEdges = useMemo(() => {
    return coreConnectionsToFlowEdges(
      connections,
      enableEdgeAnimation,
      selectedNodeId,
      nodeVersions,
      lastConsumedVersions,
      undefined,
      nodesMap
    );
  }, [connections, enableEdgeAnimation, selectedNodeId, nodeVersions, lastConsumedVersions, nodesMap]);

  const [rfNodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [rfEdges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  // Sync internal state when props change
  React.useEffect(() => {
    setNodes(flowNodes);
  }, [flowNodes, setNodes]);

  React.useEffect(() => {
    setEdges(flowEdges);
  }, [flowEdges, setEdges]);

  // Handle Drag & Drop Node Creation
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY
      });

      onAddNode(type, position);
    },
    [screenToFlowPosition, onAddNode]
  );

  // Expose screenToFlowPosition globally for mobile Center-Add-Node feature
  React.useEffect(() => {
    (window as any).__SUZU_SCREEN_TO_FLOW__ = screenToFlowPosition;
  }, [screenToFlowPosition]);

  // Trace upstream connections from sourceId to check if targetId is already an ancestor (would create a cycle)
  const wouldCreateCycle = useCallback(
    (sourceId: string, targetId: string): boolean => {
      if (sourceId === targetId) return true; // Direct self-loop

      const visited = new Set<string>();
      const stack = [sourceId];

      while (stack.length > 0) {
        const curr = stack.pop()!;
        if (curr === targetId) return true; // Found targetId in sourceId's upstream chain -> Cycle!
        if (visited.has(curr)) continue;
        visited.add(curr);

        const incomingConnections = connections.filter((c) => c.targetNodeId === curr);
        for (const conn of incomingConnections) {
          stack.push(conn.sourceNodeId);
        }
      }

      return false;
    },
    [connections]
  );

  // Rule 3: Single Channel Input & Multi Channel Output Port Constraints Validation & Cycle Prevention
  const isValidConnection = useCallback(
    (connection: RFConnection | Edge) => {
      if (!connection.source || !connection.target) return false;
      // Prevent direct self connection and multi-node cycles (a -> b -> a)
      if (wouldCreateCycle(connection.source, connection.target)) return false;
      return true;
    },
    [wouldCreateCycle]
  );

  // Handle Connecting Handles (Auto-replaces existing connection on target single channel input port)
  const onConnect = useCallback(
    (params: RFConnection) => {
      if (params.source && params.target && params.sourceHandle && params.targetHandle) {
        onAddConnection({
          sourceNodeId: params.source,
          sourcePortId: params.sourceHandle,
          targetNodeId: params.target,
          targetPortId: params.targetHandle
        });
      }
    },
    [onAddConnection]
  );

  // Trigger Anti-Loop Easter Egg Popup ONLY when user finishes mouse drag attempt to connect a cycle
  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent, connectionState: any) => {
        if (
          connectionState &&
          connectionState.fromNode &&
          connectionState.toNode &&
          wouldCreateCycle(connectionState.fromNode.id, connectionState.toNode.id)
        ) {
          const egg = getLoopEasterEgg(lang);
        const clientX = 'clientX' in event ? event.clientX : (event.touches && event.touches[0] ? event.touches[0].clientX : window.innerWidth / 2);
        const clientY = 'clientY' in event ? event.clientY : (event.touches && event.touches[0] ? event.touches[0].clientY : window.innerHeight / 2);

        if (typeof (window as any).__triggerEasterEggPopup === 'function') {
          (window as any).__triggerEasterEggPopup({
            x: clientX,
            y: clientY,
            image: egg.image,
            message: egg.message
          });
        }
      }
    },
    [connections, wouldCreateCycle, lang]
  );

  // Sync node movement back to core workflow state
  const onNodeDragStop = useCallback(
    (_: any, node: any) => {
      onNodePositionChange(node.id, node.position);
    },
    [onNodePositionChange]
  );

  // Precise Bidirectional Tap-to-Connect via Custom Event from Port Handles
  React.useEffect(() => {
    const handlePortClick = (e: any) => {
      const { nodeId, portId, isSource } = e.detail || {};
      if (!nodeId || !portId) return;

      if (!connectingPort) {
        // 第一次点击：记录该端口（无论是输入端口还是输出端口），进入连线待命模式
        setConnectingPort({ nodeId, portId, isSource });
        return;
      }

      // 如果重复点击了同一种方向的端口（例如先点输入又点另一个输入，或同节点），更新当前待连接端口
      if (connectingPort.isSource === isSource) {
        setConnectingPort({ nodeId, portId, isSource });
        return;
      }

      // 第二次点击了互补端口（一个输入，一个输出），立即判定并建立连线
      const sourceInfo = isSource ? { nodeId, portId } : connectingPort;
      const targetInfo = isSource ? connectingPort : { nodeId, portId };

      if (sourceInfo.nodeId !== targetInfo.nodeId && !wouldCreateCycle(sourceInfo.nodeId, targetInfo.nodeId)) {
        onAddConnection({
          sourceNodeId: sourceInfo.nodeId,
          sourcePortId: sourceInfo.portId,
          targetNodeId: targetInfo.nodeId,
          targetPortId: targetInfo.portId
        });
      }
      setConnectingPort(null);
    };

    window.addEventListener('suzu_port_handle_clicked', handlePortClick);
    return () => {
      window.removeEventListener('suzu_port_handle_clicked', handlePortClick);
    };
  }, [connectingPort, wouldCreateCycle, onAddConnection]);

  // Handle selecting nodes or clicking empty canvas
  const onSelectionChange = useCallback(
    (params: { nodes: any[] }) => {
      if (params.nodes.length > 0) {
        onSelectNode(params.nodes[0].id);
      } else {
        onSelectNode(null);
      }
    },
    [onSelectNode]
  );

  // Handle Edge Deletion
  const onEdgesDelete = useCallback(
    (deletedEdges: any[]) => {
      deletedEdges.forEach((edge) => onRemoveConnection(edge.id));
    },
    [onRemoveConnection]
  );

  return (
    <div
      style={{ width: '100%', height: '100%', flex: 1, position: 'relative' }}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* 手机端双向点选连线状态悬浮提示 */}
      {connectingPort && (
        <div
          style={{
            position: 'absolute',
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 100,
            backgroundColor: '#f59e0b',
            color: '#000000',
            fontWeight: 600,
            fontSize: '12px',
            padding: '8px 16px',
            borderRadius: '20px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <span>
            🔗 {connectingPort.isSource ? t('connectingModeHint') : t('connectingModeHintInputFirst')}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setConnectingPort(null);
            }}
            style={{
              background: '#000000',
              color: '#ffffff',
              border: 'none',
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            {t('cancelConnecting')}
          </button>
        </div>
      )}

      <ReactFlow
        nodes={rfNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        onNodeDragStop={onNodeDragStop}
        onSelectionChange={onSelectionChange}
        onEdgesDelete={onEdgesDelete}
        onEdgeDoubleClick={(_e: any, edge: any) => onRemoveConnection(edge.id)}
        onConnectEnd={onConnectEnd}
        deleteKeyCode={['Delete', 'Backspace']}
        edgesFocusable={true}
        edgesReconnectable={true}
        translateExtent={[
          [-50000, -50000],
          [50000, 50000]
        ]} // Ultra-large unbounded canvas extent for complex long pipelines
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        defaultEdgeOptions={{
          animated: enableEdgeAnimation,
          style: { stroke: '#3b82f6', strokeWidth: 2.5 },
          focusable: true
        }}
        onlyRenderVisibleElements={false}
        minZoom={0.1}
        maxZoom={3.0}
      >
        <Background
          variant={
            bgVariant === 'lines'
              ? BackgroundVariant.Lines
              : bgVariant === 'cross'
              ? BackgroundVariant.Cross
              : BackgroundVariant.Dots
          }
          gap={20}
          size={1.5}
          color="#2e3240"
        />
        <Controls
          aria-label="Canvas Controls"
          style={{
            backgroundColor: '#1a1c23',
            border: '1px solid #2e3240',
            borderRadius: '8px'
          }}
        />
        <MiniMap
          nodeColor={() => '#272a38'}
          maskColor="rgba(18, 19, 22, 0.7)"
          style={{
            backgroundColor: '#1a1c23',
            border: '1px solid #2e3240'
          }}
        />
      </ReactFlow>
    </div>
  );
};

export const FlowCanvas: React.FC<FlowCanvasContentProps> = (props) => {
  return (
    <div style={{ flex: 1, width: '100%', height: '100%', position: 'relative', display: 'flex' }}>
      <ReactFlowProvider>
        <FlowCanvasContent {...props} />
      </ReactFlowProvider>
    </div>
  );
};
