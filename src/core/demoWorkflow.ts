import { WorkflowData } from './Workflow';
import { resourceStore } from './ResourceStore';
import { workflowExecutor } from './WorkflowExecutor';

export const DEMO_WORKFLOW_JSON: WorkflowData = {
  metadata: {
    schemaVersion: '1.0.0',
    exportedAt: '2026-08-12T18:37:33.937Z',
    name: 'Workflow Pipeline',
    isDemo: true,
    demoVersion: 1
  },
  nodes: [
    {
      id: 'node_input_1',
      type: 'input.image',
      position: { x: 80, y: 150 },
      size: { width: 320, height: 380 },
      parameters: {
        denoiseRadius: 0,
        scaleRatio: 40
      }
    },
    {
      id: 'node_output_1',
      type: 'output.image',
      position: { x: 765, y: 150 },
      size: { width: 300, height: 365 },
      parameters: {
        scaleRatio: 100,
        exportFormat: 'png'
      }
    },
    {
      id: 'node_1786559676903_mkpg',
      type: 'filter.pixel',
      position: { x: 435, y: 150 },
      size: { width: 280, height: 350 },
      parameters: {
        scaleRatio: 0.11,
        enableThreshold: false,
        threshold: 128,
        thresholdMode: 'color',
        enableCustomColor: false,
        customColor: '#3b82f6'
      }
    },
    {
      id: 'node_1786559714263_ll6p',
      type: 'output.mirage',
      position: { x: 765, y: 540 },
      size: { width: 380, height: 690 },
      parameters: {
        maxSize: 0,
        innerScale: 0.3,
        coverScale: 0.2,
        innerWeight: 0.7,
        innerDesat: 0,
        coverDesat: 0
      }
    },
    {
      id: 'node_1786559720128_qrkb',
      type: 'filter.sketch',
      position: { x: 435, y: 540 },
      size: { width: 280, height: 635 },
      parameters: {
        layer0Opacity: 0,
        layer1Opacity: 0.1,
        layer2Opacity: 1,
        layer2MinimumRadius: 0.5,
        layer3Opacity: 1,
        layer3ColorMode: 'rainbow',
        layer3CustomColor: '#000000',
        layer3BlendMode: 'soft-light'
      }
    }
  ],
  connections: [
    {
      id: 'conn_1786559681599_4jdi',
      sourceNodeId: 'node_input_1',
      sourcePortId: 'image',
      targetNodeId: 'node_1786559676903_mkpg',
      targetPortId: 'image'
    },
    {
      id: 'conn_1786559725046_072e',
      sourceNodeId: 'node_input_1',
      sourcePortId: 'image',
      targetNodeId: 'node_1786559720128_qrkb',
      targetPortId: 'image'
    },
    {
      id: 'conn_1786559789195_k99v',
      sourceNodeId: 'node_1786559676903_mkpg',
      sourcePortId: 'image',
      targetNodeId: 'node_1786559714263_ll6p',
      targetPortId: 'coverImage'
    },
    {
      id: 'conn_1786559791551_rw4m',
      sourceNodeId: 'node_1786559720128_qrkb',
      sourcePortId: 'image',
      targetNodeId: 'node_1786559714263_ll6p',
      targetPortId: 'innerImage'
    },
    {
      id: 'conn_1786559803207_mrfc',
      sourceNodeId: 'node_1786559676903_mkpg',
      sourcePortId: 'image',
      targetNodeId: 'node_output_1',
      targetPortId: 'image'
    }
  ]
};

let demoResourceCache: Record<string, string> | null = null;

/**
 * 演示资源初始化注册：通过 Vite BASE_URL fetch 静态素材，统一注册到 ResourceStore
 */
export async function initDemoResources(): Promise<Record<string, string>> {
  if (demoResourceCache) return demoResourceCache;

  const baseUrl = (import.meta as any).env?.BASE_URL || '/';
  const assetFiles = [
    { key: 'input', file: 'demo-input.png' },
    { key: 'pixel', file: 'demo-pixel.png' },
    { key: 'sketch', file: 'demo-sketch.png' },
    { key: 'output', file: 'demo-output.png' },
    { key: 'mirageCover', file: 'demo-mirage-cover.png' },
    { key: 'mirageInner', file: 'demo-mirage-inner.png' },
    { key: 'mirageComposite', file: 'demo-mirage-composite.png' }
  ];

  const resultMap: Record<string, string> = {};

  for (const item of assetFiles) {
    const url = `${baseUrl}eg/demo/${item.file}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`无法加载演示资源文件: ${url}`);
    }
    const blob = await resp.blob();

    let metadata: Record<string, any> | undefined;
    if (item.key === 'mirageComposite') {
      metadata = {
        coverPreviewUrl: `${baseUrl}eg/demo/demo-mirage-cover.png`,
        innerPreviewUrl: `${baseUrl}eg/demo/demo-mirage-inner.png`
      };
    }

    const resItem = await resourceStore.addResource(item.file, 'image', blob, metadata);
    resultMap[item.key] = resItem.id;
  }

  demoResourceCache = resultMap;
  return resultMap;
}

export interface PreparedDemoData {
  workflow: WorkflowData;
  nodeVersions: Record<string, number>;
  lastConsumedVersions: Record<string, Record<string, number>>;
}

/**
 * 构造并初始化 Clean 状态的 Demo WorkflowData 与对应的执行版本状态
 */
export async function prepareDemoWorkflow(): Promise<PreparedDemoData> {
  const resMap = await initDemoResources();

  // 1. Deep clone demo workflow template
  const workflow: WorkflowData = JSON.parse(JSON.stringify(DEMO_WORKFLOW_JSON));

  // 2. Set node runtime states and resource IDs
  const nodeVersions: Record<string, number> = {};

  workflow.nodes.forEach((node) => {
    node.dirty = false;
    node.outputRevision = 1;
    nodeVersions[node.id] = 1;

    if (node.id === 'node_input_1') {
      node.parameters.resourceId = resMap.input;
      node.outputResourceId = resMap.input;
    } else if (node.id === 'node_1786559676903_mkpg') {
      node.outputResourceId = resMap.pixel;
    } else if (node.id === 'node_1786559720128_qrkb') {
      node.outputResourceId = resMap.sketch;
    } else if (node.id === 'node_output_1') {
      node.outputResourceId = resMap.output;
    } else if (node.id === 'node_1786559714263_ll6p') {
      node.outputResourceId = resMap.mirageComposite;
    }
  });

  // 3. Hydrate WorkflowExecutor executionStates and cache signature
  workflow.nodes.forEach((node) => {
    const { signature } = workflowExecutor.computeExecutionSignature(node, workflow, nodeVersions);
    node.lastExecutedSignature = signature;

    workflowExecutor.hydrateExecutionState(
      node.id,
      {
        status: 'success',
        outputResourceId: node.outputResourceId
      },
      signature
    );
  });

  // 4. Construct lastConsumedVersions so all connections are clean (blue)
  const lastConsumedVersions: Record<string, Record<string, number>> = {};

  workflow.connections.forEach((conn) => {
    const targetId = conn.targetNodeId;
    if (!lastConsumedVersions[targetId]) {
      lastConsumedVersions[targetId] = {};
    }
    const edgeKey = `${conn.sourceNodeId}:${conn.sourcePortId}->${conn.targetNodeId}:${conn.targetPortId}`;
    lastConsumedVersions[targetId][edgeKey] = 1;
  });

  return {
    workflow,
    nodeVersions,
    lastConsumedVersions
  };
}
