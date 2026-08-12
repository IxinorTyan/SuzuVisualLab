# SuzuVisualLab (视觉实验室)

SuzuVisualLab 是一个基于 Web 的可视化节点式图像与视觉效果处理平台。通过节点图（Node Graph）架构，用户可以自由组合各种图像算法、滤镜与渲染管道，实现复杂的视觉艺术与效果创作。

## ✨ 特性亮点

- **节点化工作流**：支持图像输入、多种滤镜处理（像素化、RGB 分离、素描/线稿、颜色量化等）以及输出渲染（SVG 矢量化、ASCII 字符画、幻影坦克等）的自由连线与组合。
- **实时与无损模式分离**：参数调节时采用低分辨率实时快照预览，点击“渲染”提交后启动无损高精度计算，兼顾性能与效果。
- **防闭环检测与彩蛋**：连线时自动进行拓扑排序与循环依赖检测，预防死循环。
- **放大镜与连线动画**：提供局部高清放大镜探针与连线流动动画开关。
- **国际化与 JSON 工作流导入导出**：支持中英文切换以及工作流配置文件的保存、加载与文本编辑。

---

## 📜 致谢与借鉴参考

本项目在开发过程中借鉴与参考了以下开源项目与优秀算法实现，在此对原作者表示衷心的感谢：

- **像素化 (Pixel Art)**：借鉴自 [chuiliu/the-pixel-art](https://github.com/chuiliu/the-pixel-art)
- **颜色量化 (Color Quantization)**：借鉴自 [safakozdek/Color-Quantization](https://github.com/safakozdek/Color-Quantization)
- **幻影坦克 (Mirage Tank)**：借鉴自 [TankFactory/Mirage_Colored](https://github.com/TankFactory/Mirage_Colored)
- **ASCII 字符画 (ASCII Converter)**：借鉴自 [Rainbow-Dreamer/ascii_converter](https://github.com/Rainbow-Dreamer/ascii_converter)

---

## 🚀 快速开始

### 依赖安装
```bash
npm install
```

### 开发环境启动
```bash
npm run dev
```

### 项目构建
```bash
npm run build
```

---

## 🛠️ 技术栈

- **前端框架**：React + TypeScript + Vite
- **节点图引擎**：React Flow (`@xyflow/react`)
- **图标库**：Lucide React
- **图像处理**：HTML5 Canvas API / Web Workers / IndexedDB 资源缓存
