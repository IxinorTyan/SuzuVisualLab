import React from 'react';
import { useWorkflow } from './hooks/useWorkflow';
import { Header } from './components/UI/Header';
import { NodeSidebar } from './components/Sidebar/NodeSidebar';
import { FlowCanvas } from './components/Canvas/FlowCanvas';
import { Inspector } from './components/Inspector/Inspector';
import { MagnifierLens } from './components/UI/MagnifierLens';
import { EasterEggPopup, EasterEggData } from './components/UI/EasterEggPopup';

export function App() {
  const {
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
    setSelectedNodeId,
    addNode,
    updateNodePosition,
    updateNodeSize,
    updateNodeParameter,
    removeNode,
    addConnection,
    removeConnection,
    clearWorkflow,
    exportWorkflowJSON,
    importWorkflowJSON
  } = useWorkflow();

  // Global Header Switch Toggles State (Default OFF for optimal load performance)
  const [enableMagnifier, setEnableMagnifier] = React.useState(false);
  const [enableEdgeAnimation, setEnableEdgeAnimation] = React.useState(false);
  const [canvasBgVariant, setCanvasBgVariant] = React.useState<'dots' | 'lines' | 'cross'>('dots');

  // Easter Egg Popup State
  const [easterEggData, setEasterEggData] = React.useState<EasterEggData | null>(null);

  React.useEffect(() => {
    (window as any).__triggerEasterEggPopup = (data: EasterEggData) => {
      setEasterEggData(data);
    };
  }, []);

  // Keep window global reference to workflow data for WorkflowExecutor
  React.useEffect(() => {
    (window as any).__SUZU_WORKFLOW_DATA__ = { nodes, connections };
  }, [nodes, connections]);

  // Rule 3 (Feature 3): Prevent accidental window close or refresh losing work
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (nodes.length > 0) {
        e.preventDefault();
        e.returnValue = ''; // Standard browser trigger for unsaved prompt
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [nodes]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-primary)'
      }}
    >
      {/* Easter Egg Popup overlay */}
      <EasterEggPopup data={easterEggData} />

      {/* Feature 4: High Precision Floating Magnifier Lens */}
      <MagnifierLens enabled={enableMagnifier} zoom={4.0} lensSize={220} />

      {/* Top Header Navigation */}
      <Header
        onExport={exportWorkflowJSON}
        onImport={importWorkflowJSON}
        onClear={clearWorkflow}
        enableMagnifier={enableMagnifier}
        onToggleMagnifier={() => setEnableMagnifier((prev) => !prev)}
        enableEdgeAnimation={enableEdgeAnimation}
        onToggleEdgeAnimation={() => setEnableEdgeAnimation((prev) => !prev)}
        canvasBgVariant={canvasBgVariant}
        onChangeCanvasBgVariant={setCanvasBgVariant}
      />

      {/* Main Studio Area: Left Sidebar | Infinite Canvas | Right Inspector */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          height: 'calc(100vh - 48px)',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        <NodeSidebar />

        <FlowCanvas
          nodes={nodes}
          connections={connections}
          selectedNodeId={selectedNodeId}
          enableEdgeAnimation={enableEdgeAnimation}
          enableMagnifier={enableMagnifier}
          bgVariant={canvasBgVariant}
          nodeVersions={nodeVersions}
          lastConsumedVersions={lastConsumedVersions}
          onDraftParamsChange={setDraftParams}
          onRecordNodeExecuted={recordNodeExecuted}
          markNodeAndDownstreamDirty={markNodeAndDownstreamDirty}
          onSelectNode={setSelectedNodeId}
          onNodePositionChange={updateNodePosition}
          onNodeSizeChange={updateNodeSize}
          onAddConnection={addConnection}
          onRemoveConnection={removeConnection}
          onAddNode={addNode}
          onUpdateParameter={updateNodeParameter}
          onRemoveNode={removeNode}
        />

        <Inspector
          node={selectedNode}
          draftParamsMap={draftParamsMap}
          getDraftParams={getDraftParams}
          onDraftParamsChange={setDraftParams}
          onCommitAndExecute={commitAndExecuteNode}
          onUpdateParameter={updateNodeParameter}
          onRemoveNode={removeNode}
        />
      </div>
    </div>
  );
}

export default App;
