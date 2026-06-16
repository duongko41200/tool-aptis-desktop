import { useState, useEffect } from 'react';
import Icon from '../common/Icon';
import { invoke } from '@tauri-apps/api/core';
import { pingBackend } from '../../lib/rag-api';

type Step =
  | 'checking'
  | 'backend_offline'
  | 'starting_backend'
  | 'ready';

interface BackendDiagnostics {
  port_open: boolean;
  backend_dir: string | null;
  log: string;
  pid_on_port: number | null;
}

interface Props {
  onReady: () => void;
  onDismiss?: () => void;
}

export default function RagSetupModal({ onReady, onDismiss }: Props) {
  const [step, setStep]             = useState<Step>('checking');
  const [backendStartMsg, setBackendStartMsg] = useState('');
  const [diagnostics, setDiagnostics] = useState<BackendDiagnostics | null>(null);
  const [showLog, setShowLog]       = useState(false);

  const loadDiagnostics = async () => {
    const d = await invoke<BackendDiagnostics>('get_backend_diagnostics').catch(() => null);
    setDiagnostics(d);
    return d;
  };

  const startBackendAuto = async () => {
    setStep('starting_backend');
    setBackendStartMsg('Đang khởi động uvicorn...');
    setDiagnostics(null);

    let spawnResult = '';
    try {
      spawnResult = await invoke<string>('start_rag_backend');
    } catch (e: unknown) {
      const d = await loadDiagnostics();
      setBackendStartMsg(`Lỗi: ${String(e)}\n${d?.log ?? ''}`);
      setStep('backend_offline');
      return;
    }

    if (spawnResult === 'already_running') {
      setBackendStartMsg('Backend đã chạy. Đang kiểm tra...');
    } else {
      setBackendStartMsg(`Đã spawn (${spawnResult}). Chờ uvicorn load...`);
    }

    let alive = false;
    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 2000));
      setBackendStartMsg(`Chờ backend khởi động... (${(i + 1) * 2}s / 30s)`);
      alive = await pingBackend();
      if (alive) break;
    }

    if (!alive) {
      const d = await loadDiagnostics();
      setDiagnostics(d);
      setBackendStartMsg('Backend không phản hồi sau 30s. Xem log bên dưới để tìm lỗi.');
      setStep('backend_offline');
      return;
    }

    setStep('ready');
    onReady();
  };

  useEffect(() => {
    (async () => {
      const alive = await pingBackend();
      if (alive) {
        setStep('ready');
        onReady();
      } else {
        setStep('backend_offline');
      }
    })();
  }, [onReady]);  // eslint-disable-line

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(8,12,6,0.78)',
      backdropFilter: 'blur(6px)',
    }}>
      <div className="glass rise" style={{
        width: 440, padding: 32,
        display: 'flex', flexDirection: 'column', gap: 24,
        borderRadius: 'var(--r-xl)',
      }}>

        {/* Logo + close */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{
            width: 48, height: 48, borderRadius: 'var(--r-lg)', flexShrink: 0,
            background: 'var(--accent)', color: 'var(--accent-ink)',
            display: 'grid', placeItems: 'center', boxShadow: 'var(--sh-glow)',
          }}>
            <Icon name="sparkle" size={24} />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)' }}>RAG Chat</div>
            <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 2 }}>Thiết lập trước khi bắt đầu</div>
          </div>
          {onDismiss && step !== 'starting_backend' && (
            <button onClick={onDismiss}
              style={{
                width: 34, height: 34, borderRadius: 'var(--r-pill)',
                background: 'rgba(40,55,30,0.08)', border: '1px solid var(--glass-edge)',
                display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0,
                transition: 'all 140ms var(--ease)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(40,55,30,0.16)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(40,55,30,0.08)'; }}
              title="Bỏ qua, thiết lập sau"
            >
              <Icon name="close" size={16} style={{ color: 'var(--ink-3)' }} />
            </button>
          )}
        </div>

        {/* ── checking ── */}
        {step === 'checking' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid var(--accent)', borderTopColor: 'transparent', animation: 'rag-spin 0.8s linear infinite', margin: '0 auto 14px' }} />
            <div style={{ fontSize: 14, color: 'var(--ink-2)' }}>Đang kiểm tra backend...</div>
          </div>
        )}

        {/* ── backend_offline ── */}
        {step === 'backend_offline' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{
              padding: '14px 16px', borderRadius: 'var(--r-md)',
              background: 'rgba(217,138,106,0.12)', border: '1px solid rgba(217,138,106,0.3)',
              display: 'flex', gap: 12, alignItems: 'flex-start',
            }}>
              <Icon name="lightbulb" size={18} style={{ color: 'var(--warn)', flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>Python backend chưa chạy</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 3 }}>
                  RAG Chat cần Python backend (port 8080) để hoạt động.
                </div>
              </div>
            </div>

            <button className="btn btn-primary" style={{ justifyContent: 'center', gap: 8 }} onClick={startBackendAuto}>
              <Icon name="arrowR" size={16} /> Tự động khởi động backend
            </button>

            <button
              className="btn btn-soft btn-sm"
              style={{ justifyContent: 'center', gap: 8 }}
              onClick={async () => {
                setStep('checking');
                const alive = await pingBackend();
                if (alive) { setStep('ready'); onReady(); }
                else setStep('backend_offline');
              }}
            >
              <Icon name="refresh" size={14} /> Kiểm tra lại
            </button>

            <div style={{
              padding: '12px 14px', borderRadius: 'var(--r-md)',
              background: 'rgba(217,138,106,0.08)', border: '1px solid rgba(217,138,106,0.25)',
              fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.7,
            }}>
              Hoặc mở terminal và chạy thủ công:<br />
              <code style={{ fontFamily: 'var(--font-mono)', background: 'rgba(40,55,30,0.08)', padding: '4px 8px', borderRadius: 4, display: 'inline-block', marginTop: 5, fontSize: 11.5 }}>
                cd backend &amp;&amp; uvicorn main:app --port 8080
              </code>
            </div>

            {/* Debug section */}
            <div style={{ borderTop: '1px solid var(--glass-line)', paddingTop: 12 }}>
              <button
                onClick={async () => {
                  if (!diagnostics) await loadDiagnostics();
                  setShowLog(v => !v);
                }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 12, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <Icon name="chevR" size={13} style={{ transform: showLog ? 'rotate(90deg)' : 'none', transition: '150ms' }} />
                Debug info
              </button>

              {showLog && diagnostics && (
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.8, fontFamily: 'var(--font-mono)' }}>
                    <div>port_open: <strong style={{ color: diagnostics.port_open ? 'var(--good)' : 'var(--bad)' }}>{String(diagnostics.port_open)}</strong></div>
                    <div>pid_on_port: <strong>{diagnostics.pid_on_port ?? 'none'}</strong></div>
                    <div>backend_dir: <span style={{ wordBreak: 'break-all' }}>{diagnostics.backend_dir ?? 'not found'}</span></div>
                  </div>
                  <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', background: 'rgba(40,55,30,0.06)', borderRadius: 'var(--r-sm)', padding: '10px 12px', maxHeight: 160, overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: 'var(--ink-2)', lineHeight: 1.6 }}>
                    {diagnostics.log || '(log trống)'}
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ alignSelf: 'flex-start', fontSize: 11 }}
                    onClick={loadDiagnostics}
                  >
                    <Icon name="refresh" size={12} /> Làm mới
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── starting_backend ── */}
        {step === 'starting_backend' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', padding: '20px 0' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid var(--accent)', borderTopColor: 'transparent', animation: 'rag-spin 0.8s linear infinite' }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>Đang khởi động Python backend...</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-2)', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
              {backendStartMsg}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
