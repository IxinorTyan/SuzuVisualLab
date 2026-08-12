import React, { useState, useEffect } from 'react';
import { X, Copy, Check, FileCode, ArrowDownToLine } from 'lucide-react';
import { useToast } from './ToastContainer';

interface WorkflowJsonModalProps {
  isOpen: boolean;
  onClose: () => void;
  jsonString: string;
  onImport: (jsonText: string) => boolean;
}

export const WorkflowJsonModal: React.FC<WorkflowJsonModalProps> = ({
  isOpen,
  onClose,
  jsonString,
  onImport
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [importText, setImportText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setImportText('');
      setErrorMessage(null);
      setCopied(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(jsonString).then(() => {
        setCopied(true);
        showToast('JSON 文本已复制到剪贴板！', 'success');
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {
        fallbackCopy();
      });
    } else {
      fallbackCopy();
    }
  };

  const fallbackCopy = () => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = jsonString;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      showToast('JSON 文本已复制到剪贴板！', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      showToast('复制失败，请手动选择复制', 'error');
    }
  };

  const handleImportSubmit = () => {
    setErrorMessage(null);
    if (!importText.trim()) {
      setErrorMessage('请输入或粘贴工作流 JSON 文本');
      return;
    }

    const workflowData = (window as any).__SUZU_WORKFLOW_DATA__;
    const hasNodes = Array.isArray(workflowData?.nodes) && workflowData.nodes.length > 0;

    if (hasNodes && !window.confirm('导入将替换当前画布，确定要继续吗？')) {
      return;
    }

    try {
      const success = onImport(importText);
      if (success) {
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || '工作流 JSON 解析或导入失败');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '600px',
          maxWidth: '90vw',
          maxHeight: '80vh',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '14px 20px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-tertiary)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileCode size={18} style={{ color: 'var(--accent-blue)' }} />
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
              工作流 JSON 纯文本管理
            </span>
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
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selection */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-secondary)',
            padding: '0 16px'
          }}
        >
          <button
            onClick={() => setActiveTab('export')}
            style={{
              padding: '10px 16px',
              fontSize: '12px',
              fontWeight: 600,
              color: activeTab === 'export' ? 'var(--accent-blue)' : 'var(--text-muted)',
              borderBottom: activeTab === 'export' ? '2px solid var(--accent-blue)' : '2px solid transparent',
              background: 'transparent',
              borderLeft: 'none',
              borderRight: 'none',
              borderTop: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <FileCode size={14} />
            <span>导出 JSON 文本</span>
          </button>

          <button
            onClick={() => setActiveTab('import')}
            style={{
              padding: '10px 16px',
              fontSize: '12px',
              fontWeight: 600,
              color: activeTab === 'import' ? 'var(--accent-blue)' : 'var(--text-muted)',
              borderBottom: activeTab === 'import' ? '2px solid var(--accent-blue)' : '2px solid transparent',
              background: 'transparent',
              borderLeft: 'none',
              borderRight: 'none',
              borderTop: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <ArrowDownToLine size={14} />
            <span>粘贴文本导入</span>
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column' }}>
          {activeTab === 'export' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  包含节点结构、排版位置与参数（已自动剔除图片等二进制数据）：
                </span>
                <button
                  onClick={handleCopy}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: copied ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-tertiary)',
                    color: copied ? 'var(--accent-emerald)' : 'var(--text-primary)',
                    cursor: 'pointer'
                  }}
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copied ? '已复制' : '复制 JSON 文本'}</span>
                </button>
              </div>

              <pre
                style={{
                  flex: 1,
                  minHeight: '260px',
                  maxHeight: '380px',
                  margin: 0,
                  padding: '12px',
                  backgroundColor: 'var(--bg-primary)',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  color: '#38bdf8',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  lineHeight: 1.5,
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all'
                }}
              >
                {jsonString}
              </pre>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                在下方文本框中粘贴工作流 JSON 代码字符串进行还原导入：
              </span>

              <textarea
                value={importText}
                onChange={(e) => {
                  setImportText(e.target.value);
                  setErrorMessage(null);
                }}
                placeholder="在此粘贴工作流 JSON 文本..."
                style={{
                  width: '100%',
                  height: '240px',
                  backgroundColor: 'var(--bg-primary)',
                  borderRadius: '6px',
                  border: `1px solid ${errorMessage ? '#ef4444' : 'var(--border-color)'}`,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  padding: '12px',
                  resize: 'none',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />

              {errorMessage && (
                <div
                  style={{
                    padding: '8px 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '6px'
                  }}
                >
                  ⚠ {errorMessage}
                </div>
              )}

              <button
                onClick={handleImportSubmit}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: 'var(--accent-blue)',
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 6px rgba(59, 130, 246, 0.3)'
                }}
              >
                <span>解析并导入工作流</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
