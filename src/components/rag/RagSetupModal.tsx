import { useState, useEffect, useRef } from 'react';
import Icon from '../common/Icon';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import {
  ragModelStatus, pingBackend, ragPullModel, ragPullEmbedModel, ragValidateOpenAIKey,
  type ModelStatus, type PullProgress,
} from '../../lib/rag-api';

type Step =
  | 'checking'
  | 'no_ollama'
  | 'downloading_ollama'
  | 'install_done'        // winget xong, chờ Ollama khởi động
  | 'starting_ollama'     // đang start ollama serve
  | 'backend_offline'     // Ollama chạy OK nhưng Python backend chưa start
  | 'starting_backend'    // đang auto-start Python backend
  | 'no_embed'            // LLM model OK nhưng chưa có embed model
  | 'pulling_embed'       // đang pull embed model
  | 'no_model'
  | 'pulling'
  | 'openai_setup'
  | 'openai_testing'
  | 'ready';

interface BackendDiagnostics {
  port_open: boolean;
  backend_dir: string | null;
  log: string;
  pid_on_port: number | null;
}

interface DownloadProgress {
  downloaded: number;
  total: number;
  percent: number;
  done: boolean;
  message: string;
  error?: string;
}

interface Props {
  onReady: (config: { mode: 'ollama' | 'openai'; openaiKey?: string }) => void;
  onDismiss?: () => void;
}

function Bar({ pct }: { pct: number }) {
  return (
    <div style={{ height: 8, borderRadius: 9999, background: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
      <div style={{
        height: '100%', borderRadius: 9999,
        background: 'linear-gradient(90deg, var(--accent-deep), var(--accent))',
        width: `${pct}%`,
        transition: 'width 300ms var(--ease)',
        boxShadow: '0 0 10px rgba(170,203,79,0.5)',
      }} />
    </div>
  );
}

export default function RagSetupModal({ onReady, onDismiss }: Props) {
  const [step, setStep]         = useState<Step>('checking');
  const [status, setStatus]     = useState<ModelStatus | null>(null);
  const [pull, setPull]         = useState<PullProgress | null>(null);
  const [embedPull, setEmbedPull] = useState<PullProgress | null>(null);
  const [pullLabel, setPullLabel] = useState('Chuẩn bị...');
  const [openaiKey, setOpenaiKey]   = useState('');
  const [keyError, setKeyError]     = useState('');
  const [dlProgress, setDlProgress] = useState<DownloadProgress | null>(null);
  const [diagnostics, setDiagnostics] = useState<BackendDiagnostics | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [backendStartMsg, setBackendStartMsg] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const loadDiagnostics = async () => {
    const d = await invoke<BackendDiagnostics>('get_backend_diagnostics').catch(() => null);
    setDiagnostics(d);
    return d;
  };

  const startBackendAuto = async () => {
    setStep('starting_backend');
    setBackendStartMsg('Đang khởi động uvicorn...');
    setDiagnostics(null);

    // Gọi start_rag_backend Tauri command
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

    // Bước 1: Poll /ping mỗi 2s tối đa 30s — /ping không cần Ollama nên nhanh
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

    // Bước 2: Backend alive → gọi /models/status (có thể chậm vì gọi Ollama)
    setBackendStartMsg('Backend đã chạy, đang kiểm tra model...');
    const s = await ragModelStatus();
    if (!s.backend_offline) {
      setStatus(s);
      resolveStep(s);
      return;
    }

    // Timeout — load diagnostics để hiện debug
    const d = await loadDiagnostics();
    setDiagnostics(d);
    setBackendStartMsg('Timeout sau 30s. Xem log bên dưới để tìm lỗi.');
    setStep('backend_offline');
  };

  const resolveStep = (s: ModelStatus) => {
    if (s.backend_offline)   { setStep('backend_offline'); return; }
    if (!s.model_available)  { setStep('no_model'); return; }
    if (!s.embed_ready)      { setStep('no_embed'); return; }
    setStep('ready');
    onReady({ mode: 'ollama' });
  };

  // Check status on mount
  useEffect(() => {
    (async () => {
      const ollamaRunning = await invoke<boolean>('check_ollama_running').catch(() => false);
      if (!ollamaRunning) { setStep('no_ollama'); return; }
      const s = await ragModelStatus();
      setStatus(s);
      resolveStep(s);
    })();
  }, [onReady]);  // eslint-disable-line

  // Pull embed model
  const startPullEmbed = async () => {
    setStep('pulling_embed');
    setEmbedPull(null);
    abortRef.current = new AbortController();
    try {
      await ragPullEmbedModel((p) => {
        setEmbedPull(p);
        if (p.done) { setStep('ready'); onReady({ mode: 'ollama' }); }
      }, abortRef.current.signal);
    } catch (e: unknown) {
      if ((e as Error)?.name !== 'AbortError') setStep('no_embed');
    }
  };

  // Pull model
  const startPull = async () => {
    setStep('pulling');
    setPull(null);
    abortRef.current = new AbortController();
    try {
      await ragPullModel((p) => {
        setPull(p);
        if (p.status) setPullLabel(p.status);
        if (p.done) {
          setStep('ready');
          onReady({ mode: 'ollama' });
        }
      }, abortRef.current.signal);
    } catch (e: unknown) {
      if ((e as Error)?.name !== 'AbortError') {
        setStep('no_model');
      }
    }
  };

  // Kiểm tra lại sau khi cài Ollama — dùng Rust check trực tiếp port 11434
  const checkAfterInstall = async () => {
    setStep('starting_ollama');

    // Thử start Ollama service (nếu chưa chạy)
    try { await invoke('start_ollama'); } catch { /* ollama chưa cài hoặc đã chạy rồi */ }

    // Chờ Ollama khởi động (tối đa 6s, kiểm tra mỗi giây)
    let ollamaOk = false;
    for (let i = 0; i < 6; i++) {
      await new Promise(r => setTimeout(r, 1000));
      ollamaOk = await invoke<boolean>('check_ollama_running');
      if (ollamaOk) break;
    }

    if (!ollamaOk) {
      setStep('install_done'); // Vẫn chưa chạy, cho user làm thủ công
      return;
    }

    // Ollama chạy rồi — giờ check qua Python backend
    const s = await ragModelStatus();
    setStatus(s);

    if (s.backend_offline) {
      // Ollama OK nhưng Python backend chưa start
      setStep('backend_offline');
    } else if (s.model_available) {
      setStep('ready');
      onReady({ mode: 'ollama' });
    } else {
      setStep('no_model');
    }
  };

  // Tải Ollama qua winget
  const startDownloadOllama = async () => {
    setStep('downloading_ollama');
    setDlProgress({ downloaded: 0, total: 0, percent: 0, done: false, message: 'Đang khởi động winget...' });

    const unlisten = await listen<DownloadProgress>('ollama:progress', (e) => {
      setDlProgress(e.payload);
      if (e.payload.done) {
        unlisten();
        // winget hoàn tất → chuyển sang bước xác nhận
        setStep('install_done');
      }
      if (e.payload.error) {
        unlisten();
        // giữ nguyên dlProgress để hiện lỗi, không tự chuyển step
      }
    });

    try {
      await invoke('download_ollama');
    } catch (e: unknown) {
      unlisten();
      setDlProgress(prev => ({
        ...(prev ?? { downloaded: 0, total: 0, percent: 0, done: false, message: '' }),
        error: String(e),
      }));
    }
  };

  // Validate OpenAI key
  const submitOpenAIKey = async () => {
    if (!openaiKey.startsWith('sk-')) {
      setKeyError('Key phải bắt đầu bằng "sk-"');
      return;
    }
    setKeyError('');
    setStep('openai_testing');
    const valid = await ragValidateOpenAIKey(openaiKey).catch(() => false);
    if (valid) {
      localStorage.setItem('rag_openai_key', openaiKey);
      setStep('ready');
      onReady({ mode: 'openai', openaiKey });
    } else {
      setKeyError('Key không hợp lệ hoặc hết hạn');
      setStep('openai_setup');
    }
  };

  const pct = pull?.total && pull.completed
    ? Math.round((pull.completed / pull.total) * 100)
    : 0;

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
          {onDismiss && step !== 'pulling' && step !== 'downloading_ollama' && step !== 'pulling_embed' && (
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
            <div style={{ fontSize: 14, color: 'var(--ink-2)' }}>Đang kiểm tra Ollama...</div>
          </div>
        )}

        {/* ── no_ollama ── */}
        {step === 'no_ollama' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              padding: '14px 16px', borderRadius: 'var(--r-md)',
              background: 'rgba(217,138,106,0.12)', border: '1px solid rgba(217,138,106,0.3)',
              display: 'flex', gap: 12, alignItems: 'flex-start',
            }}>
              <Icon name="lightbulb" size={18} style={{ color: 'var(--warn)', flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>Ollama chưa chạy trên máy</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 4, lineHeight: 1.5 }}>
                  RAG Chat cần Ollama để chạy AI offline. Bạn có thể tải về miễn phí hoặc dùng OpenAI API thay thế.
                </div>
              </div>
            </div>

            {/* Option A — tải Ollama */}
            <div style={{
              padding: '18px 20px', borderRadius: 'var(--r-md)',
              border: '1.5px solid var(--glass-line)',
              background: 'rgba(217,232,157,0.06)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ padding: '3px 9px', borderRadius: 'var(--r-pill)', background: 'rgba(111,174,90,0.2)', color: 'var(--good)', fontSize: 11, fontWeight: 800 }}>MIỄN PHÍ · OFFLINE</span>
              </div>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--ink)', marginBottom: 6 }}>Dùng Ollama + Qwen3:4b</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.55, marginBottom: 14 }}>
                Cài Ollama (1 lần), app tự tải model ~2.5 GB. Sau đó chat hoàn toàn offline, miễn phí mãi mãi.
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={startDownloadOllama}
                  style={{ gap: 7 }}
                >
                  <Icon name="arrowR" size={15} /> Tải Ollama về máy
                </button>
                <button
                  className="btn btn-soft btn-sm"
                  onClick={() => ragModelStatus().then(s => {
                    setStatus(s);
                    if (s.ollama_running) setStep(s.model_available ? 'ready' : 'no_model');
                  })}
                >
                  <Icon name="refresh" size={14} /> Kiểm tra lại
                </button>
              </div>
            </div>

            {/* Option B — OpenAI */}
            <button
              onClick={() => setStep('openai_setup')}
              style={{
                width: '100%', textAlign: 'left', padding: '14px 18px',
                borderRadius: 'var(--r-md)', cursor: 'pointer',
                border: '1px solid var(--glass-edge)',
                background: 'rgba(255,255,255,0.45)',
                display: 'flex', alignItems: 'center', gap: 12,
                transition: 'all 160ms var(--ease)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.7)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.45)'; }}
            >
              <span style={{ width: 38, height: 38, borderRadius: 'var(--r-md)', background: 'rgba(106,166,196,0.18)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                <Icon name="sparkle" size={18} style={{ color: 'var(--info)' }} />
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>Dùng OpenAI API</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>Cần API key + internet · Tốt nhất cho chất lượng</div>
              </div>
              <Icon name="chevR" size={16} style={{ color: 'var(--ink-3)' }} />
            </button>
          </div>
        )}

        {/* ── downloading_ollama ── */}
        {step === 'downloading_ollama' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>
              Đang cài Ollama qua winget...
            </div>

            <Bar pct={dlProgress?.percent ?? 0} />

            <div style={{
              fontSize: 11.5, color: 'var(--ink-2)', fontFamily: 'var(--font-mono)',
              background: 'rgba(40,55,30,0.06)', borderRadius: 'var(--r-sm)',
              padding: '10px 12px', minHeight: 40, wordBreak: 'break-all', lineHeight: 1.6,
            }}>
              {dlProgress?.error
                ? <span style={{ color: 'var(--bad)' }}>{dlProgress.error}</span>
                : dlProgress?.message || 'Đang khởi động...'}
            </div>

            {dlProgress?.error && (
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-primary btn-sm" onClick={startDownloadOllama}>
                  <Icon name="refresh" size={14} /> Thử lại
                </button>
                <button className="btn btn-soft btn-sm" onClick={() => setStep('no_ollama')}>
                  Quay lại
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── install_done ── winget xong, Ollama chưa detect được */}
        {step === 'install_done' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={{
              padding: '14px 16px', borderRadius: 'var(--r-md)',
              background: 'rgba(111,174,90,0.12)', border: '1px solid rgba(111,174,90,0.35)',
              display: 'flex', gap: 12, alignItems: 'flex-start',
            }}>
              <Icon name="checkCircle" size={20} style={{ color: 'var(--good)', flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)' }}>Cài đặt hoàn tất!</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 4, lineHeight: 1.55 }}>
                  Ollama đã được cài xong. Nhấn <strong>Kiểm tra lại</strong> để app kết nối với Ollama.
                </div>
              </div>
            </div>

            <div style={{
              padding: '11px 14px', borderRadius: 'var(--r-sm)',
              background: 'rgba(217,232,157,0.08)', border: '1px solid rgba(217,232,157,0.2)',
              fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.6,
            }}>
              Nếu Ollama chưa tự khởi động, hãy mở <strong>Ollama</strong> từ Start Menu, chờ icon xuất hiện trên thanh taskbar rồi nhấn Kiểm tra lại.
            </div>

            <button className="btn btn-primary" style={{ justifyContent: 'center', gap: 8 }} onClick={checkAfterInstall}>
              <Icon name="refresh" size={16} /> Kiểm tra lại
            </button>
          </div>
        )}

        {/* ── starting_ollama ── đang thử start service */}
        {step === 'starting_ollama' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', padding: '20px 0' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid var(--accent)', borderTopColor: 'transparent', animation: 'rag-spin 0.8s linear infinite' }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>Đang khởi động Ollama...</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-2)', textAlign: 'center' }}>Chờ tối đa 6 giây</div>
          </div>
        )}

        {/* ── starting_backend ── đang auto-start Python backend */}
        {step === 'starting_backend' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', padding: '20px 0' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid var(--accent)', borderTopColor: 'transparent', animation: 'rag-spin 0.8s linear infinite' }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>Đang khởi động Python backend...</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-2)', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
              {backendStartMsg}
            </div>
          </div>
        )}

        {/* ── backend_offline ── Ollama chạy nhưng Python backend chưa start */}
        {step === 'backend_offline' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{
              padding: '14px 16px', borderRadius: 'var(--r-md)',
              background: 'rgba(217,232,157,0.1)', border: '1px solid rgba(217,232,157,0.3)',
              display: 'flex', gap: 12, alignItems: 'flex-start',
            }}>
              <Icon name="checkCircle" size={18} style={{ color: 'var(--good)', flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>Ollama đang chạy</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 3 }}>Python backend (port 8080) chưa phản hồi.</div>
              </div>
            </div>

            {/* Nút auto-start */}
            <button className="btn btn-primary" style={{ justifyContent: 'center', gap: 8 }} onClick={startBackendAuto}>
              <Icon name="arrowR" size={16} /> Tự động khởi động backend
            </button>

            {/* Kiểm tra lại thủ công */}
            <button
              className="btn btn-soft btn-sm"
              style={{ justifyContent: 'center', gap: 8 }}
              onClick={async () => {
                setStep('checking');
                const alive = await pingBackend();
                if (!alive) { setStep('backend_offline'); return; }
                const s = await ragModelStatus();
                setStatus(s);
                if (s.backend_offline) { setStep('backend_offline'); return; }
                if (s.model_available) { setStep('ready'); onReady({ mode: 'ollama' }); }
                else setStep('no_model');
              }}
            >
              <Icon name="refresh" size={14} /> Kiểm tra lại (thủ công)
            </button>

            {/* Manual command */}
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

            <button onClick={() => setStep('openai_setup')} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 12, color: 'var(--ink-3)', textDecoration: 'underline', textAlign: 'center',
            }}>
              Dùng OpenAI API thay thế (không cần backend)
            </button>
          </div>
        )}

        {/* ── no_model ── */}
        {step === 'no_model' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              padding: '14px 16px', borderRadius: 'var(--r-md)',
              background: 'rgba(217,232,157,0.1)', border: '1px solid rgba(217,232,157,0.3)',
              display: 'flex', gap: 12, alignItems: 'flex-start',
            }}>
              <Icon name="checkCircle" size={18} style={{ color: 'var(--good)', flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>Ollama đã chạy</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 3 }}>
                  Chỉ cần tải thêm model <code style={{ fontFamily: 'var(--font-mono)', background: 'rgba(40,55,30,0.08)', padding: '1px 5px', borderRadius: 4 }}>{status?.model ?? 'qwen3:4b'}</code> (~2.5 GB)
                </div>
              </div>
            </div>

            <div style={{ padding: '16px 18px', borderRadius: 'var(--r-md)', background: 'rgba(255,255,255,0.5)', border: '1px solid var(--glass-line)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>Qwen3:4b</span>
                <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>~2.5 GB</span>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.55, marginBottom: 14 }}>
                Model AI nhỏ gọn, hỗ trợ tiếng Việt tốt, chạy offline hoàn toàn. Tải 1 lần, dùng mãi mãi.
              </div>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', gap: 8 }} onClick={startPull}>
                <Icon name="arrowR" size={17} /> Tải model ngay
              </button>
            </div>

            <button onClick={() => setStep('openai_setup')} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, color: 'var(--ink-3)', textDecoration: 'underline', textAlign: 'center',
            }}>
              Dùng OpenAI API thay thế
            </button>
          </div>
        )}

        {/* ── pulling ── */}
        {step === 'pulling' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--ink)' }}>Đang tải {status?.model ?? 'qwen3:4b'}...</div>

            <Bar pct={pct} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12.5, color: 'var(--ink-2)', fontFamily: 'var(--font-mono)' }}>{pullLabel}</span>
              <span style={{ fontSize: 12.5, color: 'var(--accent-deep)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                {pct > 0 ? `${pct}%` : ''}
              </span>
            </div>

            {pull?.total && pull.completed ? (
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)', textAlign: 'center' }}>
                {(pull.completed / 1024 / 1024 / 1024).toFixed(2)} GB / {(pull.total / 1024 / 1024 / 1024).toFixed(2)} GB
              </div>
            ) : null}

            <button
              onClick={() => { abortRef.current?.abort(); setStep('no_model'); }}
              className="btn btn-ghost btn-sm"
              style={{ alignSelf: 'center' }}
            >
              Huỷ
            </button>
          </div>
        )}

        {/* ── no_embed ── LLM model OK nhưng chưa có embed model */}
        {step === 'no_embed' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{
              padding: '14px 16px', borderRadius: 'var(--r-md)',
              background: 'rgba(217,138,106,0.12)', border: '1px solid rgba(217,138,106,0.3)',
              display: 'flex', gap: 12, alignItems: 'flex-start',
            }}>
              <Icon name="lightbulb" size={18} style={{ color: 'var(--warn)', flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>Chưa có Embedding Model</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 4, lineHeight: 1.55 }}>
                  RAG Chat đang dùng tìm kiếm từ khoá (BM25) thay thế. Để tìm kiếm ngữ nghĩa chính xác hơn, hãy tải <code style={{ fontFamily: 'var(--font-mono)', background: 'rgba(40,55,30,0.08)', padding: '1px 5px', borderRadius: 4 }}>nomic-embed-text</code> (~274 MB).
                </div>
              </div>
            </div>

            <div style={{ padding: '16px 18px', borderRadius: 'var(--r-md)', background: 'rgba(255,255,255,0.5)', border: '1px solid var(--glass-line)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>nomic-embed-text</span>
                <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>~274 MB</span>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.55, marginBottom: 14 }}>
                Model embedding nhỏ gọn, chạy offline. Giúp RAG tìm đúng tài liệu theo nghĩa câu hỏi thay vì chỉ khớp từ khóa.
              </div>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', gap: 8 }} onClick={startPullEmbed}>
                <Icon name="arrowR" size={17} /> Tải Embedding Model
              </button>
            </div>

            <button
              onClick={() => { setStep('ready'); onReady({ mode: 'ollama' }); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--ink-3)', textDecoration: 'underline', textAlign: 'center' }}
            >
              Bỏ qua, dùng BM25 tạm thời
            </button>
          </div>
        )}

        {/* ── pulling_embed ── đang pull nomic-embed-text */}
        {step === 'pulling_embed' && (() => {
          const embedPct = embedPull?.total && embedPull.completed
            ? Math.round((embedPull.completed / embedPull.total) * 100)
            : 0;
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--ink)' }}>Đang tải nomic-embed-text...</div>

              <Bar pct={embedPct} />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12.5, color: 'var(--ink-2)', fontFamily: 'var(--font-mono)' }}>
                  {embedPull?.status ?? 'Chuẩn bị...'}
                </span>
                <span style={{ fontSize: 12.5, color: 'var(--accent-deep)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  {embedPct > 0 ? `${embedPct}%` : ''}
                </span>
              </div>

              {embedPull?.total && embedPull.completed ? (
                <div style={{ fontSize: 11.5, color: 'var(--ink-3)', textAlign: 'center' }}>
                  {(embedPull.completed / 1024 / 1024).toFixed(0)} MB / {(embedPull.total / 1024 / 1024).toFixed(0)} MB
                </div>
              ) : null}

              <button
                onClick={() => { abortRef.current?.abort(); setStep('no_embed'); }}
                className="btn btn-ghost btn-sm"
                style={{ alignSelf: 'center' }}
              >
                Huỷ
              </button>
            </div>
          );
        })()}

        {/* ── openai_setup ── */}
        {(step === 'openai_setup' || step === 'openai_testing') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)', marginBottom: 6 }}>Nhập OpenAI API Key</div>
              <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55 }}>
                Lấy key tại <button onClick={() => invoke('plugin:opener|open_url', { url: 'https://platform.openai.com/api-keys' }).catch(() => window.open('https://platform.openai.com/api-keys', '_blank'))} style={{ background: 'none', border: 'none', color: 'var(--info)', cursor: 'pointer', padding: 0, fontSize: 13, textDecoration: 'underline' }}>platform.openai.com/api-keys</button>
              </div>
            </div>

            <div>
              <input
                type="password"
                value={openaiKey}
                onChange={e => { setOpenaiKey(e.target.value); setKeyError(''); }}
                onKeyDown={e => e.key === 'Enter' && submitOpenAIKey()}
                placeholder="sk-proj-..."
                disabled={step === 'openai_testing'}
                style={{
                  width: '100%', padding: '11px 14px',
                  borderRadius: 'var(--r-sm)',
                  border: `1px solid ${keyError ? 'var(--bad)' : 'var(--glass-edge)'}`,
                  background: 'rgba(255,255,255,0.7)', color: 'var(--ink)',
                  fontSize: 13.5, outline: 'none', fontFamily: 'var(--font-mono)',
                  boxSizing: 'border-box',
                }}
              />
              {keyError && (
                <div style={{ fontSize: 12, color: 'var(--bad)', marginTop: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Icon name="close" size={13} /> {keyError}
                </div>
              )}
            </div>

            <button
              className="btn btn-primary"
              style={{ justifyContent: 'center', gap: 8, opacity: step === 'openai_testing' ? 0.6 : 1 }}
              onClick={submitOpenAIKey}
              disabled={step === 'openai_testing' || !openaiKey}
            >
              {step === 'openai_testing'
                ? <><span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--accent-ink)', borderTopColor: 'transparent', animation: 'rag-spin 0.7s linear infinite', display: 'inline-block' }} /> Đang kiểm tra...</>
                : <><Icon name="check" size={16} /> Xác nhận & bắt đầu</>
              }
            </button>

            {step !== 'openai_testing' && (
              <button
                onClick={() => setStep(status?.ollama_running ? 'no_model' : 'no_ollama')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--ink-3)', textDecoration: 'underline', textAlign: 'center' }}
              >
                Quay lại
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
