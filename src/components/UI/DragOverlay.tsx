import React, { useEffect, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { resourceStore } from '../../core/ResourceStore';
import { useToast } from './ToastContainer';

export const DragOverlay: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    let dragCounter = 0;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter++;
      if (e.dataTransfer && e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
        setIsActive(true);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        setIsActive(false);
      }
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter = 0;
      setIsActive(false);

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.type.startsWith('image/')) {
          await resourceStore.addResource(file.name, 'image', file);
          showToast('Image imported successfully!', 'success');
        } else {
          showToast('Please drop an image file.', 'warning');
        }
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [showToast]);

  if (!isActive) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(18, 19, 22, 0.85)',
        backdropFilter: 'blur(8px)',
        zIndex: 999999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        animation: 'fadeIn 0.15s ease'
      }}
    >
      <div
        style={{
          backgroundColor: '#1e2029',
          border: '3px dashed var(--accent-blue)',
          borderRadius: '16px',
          padding: '40px 60px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 30px rgba(59, 130, 246, 0.4)'
        }}
      >
        <UploadCloud size={64} style={{ color: 'var(--accent-blue)', animation: 'bounce 1s infinite' }} />
        <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff' }}>
          释放图片以立即导入
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Drop image anywhere to import as primary input
        </p>
      </div>
    </div>
  );
};
