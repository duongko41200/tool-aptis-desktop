import { useState, useRef, useEffect } from 'react';
import { emit } from '@tauri-apps/api/event';
import { useDecks, useCreateDeck, useCreateNoteFromClipboard } from '../../hooks/useAnki';
import type { TemplateType } from '../../types/anki';
import Icon from '../common/Icon';
import { generateMeaning } from '../../services/gemini-vocab';

interface Props {
  content: string;
  onSaved: () => void;
}

export default function AddToVocabSection({ content, onSaved }: Props) {
  const { data: decks = [], refetch: refetchDecks } = useDecks();
  const { mutateAsync: createDeck } = useCreateDeck();
  const { mutateAsync: createNote, isPending } = useCreateNoteFromClipboard();

  const [deckId, setDeckId] = useState<number | ''>('');
  const [template, setTemplate] = useState<TemplateType>('basic');
  const [front, setFront] = useState(content.slice(0, 200));
  const [back, setBack] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAiHovered, setIsAiHovered] = useState(false);

  useEffect(() => {
    setFront(content.slice(0, 200));
    refetchDecks();
  }, [content, refetchDecks]);
  
  const [tags, setTags] = useState('');
  const [newDeckName, setNewDeckName] = useState('');
  const [showNewDeck, setShowNewDeck] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const frontRef = useRef<HTMLTextAreaElement>(null);

  const clozeCount = front.match(/\{\{c\d+::/g)?.length ?? 0;

  const handleClozeWrap = () => {
    const ta = frontRef.current;
    if (!ta) return;
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    if (s === e) return;
    const selected = front.slice(s, e);
    const existing = (front.match(/\{\{c(\d+)::/g) ?? []).map(m => parseInt(m.replace('{{c', '').replace('::', '')));
    const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
    setFront(front.slice(0, s) + `{{c${next}::${selected}}}` + front.slice(e));
  };

  const handleCreateDeck = async () => {
    if (!newDeckName.trim()) return;
    const d = await createDeck({ name: newDeckName.trim() });
    setDeckId(d.id);
    setNewDeckName('');
    setShowNewDeck(false);
    await emit('anki:data-changed', { type: 'deck-created' });
  };

  const handleSave = async () => {
    if (!deckId) { setError('Vui lòng chọn bộ thẻ (deck).'); return; }
    if (!front.trim()) { setError('Mặt trước không được để trống.'); return; }
    if (template === 'basic' && !back.trim()) { setError('Nghĩa (Mặt sau) là bắt buộc cho Cơ bản.'); return; }
    if (template === 'cloze' && clozeCount === 0) { setError('Thêm ít nhất một vùng trống {{c1::answer}}.'); return; }
    setError(null);
    try {
      await createNote({ deckId: deckId as number, templateType: template, front, back: back || undefined, tags: tags || undefined });
      await emit('anki:data-changed', { type: 'note-created' });
      onSaved();
    } catch (e) { setError(String(e)); }
  };

  const handleAutoFill = async () => {
    if (!front.trim()) return;
    setIsGenerating(true);
    setError(null);
    try {
      const apiKey = localStorage.getItem('gemini_api_key') || '';
      const result = await generateMeaning(front, apiKey);
      setBack(result);
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div>

      {/* Template */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['basic', 'cloze'] as TemplateType[]).map(t => (
          <button key={t} onClick={() => setTemplate(t)}
            style={{ 
              flex: 1, padding: '8px', border: '1px solid', borderRadius: 'var(--r-sm)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              borderColor: template === t ? 'var(--accent)' : 'var(--darkglass-line)',
              background: template === t ? 'rgba(217,232,157,0.1)' : 'rgba(0,0,0,0.2)',
              color: template === t ? 'var(--accent)' : 'var(--on-dark-2)',
              transition: 'all 0.2s var(--ease)'
            }}>
            {t === 'basic' ? '📖 Cơ bản' : '[…] Điền khuyết'}
          </button>
        ))}
      </div>

      {/* Front */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span className="eyebrow" style={{ color: 'var(--ink-3)' }}>{template === 'cloze' ? 'ĐOẠN VĂN (CLOZE)' : 'TỪ VỰNG / MẶT TRƯỚC'}</span>
          {template === 'cloze' && (
            <button onClick={handleClozeWrap}
              className="chip chip-accent" style={{ padding: '2px 8px', fontSize: 10, cursor: 'pointer', border: 'none' }}>
              Bôi đen & Ẩn [c]
            </button>
          )}
        </div>
        <textarea ref={frontRef} value={front} onChange={e => setFront(e.target.value)} rows={2}
          style={{ 
            width: '100%', border: '1px solid var(--darkglass-line)', borderRadius: 'var(--r-sm)', padding: '10px 12px', 
            fontSize: 13, outline: 'none', resize: 'none', fontFamily: 'var(--font-mono)', boxSizing: 'border-box',
            background: 'rgba(0,0,0,0.2)', color: 'var(--on-dark)'
          }} />
        {template === 'cloze' && clozeCount > 0 && (
          <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, marginTop: 4 }}>{clozeCount} chỗ trống → Tạo {clozeCount} thẻ</div>
        )}
      </div>

      {/* Back (basic only) */}
      {template === 'basic' && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span className="eyebrow" style={{ color: 'var(--ink-3)' }}>NGHĨA / MẶT SAU</span>
            <button 
              onClick={handleAutoFill} 
              disabled={isGenerating}
              onMouseEnter={() => setIsAiHovered(true)}
              onMouseLeave={() => setIsAiHovered(false)}
              className="chip chip-accent" 
              style={{ 
                padding: '4px 10px', 
                fontSize: 11, 
                cursor: isGenerating ? 'wait' : 'pointer', 
                border: 'none', 
                display: 'flex', 
                alignItems: 'center', 
                gap: 6, 
                opacity: isGenerating ? 0.6 : 1,
                transition: 'all 0.2s ease',
                transform: isAiHovered && !isGenerating ? 'scale(1.05)' : 'scale(1)',
                boxShadow: isAiHovered && !isGenerating ? '0 0 12px var(--accent)' : 'none',
                filter: isAiHovered && !isGenerating ? 'brightness(1.1)' : 'none'
              }}>
              <Icon name="sparkle" size={14} /> {isGenerating ? 'Đang dịch...' : 'AI Auto-Fill'}
            </button>
          </div>
          <textarea value={back} onChange={e => setBack(e.target.value)} placeholder="Nhập nghĩa..." rows={4}
            style={{ 
              width: '100%', border: '1px solid var(--darkglass-line)', borderRadius: 'var(--r-sm)', padding: '10px 12px', 
              fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', background: 'rgba(0,0,0,0.2)', color: 'var(--on-dark)'
            }} />
        </div>
      )}

      {/* Deck selector & Tags */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <span className="eyebrow" style={{ display: 'block', color: 'var(--ink-3)', marginBottom: 6 }}>BỘ THẺ (DECK)</span>
          {!showNewDeck ? (
            <div style={{ display: 'flex', gap: 6 }}>
              <select value={deckId} onChange={e => setDeckId(e.target.value ? Number(e.target.value) : '')}
                style={{ 
                  flex: 1, border: '1px solid var(--darkglass-line)', borderRadius: 'var(--r-sm)', padding: '8px 10px', 
                  fontSize: 13, outline: 'none', background: 'rgba(0,0,0,0.2)', color: 'var(--on-dark)'
                }}>
                <option value="" style={{ color: '#000' }}>Chọn bộ thẻ…</option>
                {decks.map(d => <option key={d.id} value={d.id} style={{ color: '#000' }}>{d.full_name}</option>)}
              </select>
              <button onClick={() => setShowNewDeck(true)} title="Tạo mới" className="btn btn-ghost" style={{ padding: '0 12px', borderRadius: 'var(--r-sm)' }}>
                +
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={newDeckName} onChange={e => setNewDeckName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateDeck()}
                placeholder="Tên bộ thẻ..." autoFocus
                style={{ flex: 1, border: '1px solid var(--accent)', borderRadius: 'var(--r-sm)', padding: '8px 10px', fontSize: 13, outline: 'none', background: 'rgba(0,0,0,0.2)', color: 'var(--on-dark)' }} />
              <button onClick={handleCreateDeck} className="btn btn-primary" style={{ padding: '0 10px', borderRadius: 'var(--r-sm)', fontSize: 12 }}>Tạo</button>
              <button onClick={() => setShowNewDeck(false)} className="btn btn-ghost" style={{ padding: '0 10px', borderRadius: 'var(--r-sm)' }}>×</button>
            </div>
          )}
        </div>
        <div style={{ flex: 1 }}>
           <span className="eyebrow" style={{ display: 'block', color: 'var(--ink-3)', marginBottom: 6 }}>TAGS</span>
           <input value={tags} onChange={e => setTags(e.target.value)} placeholder="ielts, vocab..."
             style={{ 
               width: '100%', border: '1px solid var(--darkglass-line)', borderRadius: 'var(--r-sm)', padding: '8px 10px', 
               fontSize: 13, outline: 'none', boxSizing: 'border-box', background: 'rgba(0,0,0,0.2)', color: 'var(--on-dark)'
             }} />
        </div>
      </div>

      {error && <p style={{ color: '#ef4444', fontSize: 12, margin: '0 0 10px' }}>{error}</p>}

      <button onClick={handleSave} disabled={isPending} className="btn btn-primary"
        style={{ width: '100%', padding: '12px', fontSize: 14, borderRadius: 'var(--r-sm)', opacity: isPending ? 0.7 : 1 }}>
        {isPending ? 'Đang lưu…' : '📚 Lưu vào Từ vựng Anki'}
      </button>
    </div>
  );
}
