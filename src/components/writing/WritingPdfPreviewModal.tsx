import { useState, useMemo, useRef } from 'react';
import Icon from '../common/Icon';
import { buildPreviewHtml } from '../../services/writing-pdf-export';
import type { PdfExportParams } from '../../services/writing-pdf-export';

interface Props {
  params: PdfExportParams;
  onClose: () => void;
}

export default function WritingPdfPreviewModal({ params, onClose }: Props) {
  const [isPrinting, setIsPrinting] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const htmlContent = useMemo(() => buildPreviewHtml(params), [params]);

  const handlePrint = () => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    setIsPrinting(true);
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setIsPrinting(false);
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(8, 18, 4, 0.75)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: '100%', maxWidth: 920,
        height: '92vh',
        display: 'flex', flexDirection: 'column',
        borderRadius: 14,
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        overflow: 'hidden',
      }}>
        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 18px',
          background: '#2d5a0e',
          flexShrink: 0,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 900, color: '#c8e870', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
              Aptis Tiên Phong
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
              Xem trước báo cáo — {params.examTitle}
            </div>
          </div>

          <button
            onClick={handlePrint}
            disabled={isPrinting}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '8px 20px', borderRadius: 20, border: 'none',
              background: isPrinting ? '#a8c250' : '#c8e870',
              color: '#1e3a06',
              fontSize: 13, fontWeight: 700,
              cursor: isPrinting ? 'default' : 'pointer',
              transition: 'background 160ms',
              flexShrink: 0,
            }}
            onMouseEnter={e => { if (!isPrinting) e.currentTarget.style.background = '#d6f080'; }}
            onMouseLeave={e => { if (!isPrinting) e.currentTarget.style.background = '#c8e870'; }}
          >
            <Icon name="printer" size={14} />
            In / Xuất PDF
          </button>

          <button
            onClick={onClose}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', borderRadius: 20, border: 'none',
              background: 'rgba(255,255,255,0.14)', color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              transition: 'background 160ms',
              flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.24)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.14)'; }}
          >
            <Icon name="close" size={13} />
            Đóng
          </button>
        </div>

        {/* Preview iframe */}
        <div style={{ flex: 1, overflow: 'hidden', background: '#dde6d0' }}>
          <iframe
            ref={iframeRef}
            srcDoc={htmlContent}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="PDF Preview"
            sandbox="allow-same-origin allow-scripts allow-modals"
          />
        </div>
      </div>
    </div>
  );
}
