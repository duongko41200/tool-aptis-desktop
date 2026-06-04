import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import Icon from '../components/common/Icon';
import RagSetupModal from '../components/rag/RagSetupModal';
import {
  ragChatStream, ragIngestUrl, ragListSources, ragDeleteSource,
  type RagSource, type SourceInfo,
} from '../lib/rag-api';

/* ── Types ───────────────────────────────────────────────── */
type Role = 'user' | 'ai';
type Model = string;
type EmbedModel = 'nomic-embed-text' | 'openai';

interface Message {
  id: number;
  role: Role;
  text: string;
  sources?: RagSource[];
  ts: string;
}

interface IngestedUrl extends SourceInfo {
  status: 'ok' | 'loading' | 'error';
  errorMsg?: string;
}

/* ── Helpers ─────────────────────────────────────────────── */
function nowTs() {
  return new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function RichText({ text }: { text: string }) {
  const html = text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n(\d+\.)/g, '<br/>$1');
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

/* ── SourceCard ──────────────────────────────────────────── */
function SourceCard({ src }: { src: RagSource }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      borderRadius: 'var(--r-sm)',
      background: 'rgba(255,255,255,0.52)',
      border: '1px solid var(--glass-line)',
      overflow: 'hidden',
      backdropFilter: 'blur(12px)',
    }}>
      <button onClick={() => setOpen(v => !v)} style={{
        width: '100%', textAlign: 'left', padding: '8px 11px',
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'none', border: 'none', cursor: 'pointer',
      }}>
        <Icon name="globe" size={13} style={{ color: 'var(--info)', flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {src.title}
        </span>
        <Icon name={open ? 'chevD' : 'chevR'} size={12} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
      </button>
      {open && (
        <div style={{ padding: '0 11px 9px', borderTop: '1px solid var(--glass-edge)' }}>
          <div style={{ fontSize: 10.5, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', marginBottom: 4, marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{src.url}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.6 }}>{src.snippet}</div>
        </div>
      )}
    </div>
  );
}

/* ── ChatBubble ──────────────────────────────────────────── */
function ChatBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start', gap: 7 }}>

      {/* Sender label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, paddingLeft: isUser ? 0 : 2 }}>
        {!isUser && (
          <span style={{
            width: 24, height: 24, borderRadius: 'var(--r-sm)', flexShrink: 0,
            background: 'var(--accent)', color: 'var(--accent-ink)',
            display: 'grid', placeItems: 'center', boxShadow: 'var(--sh-glow)',
          }}>
            <Icon name="sparkle" size={13} />
          </span>
        )}
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--on-dark-2)' }}>
          {isUser ? 'Bạn' : 'AI Trợ lý'} · {msg.ts}
        </span>
      </div>

      {/* Bubble */}
      <div style={{
        maxWidth: '78%',
        padding: '11px 15px',
        borderRadius: isUser ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
        fontSize: 13.5, lineHeight: 1.65,
        ...(isUser
          ? {
              background: 'var(--accent)',
              color: 'var(--accent-ink)',
              boxShadow: 'var(--sh-glow)',
              fontWeight: 600,
            }
          : {
              background: 'var(--glass)',
              color: 'var(--ink)',
              backdropFilter: 'blur(var(--glass-blur)) saturate(1.25)',
              WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(1.25)',
              border: '1px solid var(--glass-line)',
              boxShadow: 'var(--sh-md), inset 0 1px 0 rgba(255,255,255,0.6)',
            }),
      }}>
        <RichText text={msg.text} />
      </div>

      {/* Sources */}
      {msg.sources && msg.sources.length > 0 && (
        <div style={{ width: '78%', display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ fontSize: 10.5, color: 'var(--on-dark-2)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', paddingLeft: 2 }}>
            Nguồn tham khảo ({msg.sources.length})
          </div>
          {msg.sources.map((src, i) => <SourceCard key={i} src={src} />)}
        </div>
      )}
    </div>
  );
}

/* ── TypingIndicator ─────────────────────────────────────── */
function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{
        width: 24, height: 24, borderRadius: 'var(--r-sm)', flexShrink: 0,
        background: 'var(--accent)', color: 'var(--accent-ink)',
        display: 'grid', placeItems: 'center', boxShadow: 'var(--sh-glow)',
      }}>
        <Icon name="sparkle" size={13} />
      </span>
      <div style={{
        padding: '10px 16px', borderRadius: '4px 18px 18px 18px',
        background: 'var(--glass)',
        backdropFilter: 'blur(var(--glass-blur))',
        WebkitBackdropFilter: 'blur(var(--glass-blur))',
        border: '1px solid var(--glass-line)',
        boxShadow: 'var(--sh-sm)',
        display: 'flex', gap: 5, alignItems: 'center',
      }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            width: 7, height: 7, borderRadius: '50%',
            background: 'var(--accent-deep)',
            display: 'inline-block',
            animation: `rag-bounce 1.1s ${i * 0.18}s ease-in-out infinite`,
          }} />
        ))}
      </div>
    </div>
  );
}

/* ── ModelOption ─────────────────────────────────────────── */
function ModelOption({ label, desc, free, active, onClick }: {
  val?: string; label: string; desc: string; free: boolean; active: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick} style={{
      width: '100%', textAlign: 'left', padding: '10px 12px', marginBottom: 6,
      borderRadius: 'var(--r-sm)', cursor: 'pointer',
      background: active ? 'rgba(217,232,157,0.14)' : 'rgba(255,255,255,0.04)',
      border: `1px solid ${active ? 'var(--accent-strong)' : 'rgba(255,255,255,0.1)'}`,
      transition: 'all 160ms var(--ease)',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
        background: active ? (free ? 'var(--good)' : 'var(--info)') : 'rgba(255,255,255,0.2)',
        boxShadow: active ? `0 0 6px ${free ? 'var(--good)' : 'var(--info)'}` : 'none',
        transition: 'all 160ms',
      }} />
      <span style={{ flex: 1 }}>
        <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: active ? 'var(--accent)' : 'rgba(255,255,255,0.85)' }}>{label}</span>
        <span style={{ display: 'block', fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>{desc}</span>
      </span>
      {free && (
        <span style={{
          fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 'var(--r-pill)',
          background: 'rgba(111,174,90,0.2)', color: 'var(--good)',
          letterSpacing: '0.04em',
        }}>FREE</span>
      )}
    </button>
  );
}

/* ── Main Page ───────────────────────────────────────────── */
export default function RagChatPage() {
  const navigate  = useNavigate();
  const [messages, setMessages]     = useState<Message[]>([]);
  const [input, setInput]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [model, setModel]           = useState<Model>('llama3:latest');
  const [embedModel, setEmbedModel] = useState<EmbedModel>('nomic-embed-text');
  const [urls, setUrls]             = useState<IngestedUrl[]>([]);
  const [urlInput, setUrlInput]     = useState('');
  const [addingUrl, setAddingUrl]   = useState(false);
  const [sideTab, setSideTab]       = useState<'settings' | 'sources'>('settings');
  const [ollamaOk, setOllamaOk]     = useState<boolean | null>(null);
  const [backendOk, setBackendOk]   = useState<boolean | null>(null);
  const [setupDone, setSetupDone]   = useState(false);
  const [openaiKey, setOpenaiKey]   = useState<string | undefined>(
    localStorage.getItem('rag_openai_key') ?? undefined
  );
  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Check backend + Ollama status
  const checkStatus = useCallback(async () => {
    invoke<boolean>('check_ollama_running')
      .then(ok => setOllamaOk(ok))
      .catch(() => setOllamaOk(false));
    try {
      const r = await fetch('http://localhost:8080/models/status', { signal: AbortSignal.timeout(3000) });
      if (r.ok) {
        const s = await r.json();
        setBackendOk(true);
        if (s.model) setModel(s.model);
        const list = await ragListSources().catch(() => []);
        setUrls(list.map((src: import('../lib/rag-api').SourceInfo) => ({ ...src, status: 'ok' as const })));
      } else {
        setBackendOk(false);
      }
    } catch {
      setBackendOk(false);
    }
  }, []);

  useEffect(() => {
    // Nếu đã có OpenAI key lưu sẵn → skip setup
    const savedKey = localStorage.getItem('rag_openai_key');
    if (savedKey) { setSetupDone(true); setOpenaiKey(savedKey); }
    checkStatus();
  }, [checkStatus]);

  const refreshSources = useCallback(async () => {
    try {
      const list = await ragListSources();
      setUrls(list.map(s => ({ ...s, status: 'ok' as const })));
    } catch { /* backend chưa chạy */ }
  }, []);

  const abortRef = useRef<AbortController | null>(null);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const question = input.trim();
    const userMsg: Message = { id: Date.now(), role: 'user', text: question, ts: nowTs() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setError(null);

    const aiId = Date.now() + 1;
    // Thêm bubble AI rỗng trước — sẽ fill dần
    setMessages(prev => [...prev, { id: aiId, role: 'ai', text: '', ts: nowTs() }]);

    abortRef.current = new AbortController();
    try {
      await ragChatStream(
        question, model, openaiKey,
        (token) => {
          setMessages(prev => prev.map(m =>
            m.id === aiId ? { ...m, text: m.text + token } : m
          ));
        },
        (sources) => {
          setMessages(prev => prev.map(m =>
            m.id === aiId ? { ...m, sources } : m
          ));
        },
        abortRef.current.signal,
      );
      setBackendOk(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Lỗi không xác định';
      // Xóa bubble rỗng nếu không có nội dung
      setMessages(prev => {
        const ai = prev.find(m => m.id === aiId);
        if (ai && !ai.text) return prev.filter(m => m.id !== aiId);
        return prev;
      });
      const isNetworkErr = msg.includes('fetch') || msg.includes('network') || msg.includes('connect') || msg.includes('Failed');
      if (isNetworkErr) {
        setBackendOk(false);
        setError('Backend chưa chạy. Hãy mở terminal và chạy: cd backend && uvicorn main:app --port 8080');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    setLoading(false);
  };

  const handleAddUrl = async () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    const tempId = Date.now();
    const newEntry: IngestedUrl = { url: trimmed, title: trimmed, chunks: 0, status: 'loading' };
    setUrls(prev => [...prev, { ...newEntry }]);
    setUrlInput('');
    setAddingUrl(false);
    try {
      const res = await ragIngestUrl(trimmed);
      setUrls(prev => prev.map(u =>
        u.url === trimmed && u.status === 'loading'
          ? { ...u, status: 'ok', chunks: res.chunks }
          : u
      ));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Lỗi không xác định';
      const isConn = msg.includes('fetch') || msg.includes('Failed') || msg.includes('connect');
      setUrls(prev => prev.map(u =>
        u.url === trimmed && u.status === 'loading'
          ? { ...u, status: 'error', errorMsg: isConn ? 'Backend chưa chạy (port 8080)' : msg }
          : u
      ));
    }
    void tempId;
  };

  const handleDeleteUrl = async (url: string) => {
    setUrls(prev => prev.filter(u => u.url !== url));
    await ragDeleteSource(url).catch(() => {});
  };

  const totalChunks = urls.filter(u => u.status === 'ok').reduce((s, u) => s + u.chunks, 0);
  const okCount     = urls.filter(u => u.status === 'ok').length;

  const SUGGESTED = [
    'APTIS Writing Part 3 yêu cầu gì?',
    'Cách dùng connectives trong bài viết?',
    'Pháp thức câu điều kiện loại 2?',
  ];

  return (
    <div className="screen" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'none' }}>
      {/* Setup modal */}
      {!setupDone && (
        <RagSetupModal
          onReady={({ mode, openaiKey: key }) => {
            setSetupDone(true);
            if (mode === 'ollama') setOllamaOk(true);
            if (mode === 'openai' && key) setOpenaiKey(key);
            refreshSources();
          }}
          onDismiss={() => setSetupDone(true)}
        />
      )}

      {/* Keyframes */}
      <style>{`
        @keyframes rag-bounce { 0%,60%,100%{transform:translateY(0)} 30%{transform:translateY(-7px)} }
        @keyframes rag-spin   { to{transform:rotate(360deg)} }
        .rag-url-row:hover .rag-del { opacity:1!important; }
        .rag-suggest:hover { background: rgba(255,255,255,0.72)!important; color: var(--ink)!important; }
      `}</style>

      {/* ── Custom header (replaces TopBar) ── */}
      <header className="darkglass" style={{
        flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '12px 20px',
        borderBottom: '1px solid var(--darkglass-line)',
        zIndex: 10,
      }}>
        {/* Back */}
        <button onClick={() => navigate(-1)} className="iconbtn" style={{ width: 36, height: 36 }} title="Quay lại">
          <Icon name="chevL" size={18} />
        </button>

        {/* Logo mark */}
        <span style={{
          width: 36, height: 36, borderRadius: 'var(--r-md)', flexShrink: 0,
          background: 'var(--accent)', color: 'var(--accent-ink)',
          display: 'grid', placeItems: 'center', boxShadow: 'var(--sh-glow)',
        }}>
          <Icon name="sparkle" size={19} />
        </span>

        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>RAG Chat</div>
          <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.5)', marginTop: 1 }}>
            {totalChunks} chunks · {okCount} nguồn
          </div>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Nút mở lại setup modal */}
          <button
            onClick={() => setSetupDone(false)}
            className="btn btn-ghost btn-sm"
            style={{ gap: 6, fontSize: 12.5 }}
            title="Thiết lập kết nối AI"
          >
            <Icon name="settings" size={14} /> Kết nối Model Ai
          </button>
          {/* Model badge */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 'var(--r-pill)',
            background: 'rgba(217,232,157,0.14)',
            border: '1px solid rgba(217,232,157,0.3)',
            fontSize: 12, fontWeight: 700, color: 'var(--accent)',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--good)', boxShadow: '0 0 5px var(--good)' }} />
            {model}
          </span>
          {/* Ollama status */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 'var(--r-pill)',
            background: ollamaOk === null ? 'rgba(255,255,255,0.08)' : ollamaOk ? 'rgba(111,174,90,0.14)' : 'rgba(217,138,106,0.18)',
            border: `1px solid ${ollamaOk === null ? 'rgba(255,255,255,0.12)' : ollamaOk ? 'rgba(111,174,90,0.28)' : 'rgba(217,138,106,0.35)'}`,
            fontSize: 12, fontWeight: 700,
            color: ollamaOk === null ? 'rgba(255,255,255,0.45)' : ollamaOk ? 'var(--good)' : 'var(--bad)',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: ollamaOk === null ? 'rgba(255,255,255,0.3)' : ollamaOk ? 'var(--good)' : 'var(--bad)',
              boxShadow: ollamaOk ? '0 0 5px var(--good)' : 'none',
              animation: ollamaOk === null ? 'rag-bounce 1s infinite' : 'none',
            }} />
            {ollamaOk === null ? 'Kiểm tra...' : ollamaOk ? 'Ollama' : 'Ollama offline'}
          </span>
          {/* Backend status */}
          <span
            title={backendOk === false ? 'Chạy: cd backend && uvicorn main:app --port 8080' : ''}
            onClick={() => backendOk === false && checkStatus()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 'var(--r-pill)', cursor: backendOk === false ? 'pointer' : 'default',
              background: backendOk === null ? 'rgba(255,255,255,0.08)' : backendOk ? 'rgba(111,174,90,0.14)' : 'rgba(217,138,106,0.18)',
              border: `1px solid ${backendOk === null ? 'rgba(255,255,255,0.12)' : backendOk ? 'rgba(111,174,90,0.28)' : 'rgba(217,138,106,0.35)'}`,
              fontSize: 12, fontWeight: 700,
              color: backendOk === null ? 'rgba(255,255,255,0.45)' : backendOk ? 'var(--good)' : 'var(--bad)',
            }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: backendOk === null ? 'rgba(255,255,255,0.3)' : backendOk ? 'var(--good)' : 'var(--bad)',
              boxShadow: backendOk ? '0 0 5px var(--good)' : 'none',
            }} />
            {backendOk === null ? '...' : backendOk ? 'Backend' : 'Backend offline'}
          </span>
        </div>
      </header>

      {/* Backend offline banner */}
      {backendOk === false && (
        <div style={{
          flexShrink: 0, padding: '9px 20px',
          background: 'rgba(180,60,40,0.85)', borderBottom: '1px solid rgba(255,100,80,0.3)',
          display: 'flex', alignItems: 'center', gap: 10, zIndex: 9,
        }}>
          <Icon name="lightbulb" size={15} style={{ color: '#ffcca0', flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 12.5, color: '#fff', lineHeight: 1.5 }}>
            Python backend chưa chạy. Mở terminal và chạy:&nbsp;
            <code style={{ fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.15)', padding: '1px 7px', borderRadius: 4 }}>
              cd backend &amp;&amp; uvicorn main:app --port 8080
            </code>
          </span>
          <button onClick={checkStatus} style={{
            padding: '4px 12px', borderRadius: 'var(--r-pill)', fontSize: 12, fontWeight: 700,
            background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)',
            color: '#fff', cursor: 'pointer',
          }}>
            Kiểm tra lại
          </button>
        </div>
      )}

      {/* ── Body: chat + sidebar ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* ── Chat column ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' }}>

          {/* Dark tint panel — che nền GIF, không dùng backdrop-filter để tránh jank khi animate */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0,
            background: 'rgba(18, 26, 14, 0.82)',
          }} />

          {/* Messages scroll area */}
          <div className="scroll" style={{
            flex: 1, overflowY: 'auto', position: 'relative', zIndex: 1,
            padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 24,
          }}>
            {messages.length === 0 && (
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 16, paddingTop: 60,
              }}>
                <span className="glass" style={{
                  width: 72, height: 72, borderRadius: 'var(--r-xl)',
                  display: 'grid', placeItems: 'center',
                }}>
                  <Icon name="chat" size={32} style={{ color: 'var(--accent-deep)' }} />
                </span>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--on-dark)' }}>Bắt đầu hỏi</div>
                  <div style={{ fontSize: 13, color: 'var(--on-dark-2)', marginTop: 4 }}>Hỏi bất kỳ điều gì về tài liệu đã nạp</div>
                </div>
              </div>
            )}
            {messages.map(msg => <ChatBubble key={msg.id} msg={msg} />)}
            {loading && <TypingIndicator />}
            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 'var(--r-sm)',
                background: 'rgba(217,138,106,0.18)', border: '1px solid rgba(217,138,106,0.4)',
                color: 'var(--bad)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <Icon name="close" size={15} />
                <span>{error}</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggested chips — chỉ hiện khi ít tin nhắn */}
          {messages.length <= 2 && (
            <div style={{
              position: 'relative', zIndex: 1,
              padding: '0 28px 10px',
              display: 'flex', gap: 8, flexWrap: 'wrap',
            }}>
              {SUGGESTED.map(q => (
                <button key={q} className="rag-suggest" onClick={() => { setInput(q); textareaRef.current?.focus(); }}
                  style={{
                    padding: '7px 13px', borderRadius: 'var(--r-pill)',
                    background: 'rgba(255,255,255,0.55)',
                    border: '1px solid var(--glass-line)',
                    backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
                    fontSize: 12.5, color: 'var(--ink-2)', fontWeight: 600,
                    cursor: 'pointer', transition: 'all 140ms var(--ease)',
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input bar */}
          <div className="darkglass" style={{
            position: 'relative', zIndex: 1,
            padding: '12px 16px 14px',
            borderTop: '1px solid var(--darkglass-line)',
            borderRadius: 0,
          }}>
            <div style={{
              display: 'flex', gap: 10, alignItems: 'flex-end',
              background: 'rgba(255,255,255,0.10)',
              borderRadius: 'var(--r-lg)',
              padding: '10px 12px 10px 16px',
              border: '1px solid rgba(255,255,255,0.18)',
            }}>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Hỏi về tài liệu APTIS... (Enter để gửi, Shift+Enter xuống dòng)"
                rows={1}
                style={{
                  flex: 1, resize: 'none', background: 'none', border: 'none', outline: 'none',
                  fontSize: 14, color: '#fff', lineHeight: 1.55, maxHeight: 110, overflowY: 'auto',
                }}
              />
              {loading ? (
                <button
                  onClick={handleCancel}
                  className="btn btn-soft btn-sm"
                  style={{ flexShrink: 0, gap: 6 }}
                >
                  <Icon name="close" size={14} /> Dừng
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="btn btn-primary btn-sm"
                  style={{ flexShrink: 0, gap: 6 }}
                >
                  <Icon name="send" size={14} /> Gửi
                </button>
              )}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'center', marginTop: 6 }}>
              {model} · Hybrid Retrieval · {totalChunks} chunks
            </div>
          </div>
        </div>

        {/* ── Right sidebar ── */}
        <div className="darkglass" style={{
          width: 288, flexShrink: 0,
          borderLeft: '1px solid var(--darkglass-line)',
          display: 'flex', flexDirection: 'column',
          background: 'var(--darkglass-2)',
          borderRadius: 0,
        }}>

          {/* Tab switcher */}
          <div style={{ display: 'flex', gap: 6, padding: '12px 12px 0' }}>
            {(['settings', 'sources'] as const).map(tab => (
              <button key={tab} onClick={() => setSideTab(tab)} style={{
                flex: 1, padding: '8px 0', borderRadius: 'var(--r-sm)',
                fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                color: sideTab === tab ? 'var(--accent-ink)' : 'rgba(255,255,255,0.45)',
                background: sideTab === tab ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                border: `1px solid ${sideTab === tab ? 'var(--accent-strong)' : 'rgba(255,255,255,0.08)'}`,
                transition: 'all 160ms var(--ease)',
                boxShadow: sideTab === tab ? 'var(--sh-glow)' : 'none',
              }}>
                {tab === 'settings' ? 'Cài đặt' : 'Nguồn dữ liệu'}
              </button>
            ))}
          </div>

          <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>

            {/* ── Settings tab ── */}
            {sideTab === 'settings' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>

                {/* LLM */}
                <div>
                  <div className="label-cap" style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>Mô hình ngôn ngữ</div>
                  <ModelOption val="qwen3:4b"      label="Qwen3:4b"      desc="Ollama · offline · context 32K"          free active={model === 'qwen3:4b'}      onClick={() => setModel('qwen3:4b')} />
                  <ModelOption val="gpt-4o"        label="GPT-4o"        desc="OpenAI API · cần API key"                free={false} active={model === 'gpt-4o'}        onClick={() => setModel('gpt-4o')} />
                  <ModelOption val="claude-sonnet" label="Claude Sonnet" desc="Anthropic API · cần API key"             free={false} active={model === 'claude-sonnet'} onClick={() => setModel('claude-sonnet')} />
                </div>

                {/* Embedding */}
                <div>
                  <div className="label-cap" style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>Embedding model</div>
                  {([
                    ['nomic-embed-text', 'nomic-embed-text', 'Ollama · offline · miễn phí', true],
                    ['openai',           'text-embedding-3',  'OpenAI · cần API key',        false],
                  ] as const).map(([id, label, desc, free]) => (
                    <ModelOption key={id} val={id} label={label} desc={desc} free={free}
                      active={embedModel === id} onClick={() => setEmbedModel(id)} />
                  ))}
                </div>

                {/* Stats grid */}
                <div style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 'var(--r-md)', padding: '14px 12px',
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
                }}>
                  {[
                    ['Nguồn web',  okCount],
                    ['Tổng chunks', totalChunks],
                    ['Model size',  '~2.5 GB'],
                    ['RAM dùng',    '~3.8 GB'],
                  ].map(([lbl, val]) => (
                    <div key={String(lbl)} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{val}</div>
                      <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{lbl}</div>
                    </div>
                  ))}
                </div>

                {/* Retrieval weights */}
                <div>
                  <div className="label-cap" style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>Hybrid Retrieval</div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--r-sm)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[['Semantic (Milvus)', 70, 'var(--accent-deep)'], ['Lexical (BM25)', 30, 'var(--info)']].map(([lbl, pct, color]) => (
                      <div key={String(lbl)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'rgba(255,255,255,0.6)', fontWeight: 600, marginBottom: 4 }}>
                          <span>{lbl}</span><span style={{ fontFamily: 'var(--font-mono)', color: color as string }}>{pct}%</span>
                        </div>
                        <div className="bar" style={{ background: 'rgba(255,255,255,0.1)' }}>
                          <i style={{ width: `${pct}%`, background: color as string }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Sources tab ── */}
            {sideTab === 'sources' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                {/* Add URL button / form */}
                {addingUrl ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input
                      value={urlInput}
                      onChange={e => setUrlInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddUrl()}
                      placeholder="https://..."
                      autoFocus
                      style={{
                        padding: '9px 12px', borderRadius: 'var(--r-sm)',
                        background: 'rgba(255,255,255,0.10)',
                        border: '1px solid rgba(255,255,255,0.22)',
                        color: '#fff', fontSize: 13, outline: 'none',
                        fontFamily: 'var(--font-mono)',
                      }}
                    />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={handleAddUrl} className="btn btn-primary btn-sm" style={{ flex: 1, fontSize: 12 }}>
                        <Icon name="globe" size={13} /> Nạp URL
                      </button>
                      <button onClick={() => { setAddingUrl(false); setUrlInput(''); }} className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>
                        Huỷ
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setAddingUrl(true)} style={{
                    width: '100%', padding: '10px 0', borderRadius: 'var(--r-sm)',
                    background: 'rgba(217,232,157,0.08)',
                    border: '1.5px dashed rgba(217,232,157,0.3)',
                    color: 'var(--accent)', fontSize: 13, fontWeight: 700,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    transition: 'all 160ms var(--ease)',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(217,232,157,0.16)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(217,232,157,0.08)'; }}
                  >
                    <Icon name="globe" size={15} /> Thêm URL
                  </button>
                )}

                {/* URL list */}
                {urls.map(u => (
                  <div key={u.url} className="rag-url-row" style={{
                    padding: '10px 11px', borderRadius: 'var(--r-sm)',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    display: 'flex', gap: 9, alignItems: 'flex-start',
                  }}>
                    <span style={{ marginTop: 1, flexShrink: 0 }}>
                      {u.status === 'loading'
                        ? <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'rag-spin 0.7s linear infinite' }} />
                        : u.status === 'ok'
                          ? <Icon name="checkCircle" size={15} style={{ color: 'var(--good)' }} />
                          : <Icon name="close" size={15} style={{ color: 'var(--bad)' }} />
                      }
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11.5, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.url}</div>
                      <div style={{ fontSize: 11, color: u.status === 'error' ? 'var(--bad)' : 'rgba(255,255,255,0.35)', marginTop: 3 }}>
                        {u.status === 'loading' ? 'Đang crawl + nhúng dữ liệu...'
                          : u.status === 'ok' ? `${u.chunks} chunks`
                          : (u.errorMsg ?? 'Lỗi không xác định')}
                      </div>
                    </div>
                    <button className="rag-del" onClick={() => handleDeleteUrl(u.url)}
                      style={{ opacity: 0, transition: 'opacity 160ms', background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', padding: 2, flexShrink: 0 }}>
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                ))}

                {urls.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '28px 0', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                    Chưa có nguồn dữ liệu
                  </div>
                )}

                {/* File upload */}
                <div style={{
                  marginTop: 6, padding: '14px', borderRadius: 'var(--r-md)',
                  border: '1.5px dashed rgba(255,255,255,0.12)', textAlign: 'center',
                  cursor: 'pointer', transition: 'all 160ms var(--ease)',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <Icon name="bookmark" size={22} style={{ color: 'rgba(255,255,255,0.25)', display: 'block', margin: '0 auto 7px' }} />
                  <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>Tải lên JSON / PDF</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', marginTop: 3 }}>Kéo thả hoặc bấm để chọn</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
