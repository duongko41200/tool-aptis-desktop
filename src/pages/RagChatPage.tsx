import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { invoke } from '@tauri-apps/api/core';
import Icon from '../components/common/Icon';
import RagSetupModal from '../components/rag/RagSetupModal';
import AutomationFlowBuilder from '../components/rag/AutomationFlowBuilder';
import {
  ragChatStream, ragIngestUrl, ragIngestDebug, ragListSources, ragDeleteSource, ragGetChunks,
  pingBackend,
  type RagSource, type SourceInfo, type ChunkInfo, type IngestDebugResult,
} from '../lib/rag-api';

/* ── Types ───────────────────────────────────────────────── */
type Role = 'user' | 'ai';
type Model = string;
type EmbedModel = 'google' | 'openai';

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

/* ── ChunkInspector ──────────────────────────────────────── */
function ChunkInspector({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  const [chunks, setChunks] = useState<ChunkInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    ragGetChunks(url)
      .then(data => { setChunks(data); setLoading(false); if (data.length > 0) setSelected(0); })
      .catch(e => { setError(e instanceof Error ? e.message : 'Lỗi tải chunks'); setLoading(false); });
  }, [url]);

  const filtered = search.trim()
    ? chunks.filter(c => c.content.toLowerCase().includes(search.toLowerCase())
      || (c.metadata?.section ?? '').toLowerCase().includes(search.toLowerCase()))
    : chunks;

  const activeChunk = selected !== null ? chunks[selected] : null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(8,12,6,0.72)', backdropFilter: 'blur(6px)',
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="glass rise" style={{
        width: 'clamp(860px, 88vw, 1400px)',
        height: 'clamp(560px, 84vh, 920px)',
        display: 'flex', flexDirection: 'column',
        borderRadius: 'var(--r-xl)', overflow: 'hidden',
      }}>

        {/* ── Header ── */}
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid var(--glass-line)',
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        }}>
          <Icon name="globe" size={17} style={{ color: 'var(--info)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {title}
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {url}
            </div>
          </div>

          {/* Search */}
          {!loading && !error && chunks.length > 0 && (
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setSelected(null); }}
              placeholder="Tìm trong chunks..."
              style={{
                width: 200, padding: '6px 11px', borderRadius: 'var(--r-sm)',
                background: 'rgba(40,55,30,0.08)', border: '1px solid var(--glass-edge)',
                color: 'var(--ink)', fontSize: 12, outline: 'none',
                fontFamily: 'var(--font-base)',
              }}
            />
          )}

          {!loading && !error && (
            <span style={{
              padding: '4px 11px', borderRadius: 'var(--r-pill)',
              background: 'rgba(111,174,90,0.14)', border: '1px solid rgba(111,174,90,0.28)',
              fontSize: 12, fontWeight: 700, color: 'var(--good)', flexShrink: 0,
            }}>
              {filtered.length}{search ? `/${chunks.length}` : ''} chunks
            </span>
          )}

          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 'var(--r-pill)', flexShrink: 0,
            background: 'rgba(40,55,30,0.08)', border: '1px solid var(--glass-edge)',
            display: 'grid', placeItems: 'center', cursor: 'pointer',
          }}>
            <Icon name="close" size={15} style={{ color: 'var(--ink-3)' }} />
          </button>
        </div>

        {/* ── Body: grid + detail ── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

          {/* Left: grid */}
          <div className="scroll" style={{
            flex: 1, overflowY: 'auto', padding: '14px 16px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gridAutoRows: 'min-content',
            gap: 10, alignContent: 'start',
          }}>

            {loading && (
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, paddingTop: 60 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', border: '3px solid var(--accent)', borderTopColor: 'transparent', animation: 'rag-spin 0.8s linear infinite' }} />
                <div style={{ fontSize: 13, color: 'var(--ink-2)' }}>Đang tải từ ChromaDB...</div>
              </div>
            )}

            {error && (
              <div style={{ gridColumn: '1 / -1', padding: '14px 16px', borderRadius: 'var(--r-md)', background: 'rgba(217,138,106,0.12)', border: '1px solid rgba(217,138,106,0.3)', color: 'var(--bad)', fontSize: 13 }}>
                {error}
              </div>
            )}

            {!loading && !error && filtered.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px 0', color: 'var(--ink-3)', fontSize: 13 }}>
                {search ? 'Không tìm thấy chunk nào khớp' : 'Không tìm thấy chunk nào'}
              </div>
            )}

            {filtered.map((chunk) => {
              const realIdx = chunks.indexOf(chunk);
              const isActive = selected === realIdx;
              const meta = chunk.metadata || {};
              const headingParts = [meta.heading1, meta.heading2, meta.heading3].filter(Boolean) as string[];
              const preview = (chunk.content || '').replace(/^\[Chủ đề:[^\]]+\]\s*/m, '').slice(0, 160).trim();

              return (
                <button
                  key={chunk.id}
                  onClick={() => setSelected(realIdx)}
                  style={{
                    textAlign: 'left', padding: '12px 13px',
                    borderRadius: 'var(--r-md)', cursor: 'pointer',
                    border: `1.5px solid ${isActive ? 'var(--accent-strong)' : 'var(--glass-line)'}`,
                    background: isActive
                      ? 'rgba(217,232,157,0.18)'
                      : 'rgba(255,255,255,0.52)',
                    backdropFilter: 'blur(12px)',
                    boxShadow: isActive ? 'var(--sh-glow)' : 'none',
                    transition: 'all 140ms var(--ease)',
                    display: 'flex', flexDirection: 'column', gap: 7,
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.72)'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.52)'; }}
                >
                  {/* Top row: index + chars */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <span style={{
                      padding: '1px 8px', borderRadius: 'var(--r-pill)',
                      background: isActive ? 'rgba(170,203,79,0.35)' : 'rgba(217,232,157,0.25)',
                      border: '1px solid rgba(170,203,79,0.3)',
                      fontSize: 10.5, fontWeight: 800, color: 'var(--accent-deep)',
                      fontFamily: 'var(--font-mono)',
                    }}>#{chunk.index}</span>
                    <span style={{ fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                      {chunk.content.length} c
                    </span>
                  </div>

                  {/* Headings */}
                  {headingParts.length > 0 && (
                    <div style={{
                      fontSize: 10.5, color: 'var(--info)', fontWeight: 700, lineHeight: 1.3,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                    }}>
                      {headingParts.join(' › ')}
                    </div>
                  )}

                  {/* Preview */}
                  <div style={{
                    fontSize: 11.5, color: 'var(--ink-2)', lineHeight: 1.55,
                    display: '-webkit-box', WebkitLineClamp: 4,
                    WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  }}>
                    {preview || '(trống)'}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right: detail panel */}
          {activeChunk && (
            <div style={{
              width: 380, flexShrink: 0,
              borderLeft: '1px solid var(--glass-line)',
              display: 'flex', flexDirection: 'column',
              background: 'rgba(255,255,255,0.65)',
              backdropFilter: 'blur(20px)',
            }}>
              {/* Detail header */}
              <div style={{
                padding: '12px 16px', borderBottom: '1px solid var(--glass-edge)',
                display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
                background: 'rgba(255,255,255,0.4)',
              }}>
                <span style={{
                  padding: '2px 9px', borderRadius: 'var(--r-pill)',
                  background: 'rgba(217,232,157,0.3)', border: '1px solid rgba(170,203,79,0.4)',
                  fontSize: 11, fontWeight: 800, color: 'var(--accent-deep)',
                  fontFamily: 'var(--font-mono)',
                }}>#{activeChunk.index}</span>
                <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                  {activeChunk.content.length.toLocaleString()} ký tự
                </span>
                <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                  ID: {activeChunk.id.slice(0, 8)}…
                </span>
              </div>

              {/* Headings / section */}
              {(() => {
                const meta = activeChunk.metadata || {};
                const headingParts = [meta.heading1, meta.heading2, meta.heading3].filter(Boolean) as string[];
                const section = meta.section || '';
                return (headingParts.length > 0 || section) ? (
                  <div style={{
                    padding: '8px 16px', borderBottom: '1px solid var(--glass-edge)',
                    background: 'rgba(217,232,157,0.07)', flexShrink: 0,
                  }}>
                    {headingParts.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                        {headingParts.map((h, hi) => (
                          <>
                            {hi > 0 && <Icon key={`s${hi}`} name="chevR" size={9} style={{ color: 'var(--ink-3)' }} />}
                            <span key={h} style={{
                              fontSize: 11, fontWeight: 700, color: 'var(--info)',
                              background: 'rgba(106,166,196,0.14)', padding: '1px 6px',
                              borderRadius: 'var(--r-pill)',
                            }}>{h}</span>
                          </>
                        ))}
                      </div>
                    )}
                    {section && !headingParts.includes(section) && (
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 3 }}>{section}</div>
                    )}
                  </div>
                ) : null;
              })()}

              {/* Full content — scrollable */}
              <div className="scroll" style={{
                flex: 1, overflowY: 'auto', padding: '14px 16px',
                fontSize: 12.5, color: 'var(--ink)', lineHeight: 1.75,
                whiteSpace: 'pre-wrap', fontFamily: 'var(--font-base)',
              }}>
                {activeChunk.content || <span style={{ color: 'var(--ink-3)', fontStyle: 'italic' }}>(chunk rỗng)</span>}
              </div>

              {/* Nav buttons */}
              <div style={{
                padding: '10px 16px', borderTop: '1px solid var(--glass-edge)',
                display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0,
                background: 'rgba(255,255,255,0.3)',
              }}>
                <button
                  onClick={() => setSelected(s => s !== null && s > 0 ? s - 1 : s)}
                  disabled={selected === 0}
                  className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}
                >← Trước</button>
                <span style={{ flex: 1, textAlign: 'center', fontSize: 11.5, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                  {(selected ?? 0) + 1} / {chunks.length}
                </span>
                <button
                  onClick={() => setSelected(s => s !== null && s < chunks.length - 1 ? s + 1 : s)}
                  disabled={selected === chunks.length - 1}
                  className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}
                >Sau →</button>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {!loading && !error && chunks.length > 0 && (
          <div style={{
            padding: '10px 20px', borderTop: '1px solid var(--glass-line)', flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'rgba(255,255,255,0.25)',
          }}>
            <span style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
              Tổng: {chunks.reduce((s, c) => s + c.content.length, 0).toLocaleString()} ký tự
            </span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>
              Click card để xem nội dung đầy đủ
            </span>
            <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }}>
              Đóng
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── DebugResultModal ────────────────────────────────────── */
function DebugResultModal({ result, url, onClose }: { result: IngestDebugResult; url: string; onClose: () => void }) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0);
  const allLoginDetected = result.results.some(r => r.login_detected);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(8,12,6,0.78)', backdropFilter: 'blur(6px)',
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="glass rise" style={{
        width: 760, maxWidth: 'calc(100vw - 40px)',
        maxHeight: 'calc(100vh - 60px)',
        display: 'flex', flexDirection: 'column',
        borderRadius: 'var(--r-xl)', overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          padding: '18px 22px', borderBottom: '1px solid var(--glass-line)',
          display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
        }}>
          <Icon name="lightbulb" size={20} style={{ color: allLoginDetected ? 'var(--bad)' : 'var(--good)', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>Kết quả kiểm tra URL</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 'var(--r-pill)', flexShrink: 0,
            background: 'rgba(40,55,30,0.08)', border: '1px solid var(--glass-edge)',
            display: 'grid', placeItems: 'center', cursor: 'pointer',
          }}>
            <Icon name="close" size={15} style={{ color: 'var(--ink-3)' }} />
          </button>
        </div>

        {/* Summary bar */}
        <div style={{
          padding: '12px 22px', borderBottom: '1px solid var(--glass-line)',
          display: 'flex', gap: 20, flexShrink: 0,
          background: allLoginDetected ? 'rgba(217,80,60,0.08)' : 'rgba(111,174,90,0.07)',
        }}>
          {[
            ['Cookie đã inject', String(result.cookies_injected)],
            ['Trang đã crawl', String(result.pages_crawled)],
            ['Trạng thái auth', allLoginDetected ? 'Phát hiện trang login ⚠' : 'Nội dung OK ✓'],
          ].map(([k, v]) => (
            <div key={k}>
              <div style={{ fontSize: 10.5, color: 'var(--ink-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k}</div>
              <div style={{ fontSize: 14, fontWeight: 800, marginTop: 2, color: k === 'Trạng thái auth' ? (allLoginDetected ? 'var(--bad)' : 'var(--good)') : 'var(--ink)' }}>{v}</div>
            </div>
          ))}
        </div>

        {/* Results list */}
        <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {result.results.map((r, i) => {
            const isOpen = expandedIdx === i;
            return (
              <div key={i} style={{
                borderRadius: 'var(--r-md)', overflow: 'hidden',
                border: `1px solid ${r.login_detected ? 'rgba(217,80,60,0.35)' : 'var(--glass-line)'}`,
                background: r.login_detected ? 'rgba(217,80,60,0.06)' : 'rgba(255,255,255,0.52)',
                backdropFilter: 'blur(12px)',
              }}>
                {/* Row header */}
                <button onClick={() => setExpandedIdx(isOpen ? null : i)} style={{
                  width: '100%', textAlign: 'left', padding: '10px 14px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <Icon
                    name={r.login_detected ? 'close' : 'checkCircle'}
                    size={15}
                    style={{ color: r.login_detected ? 'var(--bad)' : 'var(--good)', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.title || r.url}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {r.url}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-3)' }}>
                      {r.content_length.toLocaleString()} ký tự
                    </span>
                    {r.login_detected && (
                      <span style={{
                        fontSize: 10.5, fontWeight: 800, padding: '2px 8px', borderRadius: 'var(--r-pill)',
                        background: 'rgba(217,80,60,0.18)', color: 'var(--bad)', border: '1px solid rgba(217,80,60,0.3)',
                      }}>
                        LOGIN
                      </span>
                    )}
                    <Icon name={isOpen ? 'chevD' : 'chevR'} size={13} style={{ color: 'var(--ink-3)' }} />
                  </div>
                </button>

                {/* Expanded */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--glass-edge)' }}>
                    {r.login_detected && r.login_keywords_found.length > 0 && (
                      <div style={{
                        padding: '8px 14px', background: 'rgba(217,80,60,0.1)',
                        borderBottom: '1px solid rgba(217,80,60,0.2)',
                        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
                      }}>
                        <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--bad)', flexShrink: 0 }}>Từ khoá login phát hiện:</span>
                        {r.login_keywords_found.map(kw => (
                          <span key={kw} style={{
                            fontSize: 11, padding: '1px 8px', borderRadius: 'var(--r-pill)',
                            background: 'rgba(217,80,60,0.2)', color: 'var(--bad)',
                            fontFamily: 'var(--font-mono)',
                          }}>{kw}</span>
                        ))}
                      </div>
                    )}
                    <div style={{ padding: '10px 14px' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                        Nội dung crawl được (1500 ký tự đầu)
                      </div>
                      <div style={{
                        background: 'rgba(40,55,30,0.06)', borderRadius: 'var(--r-sm)',
                        padding: '10px 12px', fontSize: 12, color: 'var(--ink)', lineHeight: 1.65,
                        whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)',
                        maxHeight: 280, overflowY: 'auto',
                        border: '1px solid rgba(40,55,30,0.12)',
                      }}>
                        {r.preview || <span style={{ color: 'var(--ink-3)', fontStyle: 'italic' }}>(không có nội dung)</span>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {result.results.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--ink-3)', fontSize: 13 }}>
              Không crawl được trang nào
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid var(--glass-line)', flexShrink: 0,
          background: 'rgba(255,255,255,0.25)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          {allLoginDetected ? (
            <div style={{ fontSize: 12.5, color: 'var(--bad)', lineHeight: 1.5 }}>
              <strong>Cookie chưa hoạt động.</strong> Kiểm tra lại: đúng domain? Cookie còn hạn? Thử copy toàn bộ header Cookie từ DevTools Network tab.
            </div>
          ) : (
            <div style={{ fontSize: 12.5, color: 'var(--good)', lineHeight: 1.5 }}>
              <strong>Nội dung hợp lệ.</strong> Bạn có thể nhấn "Nạp URL" để lưu vào ChromaDB.
            </div>
          )}
          <button onClick={onClose} className="btn btn-soft btn-sm" style={{ marginLeft: 'auto', flexShrink: 0 }}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────── */
export default function RagChatPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [model, setModel] = useState<Model>('gemini-2.5-flash');
  const [embedModel, setEmbedModel] = useState<EmbedModel>('openai');
  const [urls, setUrls] = useState<IngestedUrl[]>([]);
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());
  const [urlInput, setUrlInput] = useState('');
  const [addingUrl, setAddingUrl] = useState(false);
  const [cookieInput, setCookieInput] = useState('');
  const [showCookie, setShowCookie] = useState(false);
  const [sideTab, setSideTab] = useState<'settings' | 'sources'>('settings');
  const [inspectUrl, setInspectUrl] = useState<{ url: string; title: string } | null>(null);
  const [debugResult, setDebugResult] = useState<IngestDebugResult | null>(null);
  const [debugUrl, setDebugUrl] = useState('');
  const [debugLoading, setDebugLoading] = useState(false);
  const [debugError, setDebugError] = useState<string | null>(null);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const [setupDone, setSetupDone] = useState(false);
  const [openaiKey, setOpenaiKey] = useState<string | undefined>(
    localStorage.getItem('rag_openai_key') ?? undefined
  );
  const [geminiKey, setGeminiKey] = useState<string>('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const [backendStarting, setBackendStarting] = useState(false);
  const [backendErr, setBackendErr] = useState<string | null>(null);
  const [showFlowBuilder, setShowFlowBuilder] = useState(false);

  // Check backend status
  const checkStatus = useCallback(async () => {
    try {
      const alive = await pingBackend();
      if (alive) {
        setBackendErr(null);
        setBackendOk(true);
        const list = await ragListSources().catch(() => []);
        setUrls(list.map((src: import('../lib/rag-api').SourceInfo) => ({ ...src, status: 'ok' as const })));
        setSelectedUrls(new Set(list.map((s: import('../lib/rag-api').SourceInfo) => s.url)));
      } else {
        setBackendErr('Backend không phản hồi');
        setBackendOk(false);
      }
    } catch (e) {
      setBackendErr(e instanceof Error ? e.message : String(e));
      setBackendOk(false);
    }
  }, []);

  const handleStartBackend = async () => {
    setBackendStarting(true);
    setBackendErr(null);
    try {
      const result = await invoke<string>('start_rag_backend');
      if (result === 'already_running') {
        await checkStatus();
        return;
      }
      // Poll tối đa 15 giây cho uvicorn khởi động
      for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 1000));
        const alive = await pingBackend();
        if (alive) { await checkStatus(); return; }
      }
      await checkStatus(); // lần cuối để hiện lỗi cụ thể
    } catch (e: unknown) {
      setBackendErr(e instanceof Error ? e.message : String(e));
      setBackendOk(false);
    } finally {
      setBackendStarting(false);
    }
  };

  useEffect(() => {
    const savedKey = localStorage.getItem('rag_openai_key');
    if (savedKey) { setSetupDone(true); setOpenaiKey(savedKey); }

    // Load Gemini key: ưu tiên Tauri store, fallback về localStorage
    invoke<{ gemini_api_key?: string }>('get_settings')
      .then(s => {
        const key = s.gemini_api_key || localStorage.getItem('gemini_api_key') || '';
        if (key) setGeminiKey(key);
      })
      .catch(() => {
        const key = localStorage.getItem('gemini_api_key') || '';
        if (key) setGeminiKey(key);
      });

    // Spawn backend, sau đó poll cho đến khi ready (tối đa 12s)
    (async () => {
      try {
        await invoke('start_rag_backend');
      } catch (e) {
        console.warn('[backend] start_rag_backend:', e);
      }
      for (let i = 0; i < 12; i++) {
        await new Promise(r => setTimeout(r, 1000));
        const alive = await pingBackend();
        if (alive) { await checkStatus(); return; }
      }
      await checkStatus(); // hiện lỗi thực sự nếu không kết nối được
    })();
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
        geminiKey || undefined,
        selectedUrls.size > 0 && selectedUrls.size < urls.filter(u => u.status === 'ok').length
          ? [...selectedUrls]
          : undefined,
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
      const res = await ragIngestUrl(trimmed, 1, openaiKey, cookieInput.trim() || undefined, geminiKey || undefined);
      setUrls(prev => prev.map(u =>
        u.url === trimmed && u.status === 'loading'
          ? { ...u, status: 'ok', chunks: res.chunks }
          : u
      ));
      setSelectedUrls(prev => new Set([...prev, trimmed]));
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

  const handleDebugUrl = async () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    setDebugLoading(true);
    setDebugError(null);
    setDebugResult(null);
    setDebugUrl(trimmed);
    try {
      const res = await ragIngestDebug(trimmed, cookieInput.trim() || undefined);
      setDebugResult(res);
    } catch (e: unknown) {
      setDebugError(e instanceof Error ? e.message : 'Lỗi không xác định');
    } finally {
      setDebugLoading(false);
    }
  };

  const handleDeleteUrl = async (url: string) => {
    setUrls(prev => prev.filter(u => u.url !== url));
    setSelectedUrls(prev => { const s = new Set(prev); s.delete(url); return s; });
    await ragDeleteSource(url).catch(() => { });
  };

  const totalChunks = urls.filter(u => u.status === 'ok').reduce((s, u) => s + u.chunks, 0);
  const okCount = urls.filter(u => u.status === 'ok').length;

  const SUGGESTED = [
    'APTIS Writing Part 3 yêu cầu gì?',
    'Cách dùng connectives trong bài viết?',
    'Pháp thức câu điều kiện loại 2?',
  ];

  return (
    <>
      <div className="screen" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'none' }}>
        {/* Setup modal */}
        {!setupDone && (
          <RagSetupModal
            onReady={() => {
              setSetupDone(true);
              refreshSources();
            }}
            onDismiss={() => setSetupDone(true)}
          />
        )}

        {/* Chunk inspector */}
        {inspectUrl && (
          <ChunkInspector
            url={inspectUrl.url}
            title={inspectUrl.title}
            onClose={() => setInspectUrl(null)}
          />
        )}

        {/* Debug result modal */}
        {debugResult && (
          <DebugResultModal
            result={debugResult}
            url={debugUrl}
            onClose={() => { setDebugResult(null); setDebugError(null); }}
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
              {backendStarting
                ? 'Đang khởi động Python backend...'
                : <>Python backend chưa chạy.{backendErr && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, opacity: 0.8, marginLeft: 6 }}>({backendErr})</span>}</>}
            </span>
            {!backendStarting && (
              <button onClick={handleStartBackend} style={{
                padding: '4px 14px', borderRadius: 'var(--r-pill)', fontSize: 12, fontWeight: 700,
                background: 'var(--accent)', border: 'none',
                color: 'var(--accent-ink)', cursor: 'pointer', flexShrink: 0,
              }}>
                Khởi động
              </button>
            )}
            {backendStarting && (
              <span style={{
                width: 16, height: 16, borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.6)', borderTopColor: 'transparent',
                animation: 'rag-spin 0.7s linear infinite', display: 'inline-block', flexShrink: 0,
              }} />
            )}
            <button onClick={checkStatus} style={{
              padding: '4px 12px', borderRadius: 'var(--r-pill)', fontSize: 12, fontWeight: 700,
              background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff', cursor: 'pointer', flexShrink: 0,
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
                    <ModelOption val="gemini-2.5-flash" label="Gemini 2.5 Flash" desc="Google AI · Gemini API key" free={false} active={model === 'gemini-2.5-flash'} onClick={() => setModel('gemini-2.5-flash')} />
                    <ModelOption val="gemini-2.0-flash" label="Gemini 2.0 Flash" desc="Google AI · Gemini API key" free={false} active={model === 'gemini-2.0-flash'} onClick={() => setModel('gemini-2.0-flash')} />
                    <ModelOption val="gpt-4o" label="GPT-4o" desc="OpenAI API · cần API key" free={false} active={model === 'gpt-4o'} onClick={() => setModel('gpt-4o')} />

                    {/* Gemini key status */}
                    {(model === 'gemini-2.5-flash' || model === 'gemini-2.0-flash') && (
                      <div style={{ marginTop: 8 }}>
                        {geminiKey ? (
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 7,
                            padding: '7px 10px', borderRadius: 'var(--r-sm)',
                            background: 'rgba(111,174,90,0.12)',
                            border: '1px solid rgba(111,174,90,0.28)',
                          }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--good)', boxShadow: '0 0 5px var(--good)', flexShrink: 0 }} />
                            <span style={{ fontSize: 11.5, color: 'var(--good)', fontWeight: 600 }}>Gemini key từ Cài đặt</span>
                          </div>
                        ) : (
                          <div style={{
                            display: 'flex', alignItems: 'center', gap: 7,
                            padding: '7px 10px', borderRadius: 'var(--r-sm)',
                            background: 'rgba(217,138,106,0.12)',
                            border: '1px solid rgba(217,138,106,0.3)',
                          }}>
                            <Icon name="lightbulb" size={13} style={{ color: 'var(--warn)', flexShrink: 0 }} />
                            <span style={{ fontSize: 11.5, color: 'var(--warn)' }}>Chưa có key — vào <strong>Cài đặt</strong> để thêm</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Embedding */}
                  <div>
                    <div className="label-cap" style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 10 }}>Embedding model</div>
                    {([
                      ['google', 'text-embedding-004', 'Google AI · dùng Gemini key', false],
                      ['openai', 'text-embedding-3', 'OpenAI · cần OpenAI key', false],
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
                    display: 'flex', gap: 12,
                  }}>
                    {[
                      ['Nguồn web', okCount],
                      ['Tổng chunks', totalChunks],
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
                      {/* URL input */}
                      <input
                        value={urlInput}
                        onChange={e => setUrlInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !showCookie && handleAddUrl()}
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

                      {/* Toggle cookie */}
                      <button
                        onClick={() => setShowCookie(v => !v)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 6,
                          fontSize: 11.5, color: showCookie ? 'var(--accent)' : 'rgba(255,255,255,0.4)',
                          padding: '2px 0', alignSelf: 'flex-start',
                        }}
                      >
                        <Icon name="bookmark" size={12} />
                        {showCookie ? 'Ẩn cookie' : 'Trang cần đăng nhập? Thêm cookie'}
                      </button>

                      {/* Cookie input */}
                      {showCookie && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>
                            Mở DevTools (F12) → Network → click request → copy giá trị header <code style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 5px', borderRadius: 3 }}>Cookie</code>
                          </div>
                          <textarea
                            value={cookieInput}
                            onChange={e => setCookieInput(e.target.value)}
                            placeholder="session=abc123; token=xyz; csrftoken=..."
                            rows={3}
                            style={{
                              padding: '8px 10px', borderRadius: 'var(--r-sm)',
                              background: 'rgba(255,255,255,0.08)',
                              border: '1px solid rgba(255,255,255,0.18)',
                              color: '#fff', fontSize: 11.5, outline: 'none',
                              fontFamily: 'var(--font-mono)', resize: 'vertical',
                              lineHeight: 1.5,
                            }}
                          />
                        </div>
                      )}

                      {debugError && (
                        <div style={{
                          padding: '7px 10px', borderRadius: 'var(--r-sm)', fontSize: 11.5,
                          background: 'rgba(217,80,60,0.15)', border: '1px solid rgba(217,80,60,0.3)',
                          color: 'var(--bad)', fontFamily: 'var(--font-mono)', lineHeight: 1.5,
                        }}>
                          {debugError}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={handleAddUrl} className="btn btn-primary btn-sm" style={{ flex: 1, fontSize: 12 }}>
                          <Icon name="globe" size={13} /> Nạp URL
                        </button>
                        <button
                          onClick={handleDebugUrl}
                          disabled={debugLoading || !urlInput.trim()}
                          className="btn btn-soft btn-sm"
                          style={{ fontSize: 12, gap: 5 }}
                          title="Kiểm tra nội dung crawl và xác thực cookie"
                        >
                          {debugLoading
                            ? <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', border: '2px solid currentColor', borderTopColor: 'transparent', animation: 'rag-spin 0.7s linear infinite' }} />
                            : <Icon name="eye" size={12} />
                          }
                          {debugLoading ? 'Đang kiểm tra...' : 'Kiểm tra'}
                        </button>
                        <button onClick={() => { setAddingUrl(false); setUrlInput(''); setCookieInput(''); setShowCookie(false); setDebugError(null); }} className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>
                          Huỷ
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
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
                      <button onClick={() => setShowFlowBuilder(true)} style={{
                        width: '100%', padding: '10px 0', borderRadius: 'var(--r-sm)',
                        background: 'rgba(78,205,196,0.07)',
                        border: '1.5px dashed rgba(78,205,196,0.3)',
                        color: '#4ECDC4', fontSize: 13, fontWeight: 700,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                        transition: 'all 160ms var(--ease)',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(78,205,196,0.15)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(78,205,196,0.07)'; }}
                      >
                        <span style={{ fontSize: 15 }}>⚡</span> Thêm auto workflow
                      </button>
                    </div>
                  )}

                  {/* Source selection header */}
                  {urls.filter(u => u.status === 'ok').length > 0 && (() => {
                    const okUrls = urls.filter(u => u.status === 'ok');
                    const allSelected = okUrls.every(u => selectedUrls.has(u.url));
                    const nSelected = okUrls.filter(u => selectedUrls.has(u.url)).length;
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 2px', marginBottom: 2 }}>
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                          <span style={{ color: nSelected < okUrls.length ? 'var(--accent)' : 'rgba(255,255,255,0.4)' }}>{nSelected}</span>/{okUrls.length} nguồn đang dùng
                        </span>
                        <button onClick={() => {
                          if (allSelected) {
                            setSelectedUrls(new Set());
                          } else {
                            setSelectedUrls(new Set(okUrls.map(u => u.url)));
                          }
                        }} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 11, cursor: 'pointer', padding: '2px 4px', borderRadius: 4 }}>
                          {allSelected ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                        </button>
                      </div>
                    );
                  })()}

                  {/* URL list */}
                  {urls.map(u => {
                    const isSelected = selectedUrls.has(u.url);
                    const toggleSelect = () => {
                      if (u.status !== 'ok') return;
                      setSelectedUrls(prev => {
                        const next = new Set(prev);
                        if (next.has(u.url)) next.delete(u.url); else next.add(u.url);
                        return next;
                      });
                    };
                    return (
                      <div key={u.url} className="rag-url-row" style={{
                        padding: '10px 11px', borderRadius: 'var(--r-sm)',
                        background: 'rgba(255,255,255,0.05)',
                        border: `1px solid ${u.status === 'ok' && isSelected ? 'rgba(217,232,157,0.25)' : 'rgba(255,255,255,0.09)'}`,
                        display: 'flex', gap: 9, alignItems: 'flex-start',
                        opacity: u.status === 'ok' && !isSelected ? 0.45 : 1,
                        transition: 'opacity 160ms, border-color 160ms',
                      }}>
                        {/* Checkbox for ok sources */}
                        {u.status === 'ok' ? (
                          <button onClick={toggleSelect} title={isSelected ? 'Bỏ chọn nguồn này' : 'Chọn nguồn này'} style={{
                            flexShrink: 0, marginTop: 1, width: 16, height: 16, borderRadius: 4,
                            border: `2px solid ${isSelected ? 'var(--accent)' : 'rgba(255,255,255,0.25)'}`,
                            background: isSelected ? 'var(--accent)' : 'transparent',
                            cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 120ms',
                          }}>
                            {isSelected && <span style={{ color: '#1a1a1a', fontSize: 10, lineHeight: 1, fontWeight: 900 }}>✓</span>}
                          </button>
                        ) : (
                          <span style={{ marginTop: 1, flexShrink: 0 }}>
                            {u.status === 'loading'
                              ? <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'rag-spin 0.7s linear infinite' }} />
                              : <Icon name="close" size={15} style={{ color: 'var(--bad)' }} />
                            }
                          </span>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11.5, fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.8)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.url}</div>
                          <div style={{ fontSize: 11, color: u.status === 'error' ? 'var(--bad)' : 'rgba(255,255,255,0.35)', marginTop: 3 }}>
                            {u.status === 'loading' ? 'Đang crawl + nhúng dữ liệu...'
                              : u.status === 'ok' ? `${u.chunks} chunks`
                                : (u.errorMsg ?? 'Lỗi không xác định')}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                          {u.status === 'ok' && (
                            <button
                              className="rag-del"
                              onClick={() => setInspectUrl({ url: u.url, title: u.title || u.url })}
                              title="Xem dữ liệu chunk"
                              style={{ opacity: 0, transition: 'opacity 160ms', background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', padding: 2 }}>
                              <Icon name="eye" size={14} />
                            </button>
                          )}
                          <button className="rag-del" onClick={() => handleDeleteUrl(u.url)}
                            title="Xoá nguồn"
                            style={{ opacity: 0, transition: 'opacity 160ms', background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', padding: 2 }}>
                            <Icon name="trash" size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {urls.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '28px 0', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                      Chưa có nguồn dữ liệu
                    </div>
                  )}


                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showFlowBuilder && (
        <AutomationFlowBuilder
          openaiKey={openaiKey}
          geminiKey={geminiKey}
          onClose={() => setShowFlowBuilder(false)}
          onComplete={(flowUrl, chunks) => {
            setUrls(prev => {
              const exists = prev.find(u => u.url === flowUrl);
              if (exists) return prev.map(u => u.url === flowUrl ? { ...u, status: 'ok', chunks } : u);
              return [...prev, { url: flowUrl, title: flowUrl, chunks, status: 'ok' }];
            });
            setShowFlowBuilder(false);
          }}
        />
      )}
    </>
  );
}
