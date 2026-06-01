import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { saveCapturedContent, hideClipboardPopup } from '../../services/tauriCommands';
import type { ContentCategory } from '../../types';

interface Props {
  content: string;
  charCount: number;
  onClose: () => void;
}

const CATEGORIES: { value: ContentCategory; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'vocabulary', label: 'Vocabulary' },
  { value: 'grammar', label: 'Grammar' },
  { value: 'reading', label: 'Reading' },
  { value: 'writing', label: 'Writing' },
  { value: 'speaking', label: 'Speaking' },
];

const AUTO_DISMISS_MS = 10000;

export default function ClipboardPopup({ content, charCount, onClose }: Props) {
  const [category, setCategory] = useState<ContentCategory>('general');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [folder, setFolder] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(AUTO_DISMISS_MS / 1000);
  const timerRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);

  const close = async () => {
    clearTimers();
    onClose();
    await hideClipboardPopup();
  };

  const clearTimers = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null; }
  };

  const resetTimer = () => {
    clearTimers();
    setCountdown(AUTO_DISMISS_MS / 1000);
    timerRef.current = window.setTimeout(close, AUTO_DISMISS_MS);
    countdownRef.current = window.setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(countdownRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    resetTimer();
    return clearTimers;
  }, [content]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const addTag = (val: string) => {
    const trimmed = val.trim().replace(/,/g, '');
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
    }
    setTagInput('');
    resetTimer();
  };

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveCapturedContent({
        content,
        category,
        folder: folder || undefined,
        tags: tags.length > 0 ? tags : undefined,
      });
      await close();
    } catch (e) {
      setError(String(e));
      setSaving(false);
    }
  };

  const preview = content.length > 200 ? content.slice(0, 200) + '…' : content;

  return (
    <div
      className="fixed inset-0 flex items-end justify-end p-0"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div
        className="w-full bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden"
        onMouseEnter={resetTimer}
        style={{ fontFamily: 'system-ui, sans-serif' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-blue-600 text-white">
          <span className="text-sm font-semibold">📋 Save to Library</span>
          <div className="flex items-center gap-2">
            <span className="text-xs opacity-70">{countdown}s</span>
            <button onClick={close} className="text-white/80 hover:text-white text-lg leading-none">×</button>
          </div>
        </div>

        {/* Content preview */}
        <div className="px-3 pt-2 pb-1">
          <p className="text-xs text-gray-500 mb-1">{charCount} characters</p>
          <div className="bg-gray-50 rounded px-2 py-1.5 text-xs text-gray-700 max-h-16 overflow-y-auto leading-relaxed border">
            {preview}
          </div>
        </div>

        {/* Category */}
        <div className="px-3 py-1.5">
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value as ContentCategory); resetTimer(); }}
            className="w-full border rounded px-2 py-1 text-xs"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* Tags */}
        <div className="px-3 py-1">
          <div className="flex flex-wrap gap-1 mb-1">
            {tags.map((t, i) => (
              <span key={i} className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded flex items-center gap-0.5">
                {t}
                <button onClick={() => { setTags(tags.filter((_, j) => j !== i)); resetTimer(); }}
                  className="text-blue-400 hover:text-blue-700 ml-0.5">×</button>
              </span>
            ))}
          </div>
          <input
            type="text"
            value={tagInput}
            onChange={(e) => { setTagInput(e.target.value); resetTimer(); }}
            onKeyDown={handleTagKeyDown}
            onBlur={() => tagInput.trim() && addTag(tagInput)}
            placeholder="Tags (Enter to add)…"
            className="w-full border rounded px-2 py-1 text-xs"
          />
        </div>

        {/* Folder */}
        <div className="px-3 py-1">
          <input
            type="text"
            value={folder}
            onChange={(e) => { setFolder(e.target.value); resetTimer(); }}
            placeholder="Folder (optional)…"
            className="w-full border rounded px-2 py-1 text-xs"
          />
        </div>

        {error && (
          <div className="px-3 py-1 text-xs text-red-500">{error}</div>
        )}

        {/* Actions */}
        <div className="flex gap-2 px-3 py-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-xs py-1.5 rounded font-medium"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={close}
            className="flex-1 border hover:bg-gray-50 text-gray-600 text-xs py-1.5 rounded"
          >
            Ignore
          </button>
        </div>
      </div>
    </div>
  );
}
