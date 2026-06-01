import { useState, useEffect, useRef, type KeyboardEvent } from 'react';
import { saveCapturedContent, hideClipboardPopup } from '../../services/tauriCommands';
import type { ContentCategory } from '../../types';
import AddToVocabSection from './AddToVocabSection';

interface Props {
  content: string;
  charCount: number;
  onClose: () => void;
}

const CATEGORIES: { value: ContentCategory; label: string; emoji: string; bg: string; text: string }[] = [
  { value: 'vocabulary', label: 'Vocab',    emoji: '📖', bg: '#ede9fe', text: '#5b21b6' },
  { value: 'grammar',    label: 'Grammar',  emoji: '✏️', bg: '#d1fae5', text: '#065f46' },
  { value: 'reading',    label: 'Reading',  emoji: '📰', bg: '#fef3c7', text: '#92400e' },
  { value: 'writing',    label: 'Writing',  emoji: '🖊️', bg: '#fce7f3', text: '#9d174d' },
  { value: 'speaking',   label: 'Speaking', emoji: '🎙️', bg: '#dbeafe', text: '#1e40af' },
  { value: 'general',    label: 'General',  emoji: '🗂️', bg: '#f1f5f9', text: '#475569' },
];

const DISMISS_SEC = 10;

export default function ClipboardPopup({ content, charCount, onClose }: Props) {
  const [category, setCategory]     = useState<ContentCategory>('general');
  const [tagInput, setTagInput]     = useState('');
  const [tags, setTags]             = useState<string[]>([]);
  const [folder, setFolder]         = useState('');
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [countdown, setCountdown]   = useState(DISMISS_SEC);
  const dismissRef = useRef<number | null>(null);
  const cdRef      = useRef<number | null>(null);


  const clearTimers = () => {
    if (dismissRef.current) clearTimeout(dismissRef.current);
    if (cdRef.current)      clearInterval(cdRef.current);
  };

  const close = async () => {
    clearTimers();
    onClose();
    await hideClipboardPopup();
  };

  const resetTimer = () => {
    clearTimers();
    setCountdown(DISMISS_SEC);
    dismissRef.current = window.setTimeout(close, DISMISS_SEC * 1000);
    cdRef.current = window.setInterval(() =>
      setCountdown(p => p > 1 ? p - 1 : 0), 1000);
  };

  useEffect(() => { resetTimer(); return clearTimers; }, [content]);

  useEffect(() => {
    const h = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const addTag = (val: string) => {
    const t = val.trim().replace(/,/g, '');
    if (t && !tags.includes(t)) setTags(p => [...p, t]);
    setTagInput('');
    resetTimer();
  };

  const handleTagKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      // Save to knowledge library
      await saveCapturedContent({
        content,
        category,
        folder: folder || undefined,
        tags: tags.length ? tags : undefined,
      });

      setSaved(true);
      setTimeout(close, 700);
    } catch (e) {
      setError(String(e));
      setSaving(false);
    }
  };

  const preview = content.length > 160 ? content.slice(0, 160) + '…' : content;
  const ringPct = (countdown / DISMISS_SEC) * 283;

  return (
    <div className="w-full h-full flex items-center justify-center p-0 select-none">
      <div
        className="w-full rounded-2xl overflow-hidden"
        style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.22)', background: '#fff' }}
        onMouseEnter={resetTimer}
      >
        {/* Header — drag region */}
        <div
          data-tauri-drag-region
          className="flex items-center justify-between px-4 py-3 cursor-grab active:cursor-grabbing"
          style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">📋</span>
            <span className="text-white font-bold text-sm tracking-wide">Save to Library</span>
          </div>
          <div className="flex items-center gap-3">
            <svg width="22" height="22" viewBox="0 0 50 50">
              <circle cx="25" cy="25" r="20" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="5" />
              <circle cx="25" cy="25" r="20" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="5"
                strokeDasharray={`${ringPct} 283`} strokeLinecap="round"
                transform="rotate(-90 25 25)"
                style={{ transition: 'stroke-dasharray 0.9s linear' }} />
              <text x="25" y="31" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">{countdown}</text>
            </svg>
            <button onClick={close} className="text-white/70 hover:text-white text-xl font-light leading-none">×</button>
          </div>
        </div>

        {/* Content preview */}
        <div className="px-4 pt-3 pb-2">
          <div className="rounded-xl px-3 py-2.5 text-sm leading-relaxed max-h-16 overflow-y-auto"
            style={{ background: '#f8fafc', color: '#0f172a', border: '1px solid #e2e8f0' }}>
            {preview}
          </div>
          <p className="text-right text-xs mt-0.5" style={{ color: '#94a3b8' }}>{charCount} chars</p>
        </div>

        {/* Category */}
        <div className="px-4 pb-2">
          <p className="text-xs font-semibold mb-1.5" style={{ color: '#64748b' }}>CATEGORY</p>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map(c => (
              <button key={c.value}
                onClick={() => { setCategory(c.value); resetTimer(); }}
                className="px-2.5 py-1 rounded-full text-xs font-semibold transition-all"
                style={{
                  background: category === c.value ? c.bg : '#f1f5f9',
                  color: category === c.value ? c.text : '#94a3b8',
                  border: `2px solid ${category === c.value ? c.text + '44' : 'transparent'}`,
                  transform: category === c.value ? 'scale(1.05)' : 'scale(1)',
                }}>
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="px-4 pb-2">
          <div className="flex flex-wrap gap-1 mb-1">
            {tags.map((t, i) => (
              <span key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ background: '#ede9fe', color: '#5b21b6' }}>
                #{t}
                <button onClick={() => { setTags(tags.filter((_, j) => j !== i)); resetTimer(); }}
                  className="hover:opacity-70">×</button>
              </span>
            ))}
          </div>
          <input type="text" value={tagInput}
            onChange={e => { setTagInput(e.target.value); resetTimer(); }}
            onKeyDown={handleTagKey}
            onBlur={() => tagInput.trim() && addTag(tagInput)}
            placeholder="Tags (Enter to add)…"
            className="w-full rounded-lg px-3 py-1.5 text-xs outline-none"
            style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#0f172a' }} />
        </div>

        {/* Folder */}
        <div className="px-4 pb-2">
          <input type="text" value={folder}
            onChange={e => { setFolder(e.target.value); resetTimer(); }}
            placeholder="📁 Folder (optional)"
            className="w-full rounded-lg px-3 py-1.5 text-xs outline-none"
            style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', color: '#0f172a' }} />
        </div>

        {/* ── Add to Vocab (Anki) section ── */}
        <div className="px-3 mb-2">
          <AddToVocabSection content={content} onSaved={() => { close(); }} />
        </div>

        {error && <p className="px-4 pb-1 text-xs" style={{ color: '#dc2626' }}>{error}</p>}

        {/* Actions — save to library only */}
        <div className="flex gap-2 px-4 pb-4">
          <button
            onClick={handleSave}
            disabled={saving || saved}
            className="flex-1 py-2 rounded-xl text-sm font-bold text-white transition-all"
            style={{
              background: saved ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #475569, #334155)',
              opacity: saving ? 0.7 : 1,
            }}>
            {saved ? '✓ Saved to Library!' : saving ? 'Saving…' : '📋 Save to Library'}
          </button>
          <button onClick={close}
            className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{ background: '#f1f5f9', color: '#64748b', border: '1.5px solid #e2e8f0' }}>
            Ignore
          </button>
        </div>
      </div>
    </div>
  );
}
