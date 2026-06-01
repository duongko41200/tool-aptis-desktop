import { useState, useRef } from 'react';
import { useCreateNote } from '../../hooks/useAnki';
import type { TemplateType } from '../../types/anki';

interface Props {
  deckId: number;
  onClose: () => void;
  initialFront?: string;
  initialBack?: string;
}

const TEMPLATES: { value: TemplateType; label: string; desc: string }[] = [
  { value: 'basic', label: 'Basic', desc: '1 card: Front → Back' },
  { value: 'basic_reverse', label: 'Basic + Reverse', desc: '2 cards: both directions' },
  { value: 'cloze', label: 'Cloze', desc: 'Fill-in-the-blank cards' },
];

export default function NoteEditor({ deckId, onClose, initialFront = '', initialBack = '' }: Props) {
  const [template, setTemplate] = useState<TemplateType>('basic');
  const [front, setFront] = useState(initialFront);
  const [back, setBack] = useState(initialBack);
  const [example, setExample] = useState('');
  const [tags, setTags] = useState('');
  const [error, setError] = useState<string | null>(null);
  const frontRef = useRef<HTMLTextAreaElement>(null);
  const { mutateAsync: createNote, isPending } = useCreateNote();

  const clozeCount = front.match(/\{\{c\d+::/g)?.length ?? 0;

  const handleClozeWrap = () => {
    const ta = frontRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if (start === end) return;
    const selected = front.slice(start, end);
    const existing = (front.match(/\{\{c(\d+)::/g) ?? []).map(m => parseInt(m.replace('{{c', '').replace('::', '')));
    const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
    const wrapped = `{{c${next}::${selected}}}`;
    setFront(front.slice(0, start) + wrapped + front.slice(end));
  };

  const handleSubmit = async () => {
    if (!front.trim()) { setError('Front field is required.'); return; }
    if (template !== 'cloze' && !back.trim()) { setError('Back field is required.'); return; }
    if (template === 'cloze' && clozeCount === 0) { setError('Add at least one cloze deletion using {{c1::answer}} or the Cloze button.'); return; }
    setError(null);
    try {
      await createNote({ deckId, templateType: template, front, back: back || undefined, example: example || undefined, tags: tags || undefined });
      onClose();
    } catch (e) { setError(String(e)); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#0f172a' }}>New Note</h3>

      {/* Template selector */}
      <div style={{ display: 'flex', gap: 8 }}>
        {TEMPLATES.map(t => (
          <button key={t.value} onClick={() => setTemplate(t.value)}
            style={{
              flex: 1, padding: '7px 4px', border: '2px solid', borderRadius: 10, fontSize: 11, fontWeight: 700, cursor: 'pointer',
              borderColor: template === t.value ? '#7c3aed' : '#e2e8f0',
              background: template === t.value ? '#faf5ff' : '#f8fafc',
              color: template === t.value ? '#5b21b6' : '#64748b',
            }}>
            {t.label}
            <div style={{ fontSize: 9, fontWeight: 400, marginTop: 2, opacity: 0.7 }}>{t.desc}</div>
          </button>
        ))}
      </div>

      {/* Front field */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
          <label style={{ fontSize: 11, fontWeight: 800, color: '#64748b', letterSpacing: 1 }}>
            {template === 'cloze' ? 'TEXT WITH CLOZE' : 'FRONT'}
          </label>
          {template === 'cloze' && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {clozeCount > 0 && (
                <span style={{ fontSize: 10, color: '#7c3aed', fontWeight: 700 }}>{clozeCount} cloze{clozeCount > 1 ? 's' : ''} → {clozeCount} cards</span>
              )}
              <button onClick={handleClozeWrap}
                style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                [c] Wrap Cloze
              </button>
            </div>
          )}
        </div>
        <textarea
          ref={frontRef}
          value={front} onChange={e => setFront(e.target.value)}
          rows={3} placeholder={template === 'cloze' ? 'Tokyo is the {{c1::capital}} of Japan…' : 'Word or question…'}
          style={{ width: '100%', border: '2px solid #e2e8f0', borderRadius: 10, padding: '8px 12px', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'monospace', boxSizing: 'border-box' }}
        />
      </div>

      {/* Back field (not for cloze) */}
      {template !== 'cloze' && (
        <div>
          <label style={{ fontSize: 11, fontWeight: 800, color: '#64748b', letterSpacing: 1, display: 'block', marginBottom: 5 }}>BACK</label>
          <textarea value={back} onChange={e => setBack(e.target.value)}
            rows={2} placeholder="Meaning or answer…"
            style={{ width: '100%', border: '2px solid #e2e8f0', borderRadius: 10, padding: '8px 12px', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 800, color: '#64748b', letterSpacing: 1, display: 'block', marginBottom: 4 }}>EXAMPLE</label>
          <input value={example} onChange={e => setExample(e.target.value)}
            placeholder="Example sentence…"
            style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '7px 10px', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 800, color: '#64748b', letterSpacing: 1, display: 'block', marginBottom: 4 }}>TAGS</label>
          <input value={tags} onChange={e => setTags(e.target.value)}
            placeholder="ielts, vocab…"
            style={{ width: '100%', border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '7px 10px', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
        </div>
      </div>

      {error && <p style={{ color: '#dc2626', fontSize: 12, margin: 0 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={handleSubmit} disabled={isPending}
          style={{ flex: 1, background: isPending ? '#94a3b8' : '#7c3aed', color: '#fff', border: 'none', borderRadius: 12, padding: '11px', fontSize: 14, fontWeight: 900, cursor: isPending ? 'wait' : 'pointer' }}>
          {isPending ? 'Creating…' : 'Add Note'}
        </button>
        <button onClick={onClose}
          style={{ padding: '11px 20px', background: '#f1f5f9', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer', color: '#64748b' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
