import React from 'react';
import { BookOpen, X, CheckCircle, AlertTriangle, Layers, Zap } from 'lucide-react';

interface SvgGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SvgGuideModal: React.FC<SvgGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(10, 11, 14, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '720px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-tertiary)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BookOpen size={20} style={{ color: 'var(--accent-emerald)' }} />
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              SuzuSVG 矢量化使用说明与参数指南
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body Scrollable Content */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Section 1: Target Scope */}
          <div
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}
          >
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🎯 核心定位与适用场景
            </h3>
            <p style={{ fontSize: '12px', lineHeight: '1.6', color: 'var(--text-primary)' }}>
              SVG 输出节点专注于将 <b>扁平插画、解构主义艺术、线条分明的 Logo/Icon</b> 转换为高质量矢量图。对于此类图片，转换后的 SVG 文件体积可大幅缩小且边缘极度清晰。
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#10b981', fontWeight: 600 }}>
                <CheckCircle size={14} />
                <span>✅ 推荐：线条简单、平涂色块、解构主义、扁平插画</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#ef4444', fontWeight: 600 }}>
                <AlertTriangle size={14} />
                <span>❌ 不推荐：普通二次元细节画、高密渐变、带杂色网点的写实插画</span>
              </div>
            </div>
          </div>

          {/* Section 2: Real Test Cases with Images from /eg */}
          <div>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
              📊 真实测试案例对比
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ width: '100%', height: '140px', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#121316', border: '1px solid var(--border-color)' }}>
                  <img src="/eg/svga.png" alt="Case A" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-blue)' }}>
                  解构主义插画 (案例 A)
                </h4>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>线条与色块结构清晰，无冗余细节。</p>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent-emerald)' }}>
                  转换效果：完美 | 体积：1.1 MB ➔ 11 KB (暴降 99%)
                </div>
              </div>

              <div
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ width: '100%', height: '140px', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#121316', border: '1px solid var(--border-color)' }}>
                  <img src="/eg/svgb.png" alt="Case B" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <h4 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-amber)' }}>
                  普通二次元插画 (案例 B)
                </h4>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>包含大量发丝细节、微小阴影与网点。</p>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#ef4444' }}>
                  转换效果：较差/色块碎裂 | 体积：0.5 MB ➔ 0.9 MB (反增 80%)
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Parameter Guides */}
          <div>
            <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>
              ⚙️ 参数调优指南
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              <div><b>• 矢量化模式：</b>包含“平滑曲线 (Bezier)”（拟合光滑贝塞尔曲线）与“折线多边形 (Polyline)”（纯折线极简路径，适合几何硬朗插画，实现极致小体积）。</div>
              <div><b>• 采样缩放 (%)：</b>在矢量化之前等比例缩小像素分辨率，能平滑微小像素噪点，极大降低矢量 Path 节点数并提升计算速度。</div>
              <div><b>• 量化色彩数：</b>K-means 聚类提取的色块种类。色块越少，生成的矢量图越纯净；过高会导致碎片噪点成倍增加。</div>
              <div><b>• 降噪半径 / 双边滤波：</b>平滑色彩噪声。勾选双边滤波可以在平滑降噪的同时，更好地保留锐利的色块边缘折角。</div>
              <div><b>• 噪点清理面积：</b>自动把小于该面积（px²）的孤立微小碎片像素归并进相邻最大的颜色，清理椒盐噪点。</div>
              <div><b>• 轮廓简化容差：</b>使用 RDP 算法拉直多边形边缘。数值越大节点越少、线条越直。</div>
              <div><b>• 角点硬度：</b>控制角点检测敏感度。数值越高保留越多硬朗转角折线；数值越低只有明显尖角被识别为角点。</div>
              <div><b>• 贝塞尔拟合容差 (px)：</b>控制三次贝塞尔曲线与原始轮廓允许的最大像素误差，数值越大拉直程度越高。</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
