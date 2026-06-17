import { useState, useEffect, useRef } from 'react';
import AddToVocabSection from './AddToVocabSection';
import Icon from '../common/Icon';

interface Props {
  content: string;
  charCount: number;
  onClose: () => void;
}

const DISMISS_SEC = 30;

export default function ClipboardPopup({ content, charCount, onClose }: Props) {
  const [countdown, setCountdown] = useState(DISMISS_SEC);
  const dismissRef = useRef<number | null>(null);
  const cdRef = useRef<number | null>(null);

  const clearTimers = () => {
    if (dismissRef.current) clearTimeout(dismissRef.current);
    if (cdRef.current) clearInterval(cdRef.current);
  };

  const close = () => {
    clearTimers();
    onClose();
  };

  const resetTimer = () => {
    clearTimers();
    setCountdown(DISMISS_SEC);
    dismissRef.current = window.setTimeout(close, DISMISS_SEC * 1000);
    cdRef.current = window.setInterval(() => setCountdown(p => p > 1 ? p - 1 : 0), 1000);
  };

  useEffect(() => { resetTimer(); return clearTimers; }, [content]);

  useEffect(() => {
    const h = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const preview = content.length > 500 ? content.slice(0, 500) + '…' : content;
  const ringPct = (countdown / DISMISS_SEC) * 283;

  return (
    <div style={{ width: '100%', height: '100%', boxSizing: 'border-box' }}>
      <div
        className="darkglass rise"
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: 'var(--sh-lg)', border: '1px solid var(--darkglass-line)',
          background: 'var(--darkglass)' // Dark cozy theme for popup
        }}
        onMouseEnter={resetTimer}
      >
        {/* Header */}
        <div
          data-tauri-drag-region
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--darkglass-line)' }}
          className="cursor-grab active:cursor-grabbing"
        >
          <div className="flex items-center gap-3">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: '50%', background: 'rgba(217,232,157,0.15)', color: 'var(--accent)' }}>
              <Icon name="sparkle" size={16} />
            </div>
            <span style={{ color: 'var(--on-dark)', fontWeight: 700, fontSize: 15, letterSpacing: '0.02em' }}>Đã Copy Văn Bản</span>
          </div>
          <div className="flex items-center gap-3">
            <svg width="24" height="24" viewBox="0 0 50 50">
              <circle cx="25" cy="25" r="20" fill="none" stroke="var(--darkglass-line)" strokeWidth="4" />
              <circle cx="25" cy="25" r="20" fill="none" stroke="var(--accent)" strokeWidth="4"
                strokeDasharray={`${ringPct} 283`} strokeLinecap="round" transform="rotate(-90 25 25)"
                style={{ transition: 'stroke-dasharray 0.9s linear' }} />
              <text x="25" y="30" textAnchor="middle" fill="var(--on-dark)" fontSize="14" fontWeight="bold">{countdown}</text>
            </svg>
            <button onClick={close} className="iconbtn" style={{ width: 28, height: 28, fontSize: 18 }}>×</button>
          </div>
        </div>

        <div className="scroll" style={{ flex: 1, overflowY: 'auto' }}>
          {/* Content preview */}
          <div style={{ padding: '20px 20px 0' }}>
            <div className="scroll"
              style={{
                background: 'rgba(0,0,0,0.25)', color: 'var(--on-dark-2)',
                border: '1px solid var(--darkglass-line)', borderRadius: 'var(--r-md)',
                padding: '12px 16px', fontSize: 14, lineHeight: 1.6, maxHeight: 180, overflowY: 'auto',
                boxShadow: 'inset 0 2px 12px rgba(0,0,0,0.2)'
              }}>
              {preview}
            </div>
            <p style={{ textAlign: 'right', fontSize: 12, color: 'var(--ink-3)', marginTop: 6 }}>{charCount} characters</p>
          </div>

          <div style={{ padding: '10px 20px 20px' }}>
            <AddToVocabSection content={content} onSaved={close} />
          </div>
        </div>

      </div>
    </div >
  );
}
