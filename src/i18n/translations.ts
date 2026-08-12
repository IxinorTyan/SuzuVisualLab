export type Language = 'zh' | 'en';

export const translations = {
  zh: {
    // Header
    appTitle: 'Suzu Visual Lab',
    appSubtitle: 'v0.1 节点工作台',
    importJson: '导入 JSON',
    exportJson: '导出 JSON',
    clearCanvas: '清空画布',
    executePipeline: '运行流程 (占位)',

    // Toast
    imageInputLimit: '图像输入节点有且仅能有一个！',

    // Sidebar & Upload
    nodeLibrary: '节点库',
    searchNodes: '搜索节点...',
    noNodesFound: '未找到匹配的节点',
    uploadTitle: '上传/拖入输入图片',
    uploadSubtitle: '支持拖拽图片放置于此',

    // Node Preview Labels
    originalView: '原图 (Original)',
    downscaledView: '缩小 (Downscaled)',
    denoisedView: '降噪图',
    quantizedView: '量化图',
    svgView: 'SVG 矢量',

    // Node Status & Render
    statusIdle: '未渲染',
    statusRunning: '矢量化计算中...',
    statusSuccess: '渲染成功',
    statusErrorMsg: '渲染失败',
    renderBtn: '先渲染',
    renderingBtn: '渲染中...',

    // Inspector
    inspectorTitle: '属性面板',
    noNodeSelected: '未选中节点',
    selectNodeHint: '在画布中点击选中节点以查看和编辑其参数。',
    deleteNode: '删除节点',
    nodeId: '节点 ID',
    parameters: '参数设置',
    noParameters: '该节点没有可配置的参数。',
    enabled: '已启用',
    disabled: '已禁用',

    // Categories
    catInput: '输入节点',
    catFilter: '滤镜处理',
    catOutput: '输出节点',
    catColor: '色彩调整',
    catMath: '数学运算',
    catUtility: '实用工具'
  },
  en: {
    // Header
    appTitle: 'Suzu Visual Lab',
    appSubtitle: 'v0.1 Node Canvas',
    importJson: 'Import JSON',
    exportJson: 'Export JSON',
    clearCanvas: 'Clear Canvas',
    executePipeline: 'Execute Pipeline',

    // Toast
    imageInputLimit: 'Only one Image Input node is allowed!',

    // Sidebar & Upload
    nodeLibrary: 'Node Library',
    searchNodes: 'Search nodes...',
    noNodesFound: 'No matching nodes found.',
    uploadTitle: 'Upload/Drop Image',
    uploadSubtitle: 'Drag & drop image here',

    // Node Preview Labels
    originalView: 'Original',
    downscaledView: 'Downscaled',
    denoisedView: 'Denoised',
    quantizedView: 'Quantized',
    svgView: 'SVG Vector',

    // Node Status & Render
    statusIdle: 'Idle',
    statusRunning: 'Vectorizing...',
    statusSuccess: 'Success',
    statusErrorMsg: 'Error',
    renderBtn: 'Render',
    renderingBtn: 'Rendering...',

    // Inspector
    inspectorTitle: 'Inspector',
    noNodeSelected: 'No Node Selected',
    selectNodeHint: 'Select a node in the visual workspace to inspect and edit its parameters.',
    deleteNode: 'Delete Node',
    nodeId: 'Node ID',
    parameters: 'Parameters',
    noParameters: 'This node has no configurable parameters.',
    enabled: 'Enabled',
    disabled: 'Disabled',

    // Categories
    catInput: 'Input',
    catFilter: 'Filter',
    catOutput: 'Output',
    catColor: 'Color',
    catMath: 'Math',
    catUtility: 'Utility'
  }
};
