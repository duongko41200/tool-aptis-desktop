import { useState } from 'react';
import { useNotesForDeck, useDueCards, useCreateNote, useDeleteNote } from '../../hooks/useAnki';
import NoteEditor from './NoteEditor';
import type { Deck } from '../../types/anki';

interface Props {
  deck: Deck;
  onStartReview: () => void;
}

const SEED_NOTES = [
  { front: 'serendipity', back: 'tình cờ gặp điều may mắn', example: 'It was pure serendipity that we met.', tags: 'vocab' },
  { front: 'ubiquitous', back: 'có mặt khắp nơi, phổ biến', example: 'Smartphones are ubiquitous in modern life.', tags: 'vocab' },
  { front: 'ephemeral', back: 'thoáng qua, tồn tại ngắn', example: 'The ephemeral beauty of cherry blossoms.', tags: 'vocab' },
  { front: 'The capital of {{c1::Japan}} is {{c2::Tokyo}}.', back: null, example: null, tags: 'cloze,geography', template: 'cloze' as const },
  { front: 'eloquent', back: 'hùng hồn, diễn đạt lưu loát', example: 'She gave an eloquent speech.', tags: 'vocab' },
  { front: 'perseverance', back: 'sự kiên trì', example: 'Success requires perseverance.', tags: 'vocab' },
  { front: 'Water boils at {{c1::100°C}} at sea level.', back: null, example: null, tags: 'cloze,science', template: 'cloze' as const },
  { front: 'meticulous', back: 'tỉ mỉ, cẩn thận đến từng chi tiết', example: 'He was meticulous in his research.', tags: 'vocab' },
  { front: 'resilient', back: 'kiên cường, phục hồi nhanh', example: 'Children are often more resilient.', tags: 'vocab' },
  { front: 'exacerbate', back: 'làm trầm trọng thêm', example: 'Stress can exacerbate health issues.', tags: 'vocab' },
];

export default function DeckStudyView({ deck, onStartReview }: Props) {
  const [showEditor, setShowEditor] = useState(false);
  const [search, setSearch] = useState('');
  const [seeding, setSeeding] = useState(false);

  const { data: dueResult } = useDueCards(deck.id, true);
  const { data: notes = [] } = useNotesForDeck(deck.id, { includeSubdecks: true, search: search || undefined });
  const { mutateAsync: createNote } = useCreateNote();
  const { mutateAsync: deleteNote } = useDeleteNote();

  const totalDue = (dueResult?.new_count ?? 0) + (dueResult?.learning_count ?? 0) + (dueResult?.review_count ?? 0);

  const handleSeed = async () => {
    setSeeding(true);
    for (const n of SEED_NOTES) {
      try {
        await createNote({
          deckId: deck.id,
          templateType: n.template ?? 'basic',
          front: n.front,
          back: n.back ?? undefined,
          example: n.example ?? undefined,
          tags: n.tags,
        });
      } catch { /* skip duplicates */ }
    }
    setSeeding(false);
  };

  if (showEditor) {
    return (
      <div style={{ padding: 24, maxWidth: 560, margin: '0 auto' }}>
        <button onClick={() => setShowEditor(false)} style={{ background: 'none', border: 'none', color: '#7c3aed', fontWeight: 700, fontSize: 13, cursor: 'pointer', marginBottom: 16 }}>← Back</button>
        <div style={{ background: '#fff', borderRadius: 20, border: '2px solid #e2e8f0', padding: 24 }}>
          <NoteEditor deckId={deck.id} onClose={() => setShowEditor(false)} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto', background: '#f8fafc' }}>
      {/* Deck header */}
      <div style={{ background: '#0f172a', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 10, color: '#7c3aed', fontWeight: 900, letterSpacing: 2 }}>STUDYING</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#f8fafc' }}>{deck.full_name}</div>
        </div>
        <button onClick={handleSeed} disabled={seeding} title="Add 10 sample notes"
          style={{ background: seeding ? '#334155' : 'rgba(16,185,129,0.2)', border: '1px solid #10b981', color: '#6ee7b7', borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 700, cursor: seeding ? 'wait' : 'pointer' }}>
          {seeding ? '⏳ Seeding…' : '🧪 Seed'}
        </button>
      </div>

      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Stats */}
        <div style={{ display: 'flex', gap: 12 }}>
          {[
            { label: 'NEW', count: dueResult?.new_count ?? 0, color: '#3b82f6' },
            { label: 'LEARNING', count: dueResult?.learning_count ?? 0, color: '#f97316' },
            { label: 'REVIEW', count: dueResult?.review_count ?? 0, color: '#22c55e' },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, background: '#fff', borderRadius: 14, padding: '12px 10px', textAlign: 'center', border: `2px solid ${s.color}22` }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: s.color }}>{s.count}</div>
              <div style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', letterSpacing: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Start Review CTA */}
        <div style={{ background: totalDue > 0 ? 'linear-gradient(135deg,#0f172a,#1e1b4b)' : '#fff', borderRadius: 18, padding: '20px 22px', border: totalDue > 0 ? 'none' : '2px solid #e2e8f0', position: 'relative', overflow: 'hidden' }}>
          {totalDue > 0 && (
            <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 80, fontWeight: 900, color: 'rgba(124,58,237,0.15)', lineHeight: 1 }}>{totalDue}</div>
          )}
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: totalDue > 0 ? '#f8fafc' : '#0f172a', marginBottom: 4 }}>
              {totalDue > 0 ? `${totalDue} cards to review` : notes.length === 0 ? 'Add your first note' : '🎉 All caught up!'}
            </div>
            <button onClick={onStartReview}
              style={{
                marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 8,
                background: totalDue > 0 ? '#7c3aed' : '#e2e8f0',
                color: totalDue > 0 ? '#fff' : '#94a3b8',
                border: 'none', borderRadius: 12, padding: '11px 22px', fontSize: 14, fontWeight: 900, cursor: 'pointer',
                boxShadow: totalDue > 0 ? '0 0 20px rgba(124,58,237,0.4)' : 'none',
              }}>
              ▶ START REVIEW{totalDue > 0 ? ` (${totalDue})` : ''}
            </button>
          </div>
        </div>

        {/* Note list */}
        <div style={{ background: '#fff', borderRadius: 16, border: '2px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '2px solid #0f172a', background: '#0f172a' }}>
            <span style={{ fontSize: 11, fontWeight: 900, color: '#f8fafc', letterSpacing: 2 }}>NOTES ({notes.length})</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search…"
                style={{ border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9', borderRadius: 6, padding: '3px 8px', fontSize: 11, outline: 'none', width: 100 }} />
              <button onClick={() => setShowEditor(true)}
                style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, padding: '4px 12px', fontSize: 11, fontWeight: 800, cursor: 'pointer' }}>
                + Add Note
              </button>
            </div>
          </div>
          {notes.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
              No notes yet. Click "+ Add Note" or "🧪 Seed" to get started.
            </div>
          ) : notes.slice(0, 20).map(n => (
            <div key={n.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #f1f5f9', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{n.front.slice(0, 50)}{n.front.length > 50 ? '…' : ''}</span>
                {n.back && <span style={{ color: '#94a3b8', fontSize: 12, marginLeft: 8 }}>{n.back.slice(0, 40)}</span>}
              </div>
              <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 99, background: n.template_type === 'cloze' ? '#faf5ff' : '#f0fdf4', color: n.template_type === 'cloze' ? '#5b21b6' : '#065f46' }}>
                {n.template_type.toUpperCase()}
              </span>
              {n.tags && n.tags.split(',').slice(0, 2).map((t, i) => (
                <span key={i} style={{ fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 99, background: '#f1f5f9', color: '#64748b' }}>{t.trim()}</span>
              ))}
              <button onClick={() => deleteNote(n.id)} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', fontSize: 14 }}>×</button>
            </div>
          ))}
          {notes.length > 20 && <div style={{ padding: '8px 16px', fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>+{notes.length - 20} more notes</div>}
        </div>
      </div>
    </div>
  );
}
