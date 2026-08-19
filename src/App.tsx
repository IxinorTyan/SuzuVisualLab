import React from 'react';
import { useWorkflow } from './hooks/useWorkflow';
import { Header } from './components/UI/Header';
import { NodeSidebar } from './components/Sidebar/NodeSidebar';
import { FlowCanvas } from './components/Canvas/FlowCanvas';
import { Inspector } from './components/Inspector/Inspector';
import { MagnifierLens } from './components/UI/MagnifierLens';
import { EasterEggPopup, EasterEggData } from './components/UI/EasterEggPopup';
import { Layers, Settings, Plus } from 'lucide-react';
import { useLanguage } from './i18n/LanguageContext';

export function App() {
  const { t } = useLanguage();
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

  // Responsive & Collapsible Panels State
  const [isMobile, setIsMobile] = React.useState(() => window.innerWidth <= 768);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(() => window.innerWidth > 768);
  const [isInspectorOpen, setIsInspectorOpen] = React.useState(() => window.innerWidth > 768);

  React.useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Note: Do not force open Inspector on select; preserve user's collapsed state

  // Click-to-add from Sidebar: computes canvas center position
  const handleAddNodeDirectly = React.useCallback(
    (nodeType: string) => {
      let position = { x: 250, y: 150 };
      if (typeof (window as any).__SUZU_SCREEN_TO_FLOW__ === 'function') {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        // Offset slightly to prevent complete overlap if adding repeatedly
        const randomOffset = (Math.random() - 0.5) * 40;
        position = (window as any).__SUZU_SCREEN_TO_FLOW__({
          x: centerX + randomOffset,
          y: centerY + randomOffset
        });
      }
      addNode(nodeType, position);
      if (isMobile) {
        setIsSidebarOpen(false); // Mobile auto close drawer to show newly added node
      }
    },
    [addNode, isMobile]
  );

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
        {/* Left Sidebar (Desktop side panel / Mobile overlay drawer) */}
        {isSidebarOpen && (
          <NodeSidebar
            onAddNodeDirectly={handleAddNodeDirectly}
            onClose={() => setIsSidebarOpen(false)}
            style={
              isMobile
                ? {
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    zIndex: 50,
                    width: '85vw',
                    maxWidth: '320px',
                    boxShadow: '4px 0 24px rgba(0,0,0,0.6)'
                  }
                : undefined
            }
          />
        )}

        {/* Mobile Sidebar Backdrop */}
        {isMobile && isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 40
            }}
          />
        )}

        {/* Left Sidebar Expand Floating Tab (When collapsed) */}
        {!isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            title={t('expandSidebar')}
            style={{
              position: 'absolute',
              left: 0,
              top: '16px',
              zIndex: 30,
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderLeft: 'none',
              borderRadius: '0 8px 8px 0',
              padding: '8px 10px',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '2px 2px 8px rgba(0,0,0,0.3)',
              fontSize: '12px',
              fontWeight: 600
            }}
          >
            <Layers size={16} style={{ color: 'var(--accent-blue)' }} />
            {!isMobile && <span>{t('nodeLibrary')}</span>}
          </button>
        )}

        {/* Infinite ReactFlow Canvas */}
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

        {/* Right Inspector (Desktop side panel / Mobile bottom/side drawer) */}
        {isInspectorOpen && (
          <Inspector
            node={selectedNode}
            draftParamsMap={draftParamsMap}
            getDraftParams={getDraftParams}
            onDraftParamsChange={setDraftParams}
            onCommitAndExecute={commitAndExecuteNode}
            onUpdateParameter={updateNodeParameter}
            onRemoveNode={removeNode}
            onClose={() => setIsInspectorOpen(false)}
            style={
              isMobile
                ? {
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    zIndex: 50,
                    width: '90vw',
                    maxWidth: '340px',
                    boxShadow: '-4px 0 24px rgba(0,0,0,0.6)'
                  }
                : undefined
            }
          />
        )}

        {/* Mobile Inspector Backdrop */}
        {isMobile && isInspectorOpen && (
          <div
            onClick={() => setIsInspectorOpen(false)}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 40
            }}
          />
        )}

        {/* Right Inspector Expand Floating Tab (When collapsed & node selected or desktop) */}
        {!isInspectorOpen && (
          <button
            onClick={() => setIsInspectorOpen(true)}
            title={t('expandInspector')}
            style={{
              position: 'absolute',
              right: 0,
              top: '16px',
              zIndex: 30,
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRight: 'none',
              borderRadius: '8px 0 0 8px',
              padding: '8px 10px',
              color: selectedNode ? 'var(--accent-purple)' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '-2px 2px 8px rgba(0,0,0,0.3)',
              fontSize: '12px',
              fontWeight: 600
            }}
          >
            <Settings size={16} />
            {!isMobile && <span>{t('inspectorTitle')}</span>}
          </button>
        )}

        {/* Mobile Bottom Floating Action Button (FAB) for Adding Nodes */}
        {isMobile && !isSidebarOpen && (
          <button
            onClick={() => setIsSidebarOpen(true)}
            title={t('addNodeBtn')}
            style={{
              position: 'absolute',
              left: '20px',
              bottom: '24px',
              zIndex: 35,
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent-blue)',
              color: '#ffffff',
              border: 'none',
              boxShadow: '0 4px 16px rgba(59, 130, 246, 0.6), 0 2px 6px rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <Plus size={24} />
          </button>
        )}
      </div>
    </div>
  );
}

export default App;
