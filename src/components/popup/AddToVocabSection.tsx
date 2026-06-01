import { useState, useRef } from 'react';
import { useDecks, useCreateDeck, useCreateNoteFromClipboard } from '../../hooks/useAnki';
import type { TemplateType } from '../../types/anki';

interface Props {
  content: string;
  onSaved: () => void;
}

export default function AddToVocabSection({ content, onSaved }: Props) {
  const { data: decks = [] } = useDecks();
  const { mutateAsync: createDeck } = useCreateDeck();
  const { mutateAsync: createNote, isPending } = useCreateNoteFromClipboard();

  const [deckId, setDeckId] = useState<number | ''>('');
  const [template, setTemplate] = useState<TemplateType>('basic');
  const [front, setFront] = useState(content.slice(0, 200));
  const [back, setBack] = useState('');
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
  };

  const handleSave = async () => {
    if (!deckId) { setError('Please select a deck.'); return; }
    if (!front.trim()) { setError('Front field is required.'); return; }
    if (template === 'basic' && !back.trim()) { setError('Back (meaning) is required for Basic card.'); return; }
    if (template === 'cloze' && clozeCount === 0) { setError('Add at least one {{c1::answer}} cloze.'); return; }
    setError(null);
    try {
      await createNote({ deckId: deckId as number, templateType: template, front, back: back || undefined, tags: tags || undefined });
      onSaved();
    } catch (e) { setError(String(e)); }
  };

  return (
    <div style={{ padding: '10px 0 4px' }}>
      <div style={{ fontSize: 10, fontWeight: 900, color: '#7c3aed', letterSpacing: 1, marginBottom: 8 }}>📚 ADD TO VOCABULARY</div>

      {/* Template */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        {(['basic', 'cloze'] as TemplateType[]).map(t => (
          <button key={t} onClick={() => setTemplate(t)}
            style={{ flex: 1, padding: '5px', border: '2px solid', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
              borderColor: template === t ? '#7c3aed' : '#e2e8f0',
              background: template === t ? '#faf5ff' : '#f8fafc',
              color: template === t ? '#5b21b6' : '#94a3b8' }}>
            {t === 'basic' ? '📖 Basic' : '[…] Cloze'}
          </button>
        ))}
      </div>

      {/* Front */}
      <div style={{ marginBottom: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b' }}>{template === 'cloze' ? 'CLOZE TEXT' : 'WORD / FRONT'}</span>
          {template === 'cloze' && (
            <button onClick={handleClozeWrap}
              style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 5, padding: '2px 8px', fontSize: 10, fontWeight: 700, cursor: 'pointer' }}>
              [c] Wrap
            </button>
          )}
        </div>
        <textarea ref={frontRef} value={front} onChange={e => setFront(e.target.value)} rows={2}
          style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '6px 8px', fontSize: 12, outline: 'none', resize: 'none', fontFamily: 'monospace', boxSizing: 'border-box' }} />
        {template === 'cloze' && clozeCount > 0 && (
          <div style={{ fontSize: 9, color: '#7c3aed', fontWeight: 700, marginTop: 2 }}>{clozeCount} cloze → {clozeCount} card{clozeCount > 1 ? 's' : ''}</div>
        )}
      </div>

      {/* Back (basic only) */}
      {template === 'basic' && (
        <div style={{ marginBottom: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 3 }}>MEANING / BACK</span>
          <input value={back} onChange={e => setBack(e.target.value)} placeholder="Nghĩa…"
            style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '6px 8px', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
        </div>
      )}

      {/* Deck selector */}
      <div style={{ marginBottom: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 3 }}>DECK</span>
        {!showNewDeck ? (
          <div style={{ display: 'flex', gap: 5 }}>
            <select value={deckId} onChange={e => setDeckId(e.target.value ? Number(e.target.value) : '')}
              style={{ flex: 1, border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '5px 8px', fontSize: 12, outline: 'none' }}>
              <option value="">Select deck…</option>
              {decks.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
            </select>
            <button onClick={() => setShowNewDeck(true)} title="New deck"
              style={{ background: '#f1f5f9', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '5px 10px', fontSize: 11, cursor: 'pointer', color: '#7c3aed', fontWeight: 700 }}>
              +
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 5 }}>
            <input value={newDeckName} onChange={e => setNewDeckName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreateDeck()}
              placeholder="New deck name…" autoFocus
              style={{ flex: 1, border: '2px solid #7c3aed', borderRadius: 8, padding: '5px 8px', fontSize: 12, outline: 'none' }} />
            <button onClick={handleCreateDeck} style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Create</button>
            <button onClick={() => setShowNewDeck(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '5px 8px', fontSize: 11, cursor: 'pointer' }}>×</button>
          </div>
        )}
      </div>

      {/* Tags */}
      <div style={{ marginBottom: 8 }}>
        <input value={tags} onChange={e => setTags(e.target.value)} placeholder="Tags: ielts, vocab…"
          style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '5px 8px', fontSize: 11, outline: 'none', boxSizing: 'border-box' }} />
      </div>

      {error && <p style={{ color: '#dc2626', fontSize: 11, margin: '0 0 6px' }}>{error}</p>}

      <button onClick={handleSave} disabled={isPending}
        style={{ width: '100%', background: isPending ? '#94a3b8' : 'linear-gradient(135deg,#7c3aed,#2563eb)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px', fontSize: 13, fontWeight: 900, cursor: isPending ? 'wait' : 'pointer' }}>
        {isPending ? 'Saving…' : '📚 Save to Vocab'}
      </button>
    </div>
  );
}
