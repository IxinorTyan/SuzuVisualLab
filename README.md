# SuzuVisualLab

**English** | [中文](README_zh.md)

SuzuVisualLab is a web-based, node-graph image and visual effects processing studio. Utilizing a node graph workflow, users can flexibly combine various image algorithms, filters, and rendering pipelines to create intricate digital artwork and visual effects.

## ✨ Features

- **Node-Based Workflow**: Freely connect and chain image inputs, filter processors (Pixel Art, RGB Split, Line Art / Sketch, Color Quantization, etc.), and export renders (SVG Vectorization, ASCII Art, Mirage Tank, etc.).
- **Live Preview & Full Precision Execution**: Features real-time downscaled draft previews during parameter adjustment, switching to lossless high-precision execution upon clicking "Render".
- **Cycle Detection & Easter Eggs**: Automatic topological sorting and circular dependency checks to prevent infinite loops during node connection.
- **Floating Magnifier & Edge Animations**: Built-in high-precision floating magnifier lens probe and edge animation flow toggles.
- **JSON Workflow Import/Export**:JSON workflow saving, loading, and text editing.

---

## 📜 Acknowledgments & References

We would like to express our sincere gratitude to the original authors of the following open-source projects and algorithms that inspired and guided this project:

- **Pixel Art**: Inspired by [chuiliu/the-pixel-art](https://github.com/chuiliu/the-pixel-art)
- **Color Quantization**: Inspired by [safakozdek/Color-Quantization](https://github.com/safakozdek/Color-Quantization)
- **Mirage Tank**: Inspired by [TankFactory/Mirage_Colored](https://github.com/TankFactory/Mirage_Colored)
- **ASCII Converter**: Inspired by [Rainbow-Dreamer/ascii_converter](https://github.com/Rainbow-Dreamer/ascii_converter)

---

## 🚀 Quick Start

### Installation
```bash
npm install
```

### Start Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

---

## 🛠️ Tech Stack

- **Frontend Framework**: React + TypeScript + Vite
- **Node Graph Engine**: React Flow (`@xyflow/react`)
- **Icons**: Lucide React
- **Image Processing**: HTML5 Canvas API / Web Workers / IndexedDB Storage
