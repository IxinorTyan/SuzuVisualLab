# 📖 SuzuVisualLab 架构与 Agent 开发指南手册

本文档专为后续参与系统维护、功能扩展或自动化协作的 Agent / 开发者编写，详细说明了系统的**设计哲学、代码结构、扩展规则、卡片规则与工作流按序串联执行机制**。

---

## 目录
1. [系统总体架构设计](#1-系统总体架构设计)
2. [目录结构说明](#2-目录结构说明)
3. [卡片 (Node) 校验与连线规则](#3-卡片-node-校验与连线规则)
4. [工作流 (Workflow) 按序串联与预览规则](#4-工作流-workflow-按序串联与预览规则)
5. [功能扩展规则 (Agent 开发指南)](#5-功能扩展规则-agent-开发指南)
6. [开发规范与注意事项](#6-开发规范与注意事项)
7. [PNG 全局交换格式与资源管理规范](#7-png-全局交换格式与资源管理规范)
8. [卡片 (Node) 编写与开发规范总则](#8-卡片-node-编写与开发规范总则)

---

## 1. 系统总体架构设计

SuzuVisualLab 采用了**数据模型层、执行引擎层、视图适配层和算法层四层分离**的架构模式：

```
+-------------------------------------------------------------+
|                     UI 视图层 (React Components)            |
|   CustomNode / Inspector / FlowCanvas / Sidebar / NodePreview  |
+-------------------------------------------------------------+
                              | (交互与渲染)
                              v
+-------------------------------------------------------------+
|                    适配器层 (src/adapter/)                   |
|                   reactFlowAdapter.ts                       |
|   (负责将 Core Workflow 转化为 ReactFlow 要求的 Nodes/Edges)   |
+-------------------------------------------------------------+
                              | (适配与解耦)
                              v
+-------------------------------------------------------------+
|                     核心域模型 (src/core/)                   |
| Workflow | NodeInstance | Connection | Port | ResourceStore |
+-------------------------------------------------------------+
                              | (驱动与调度)
                              v
+-------------------------------------------------------------+
|                   工作流执行器 (WorkflowExecutor)            |
|       拓扑排序 (Topological Sort) + 增量缓存 (Caching)        |
+-------------------------------------------------------------+
                              | (计算调度)
                              v
+-------------------------------------------------------------+
|                   算法处理层 (src/core/processors/)          |
|  svgProcessor / asciiProcessor / pixelProcessor / ...       |
+-------------------------------------------------------------+
```

---

## 2. 目录结构说明

```
src/
├── adapter/            # 适配器层：隔离底层图引擎 (React Flow)，实现核心模型与 UI 解耦
├── components/         # UI 视图层
│   ├── Canvas/         # 节点画布 UI
│   ├── Inspector/      # 节点参数调优面板 UI
│   ├── Node/           # 自定义卡片节点 UI及端口 Handle
│   ├── NodePreview/    # 各种类型节点的图像/矢量预览组件
│   ├── Sidebar/        # 节点添加侧边栏 UI
│   └── UI/             # 通用小组件（Header, MagnifierLens, Toast等）
├── core/               # 核心域模型（纯 TypeScript，无 UI 依赖）
│   ├── Connection.ts   # 连线定义
│   ├── NodeDefinition.ts # 卡片类型元定义
│   ├── NodeInstance.ts # 节点运行时实例
│   ├── Parameter.ts    # 参数定义
│   ├── Port.ts         # 端口定义
│   ├── ResourceStore.ts# 全局二进制/图像资源缓存池
│   ├── Workflow.ts     # 工作流定义
│   ├── WorkflowExecutor.ts # 工作流执行器与拓扑排序引擎
│   └── processors/     # 算法层（按功能划分子目录，如 ascii/, svg/, pixel/）
├── hooks/              # 自定义 React Hooks
├── i18n/               # 国际化配置 (多语言 translations)
├── registry/           # 注册中心：集中管理节点类型定义
└── utils/              # 通用工具函数 (如 IndexedDB 存储)
```

---

## 3. 卡片 (Node) 校验与连线规则

### 3.1 卡片分类与颜色规范 (`NodeCategory`)
- **`Input` (输入源)**：只有 Output 端口，无 Input 端口。如：图片上传卡片 (`input.image`)。**卡片 Header 颜色固定为蓝色 (`#3b82f6`)**。
- **`Filter` (中间处理/滤镜)**：既有 Input 端口，也有 Output 端口。如：线稿渲染 (`filter.sketch`)、RGB 分离 (`filter.rgbSplit`)、像素化 (`filter.pixel`)。**卡片 Header 颜色采用个性化/主题色**（如 `#6366f1` Indigo, `#ec4899` Magenta, `#8b5cf6` Purple）。
- **`Output` (终端输出)**：只有 Input 端口，**严格禁止产生 Output 端口**。如：SVG 输出 (`output.svg`)、ASCII 字符画输出 (`output.ascii`)、幻影坦克 (`output.mirage`)。**卡片 Header 颜色固定为绿色 (`#10b981`)**。

### 3.2 全链路防回绕与闭环检测规则 (Cycle / Recurrence Free)
1. **全链路闭环检测 (`wouldCreateCycle(sourceId, targetId)`)**：
   - 尝试创建连线 `sourceId -> targetId` 时，系统自动沿 `sourceId` 的现有上游依赖链逆向追溯。如果发现 `targetId` 已经在 `sourceId` 的祖先链路中，说明添加该连线必将形成环路 (如 `a -> b -> a` 或 `a -> b -> c -> a`)。
   - `isValidConnection` 必须直接返回 `false` 拒绝建立连线。
2. **防回绕彩蛋触发**：
   - 当用户在 `FlowCanvas` 的 `onConnectEnd` 事件中松开鼠标，且检测到 `wouldCreateCycle(fromNode.id, toNode.id)` 为 `true` 时，精确定向触发浮动气泡彩蛋 (`EasterEggPopup`)。
3. **端口数据类型兼容**：输出端口的数据类型（如 `image`）必须与目标输入端口的数据类型完全兼容匹配。
4. **纯鼠标交互 - 双击取消连线**：画布必须响应 `onEdgeDoubleClick`，支持双击任意连线直接删除，脱离键盘 `Delete` 键依赖。

---

## 4. 工作流 (Workflow) 预览与正式渲染解耦机制

为了保护系统计算性能并提供 60fps 极速调参反馈，系统严格区分 **Preview (临时预览)** 与 **Render (正式渲染提交)**：

### 4.1 Draft State vs Committed State 隔离法则（核心戒律）
系统严禁任何参数变更自动提交至正式工作流，必须遵守“选中才预览、失焦即冻结丢弃”原则：

- **Draft State (草稿参数)**：
  - 用户在卡片内或 Inspector 拖动滑块/修改控件时，**绝对只能修改 `draftParams` 本地状态**，**严禁直接调用 `onParameterChange` 修改核心 `instance.parameters`**！
  - **选中才允许 Preview**：只有当 `selected === true`（节点处于选中聚焦状态）时，才允许启动节流防抖的低清临时 Live Preview 计算（临时预览只保存在 React 组件本地，不写入 ResourceStore，不更改 `NodeExecutionState`，不影响下游）。
  - **失焦即冻结丢弃 (Discard Draft & Freeze on Blur)**：一旦卡片失去焦点 (`selected: true -> false`)，**必须立即关闭/放弃所有未提交的 Live Preview 任务与定时器**！**所有未提交的 `draftParams` 与临时 Preview 结果直接丢弃**，视图100%冻结并还原显示上一次成功点击“渲染”提交的高清结果。失焦卡片在后台绝不运行任何图像处理 Processor，确保节点扩展时内存与 CPU 开销绝对平稳！

- **Render (正式 Render 提交规则 - 唯一 Commit Point)**：
  - **触发机制**：用户在卡片或 Inspector 面板中**显式点击“渲染”/“处理输入”等 Action 按钮**。
  - **工作流提交**：将 `draftParams` 提交至 `instance.parameters`，使用无损正式分辨率启动算法管道，将正式 Output 存入 `ResourceStore` 并更新 `outputResourceId` 供下游接力使用。

---

## 5. 功能扩展规则 (Agent 开发指南)

当 Agent 需要为系统新增一种节点类型（例如新增“Dither抖动滤镜”或“高斯模糊”）时，**必须严格遵循以下步骤**：

### 步骤 1：在 `src/core/processors/` 下实现纯算法
在对应算法目录下（如 `src/core/processors/dither/`）创建计算核心逻辑：
- **必须接收上游传入的图像 Blob / ImageData 数据**。
- 处理后将结果 Blob/SVG/Text 写入 `resourceStore`，返回对应的 `resourceId`。

### 步骤 2：在 `nodeRegistry.ts` 中注册卡片元定义
在 `src/registry/nodes/` 中使用 `nodeRegistry.register({...})` 注册新节点。所有名称与选项需使用多语言对象 `{ zh: '...', en: '...' }`。所有具有复杂计算或重绘制特性的 Filter/Output 节点均需包含 `actions` 动作按钮。文案统一规范：
- `Input` 节点：**“处理输入”** (`Process Input`)
- `Filter` 节点：**“渲染”** (`Render`)
- `Output` 节点：**“处理输出”** (`Process Output`)

### 步骤 3：在 `WorkflowExecutor.ts` 中添加执行分支
在 `WorkflowExecutor.executeToNode` 方法中，添加对应 `node.type` 的分支：
- 从 `connections` 中寻找指向当前节点的直接上游节点，取得上游节点的 `outputResourceId`。
- 将上游资源传入步骤 1 的算法函数。
- 更新当前节点状态为 `success` 并记录 `outputResourceId`，以便下游节点读取。

### 步骤 4：在 UI 层关联预览组件（可选）
若卡片拥有特殊的预览模式，在 `src/components/NodePreview/` 添加对应预览组件，并在 `src/components/Node/NodeContent/` 中关联。

---

## 6. 开发规范与注意事项

7. **脏状态 (Dirty State) 传播与全路径清除规范**：
   - **触发全链污染的四大事件 (Dirty Propagation Events)**：
     1. **输入图片更换**：`input.image` 卡片更换或上传新图片后，必须立即通过 `markNodeAndDownstreamDirty(inputNodeId)` 将自身及所有递归下游节点 (`A -> B -> C -> D`) 标记为 Dirty (`dirty: true`)。
     2. **草稿参数变更**：节点在 `draftParams` 被修改时，必须通过 `markNodeAndDownstreamDirty(nodeId)` 递归将自身及所有下游节点标黄。
     3. **拓扑连线变动**：创建新连线、更换连线端口或删除连线时，必须对目标节点触发 `markNodeAndDownstreamDirty(targetNodeId)`。
     4. **节点删除**：删除上游节点时，其直连下游节点必须触发 Dirty 传播。
   - **多节点拓扑渲染与全路径 Dirty 批量清除 (Path Cleanup Rule)**：
     - `WorkflowExecutor.executeToNode` 必须返回本次执行路径的准确结果（`ExecutionPathResult`，包含 `processedNodeIds` 与 `skippedNodeIds`）。
     - 点击目标节点 `D` 渲染成功时，系统只能批量清除 `validPathIds = [...processedNodeIds, ...skippedNodeIds]`（即实际重算成功或确认缓存有效的节点）的 `dirty` 状态。
     - 如果链路中某节点（如 `C`）渲染失败，必须中止后续节点，保留 `C` 及下游 `D` 的 Dirty 标记与错误状态，不得错误清除整条链路。

1. **绝对禁止全局数据回退 (Strict Upstream Dependency)**：
   - 在获取节点输入时，**严禁**“若无上游连接则直接找全局第一个 Input 节点”这类退化逻辑。必须抛出明确错误提示：“请连接上游图像输入节点”。
2. **结构解耦禁忌**：
   - `core/` 下的代码绝对不能依赖 `reactflow` 或视图层代码。
   - 保持架构层级单向依赖：`UI Components` -> `Adapter` -> `Core` -> `Processors`。
3. **主线程性能保障**：
   - 所有密集图像处理计算必须采用 `Canvas` / `Web Worker` / 异步 Promise 操作，避免阻塞主线程交互。

4. **预览图与数值调节控制规范**：
   - 所有 Filter 和 Output 节点卡片必须实现双视图或专属 Preview 组件，展示“原图 (Original)”与“处理后”画面对比。
   - 所有卡片节点的预览容器**必须添加 `.node-preview-box` 类名**，并绑定 `data-raw-high-res-url` 属性以被全局放大镜交互监听拾取。
   - 预览组件中的 `<img>` 标签统一采用 `object-fit: contain` 保持原始宽高比例。
   - **数值精准控制规范**：所有 `slider` 类型参数必须在 Slider 拖动条旁边绑定可直接键盘手动输入的 `<input type="number" />` 数字框，支持拖拽与精确数值键入双向实时同步。
   - **复原/重置规范**：`filter.rgbSplit` 必须提供“重置”动作按钮，支持一键复原为默认色彩分离初始参数 (`0,0,0,1,0,0,1,0,0,1`)。
   - 节点拖动/修改数值调参时，必须在 `CustomNode.tsx` 的 `triggerLivePreview` 中接入 `createLowResBlob` 降采样机制以生成实时临时低清预览，点击渲染按钮时方可触发 `WorkflowExecutor` 进行无损高精度计算并写回 `ResourceStore`。

5. **输入卡片资源隔离与状态独立原则 (Input Resource Isolation Rule)**：
   - 新建的每一个 `input.image` 卡片在创建时，其 `parameters.resourceId` **必须保持初始为空 (`undefined`)**，绝对禁止自动填充或跨卡片盲目绑定历史上传的最新资源 ID。
   - 用户必须在特定卡片上显式上传或拖入图片素材后方可绑定，保障“删卡丢失，每个输入卡片资源独立隔离”，彻底防止因资源引用竞争/状态死锁引发的页面死循环或卡死故障。

6. **性能优先开箱策略与极轻量缩略图规范 (Performance-First Policy)**：
   - 系统初始化时，所有高耗能、重绘型的非核心特效（如连线 Flow 动画 `enableEdgeAnimation`、全局 MagnifierLens 监听 `enableMagnifier`）**必须默认初始化为关闭 (`false`)**。
   - **缩略图极致轻量化**：卡片临时预览调参时统一采用 `createLowResBlob` 降采样（最大维度下调至 `240px`），单张图像在解码显存中仅占用约 200KB（相比原图缩减 99%）。需要查看高清局部细节时指导用户开启放大镜。
   - **无限画布视口虚拟化**：`FlowCanvas` 统一开启 `onlyRenderVisibleElements={true}`，位于视口外的卡片 DOM/纹理自动卸载，保障长管道工作台拓扑扩展时内存平稳。

---

## 7. PNG 全局交换格式与资源管理规范

全项目节点间图像流传递与存储统一遵守 **PNG 格式交换标准**：

1. **格式统一为 `image/png`**：
   - 算法处理器生成并存入 `ResourceStore` 的 Blob，导出必须使用 `canvas.toBlob(callback, 'image/png')`。
   - 严禁自动转码或降级为 `image/jpeg`（因为 JPEG 不支持 Alpha 透明通道且会带来有损压缩杂色）。
2. **透明 Alpha 通道严格保护原则**：
   - 图像算法对逐像素（ImageData）处理时，若像素完全透明（`alpha === 0`），**必须跳过 RGB 改写与滤镜叠加**，维持 `alpha = 0`，绝对禁止将透明像素染成黑色或底色。
   - 离屏及主 Canvas 绘图前，必须显式调用 `ctx.clearRect(0, 0, width, height)`，严禁绘制默认白色/黑色填充背景。
3. **显存/内存资源生命周期管理**：
   - **ImageBitmap 及时释放**：使用 `createImageBitmap` 加载 Blob 后，计算完毕必须立即显式调用 `imgBitmap.close()` 释放显存。
   - **ObjectURL 及时撤销**：通过 `URL.createObjectURL(blob)` 创建的临时链接，在 `img.onload` / `onerror` 或组件卸载（`useEffect` cleanup）时必须显式调用 `URL.revokeObjectURL(url)`。
   - **Canvas 离屏内存清理**：导出 Blob 后将临时 Canvas 的 `width` 与 `height` 重置为 `0`，加速垃圾回收。

---

## 9. 卡片 (Node) 编写与开发规范总则

编写或新增任何卡片节点（Node）时，**必须完整实现并测试以下 6 个核心对接点**：

1. **注册元定义 (`src/registry/nodes/*.ts`)**：
   - 声明 `type`（如 `filter.pixel`）、`title`、`category`、`inputs`、`outputs`、`parameters` 与 `actions`。
   - 过滤条件控制（如条件显隐联动控件）需在 `NodeParameterForm.tsx` 中做逻辑适配。
2. **纯算法 Processor (`src/core/processors/*/`)**：
   - 必须为无 UI 依赖的纯函数/ Promise 异步算法。
   - 接收 Blob 或 ImageData，处理后存入 `resourceStore.addResource` 并返回 `resourceId`。
3. **主工作流引擎调度 (`src/core/WorkflowExecutor.ts`)**：
   - 在 `executeToNode` 中追加分支，解析直连上游节点的 `outputResourceId`，调用对应 Processor。
4. **实时草稿预览 Hook (`src/hooks/useNodeLivePreview.ts`)**：
   - 追加分支，在用户选中卡片调参时，通过 `createLowResBlob` 降采样图像运行快照，生成临时 Managed ObjectURL 提供流畅预览。
5. **卡片 UI 内容与预览组件 (`src/components/Node/NodeContent/` & `src/components/NodePreview/`)**：
   - 创建视图与 Preview 两个组件，并在 `getNodeContent(nodeType)` 中配置映射。
   - 使用 `useUpstreamResource` 获取直连上游图像，使用 `useDisplayUrl` 统一决定草稿/正式成品的展示顺序。
6. **未提交状态 (isDirty) 判重机制 (`src/components/Node/CustomNode.tsx`)**：
   - `isDirty` 计算必须通过 `getComparableParameters` 过滤掉运行时输出属性（如 `resourceId`、`outputResourceId`、`paramHash`），并进行对象的按键排序与 `undefined` 字段清洗，确保提交成功后黄框高亮即刻消除，修改参数未提交时正确高亮。
