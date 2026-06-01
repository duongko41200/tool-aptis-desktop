import { useState } from 'react';
import { useNotesForDeck, useDueCards, useCreateNote, useDeleteNote } from '../../hooks/useAnki';
import NoteEditor from './NoteEditor';
import type { Deck } from '../../types/anki';

interface Props {
  deck: Deck;
  onStartReview: () => void;
  onShowGuide: () => void;
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

export default function DeckStudyView({ deck, onStartReview, onShowGuide }: Props) {
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
        <button onClick={() => setShowEditor(false)} className="btn-ghost" style={{ marginBottom: 16, fontSize: 13 }}>← Back</button>
        <div className="glass-card-dark" style={{ padding: 24 }}>
          <NoteEditor deckId={deck.id} onClose={() => setShowEditor(false)} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      {/* Deck header */}
      <div className="glass-card-dark" style={{ margin: 16, marginBottom: 0, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14 }}>
        <div>
          <div className="label-upper" style={{ color: 'var(--accent-primary)' }}>STUDYING</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-primary)', marginTop: 2 }}>{deck.full_name}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onShowGuide} className="btn-ghost" style={{ fontSize: 11, padding: '5px 12px' }}>📖 Guide</button>
          <button onClick={handleSeed} disabled={seeding} title="Add 10 sample notes" className="btn-ghost" style={{ fontSize: 11, padding: '5px 12px', borderColor: 'rgba(16,185,129,0.5)', color: '#6ee7b7' }}>
            {seeding ? '⏳…' : '🧪 Seed'}
          </button>
        </div>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Stats */}
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { label: 'NEW',      count: dueResult?.new_count ?? 0,      color: '#60a5fa' },
            { label: 'LEARNING', count: dueResult?.learning_count ?? 0, color: '#fb923c' },
            { label: 'REVIEW',   count: dueResult?.review_count ?? 0,   color: '#4ade80' },
          ].map(s => (
            <div key={s.label} className="glass-card" style={{ flex: 1, padding: '12px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: s.color }}>{s.count}</div>
              <div className="label-upper" style={{ marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Start Review CTA */}
        <div className={totalDue > 0 ? 'glass-card-dark' : 'glass-card'} style={{ padding: '20px 22px', position: 'relative', overflow: 'hidden', borderRadius: 16, ...(totalDue > 0 ? { borderColor: 'rgba(212,245,106,0.2)' } : {}) }}>
          {totalDue > 0 && (
            <div style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 72, fontWeight: 900, color: 'rgba(212,245,106,0.08)', lineHeight: 1, pointerEvents: 'none' }}>{totalDue}</div>
          )}
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-primary)', marginBottom: 4 }}>
              {totalDue > 0 ? `${totalDue} cards to review` : notes.length === 0 ? 'Add your first note' : '🎉 All caught up!'}
            </div>
            <button
              onClick={onStartReview}
              className={totalDue > 0 ? 'btn-primary' : 'btn-muted'}
              style={{ marginTop: 10 }}
            >
              ▶ START REVIEW{totalDue > 0 ? ` (${totalDue})` : ''}
            </button>
          </div>
        </div>

        {/* Note list */}
        <div className="glass-card-dark" style={{ overflow: 'hidden' }}>
          {/* Note list header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--border-dark)' }}>
            <span className="label-upper">NOTES ({notes.length})</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search…"
                className="lofi-input"
                style={{ width: 100, padding: '3px 8px', fontSize: 11 }}
              />
              <button onClick={() => setShowEditor(true)} className="btn-primary" style={{ padding: '4px 12px', fontSize: 11 }}>
                + Add Note
              </button>
            </div>
          </div>

          {notes.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
              No notes yet. Click "+ Add Note" or "🧪 Seed" to get started.
            </div>
          ) : notes.slice(0, 20).map(n => (
            <div key={n.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid var(--border-dark)', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{n.front.slice(0, 50)}{n.front.length > 50 ? '…' : ''}</span>
                {n.back && <span style={{ color: 'var(--text-secondary)', fontSize: 12, marginLeft: 8 }}>{n.back.slice(0, 40)}</span>}
              </div>
              <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 99, background: n.template_type === 'cloze' ? 'rgba(212,245,106,0.12)' : 'rgba(74,222,128,0.12)', color: n.template_type === 'cloze' ? 'var(--accent-primary)' : '#4ade80' }}>
                {n.template_type.toUpperCase()}
              </span>
              {n.tags && n.tags.split(',').slice(0, 2).map((t, i) => (
                <span key={i} style={{ fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 99, background: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}>{t.trim()}</span>
              ))}
              <button onClick={() => deleteNote(n.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: 14 }}>×</button>
            </div>
          ))}
          {notes.length > 20 && (
            <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center' }}>+{notes.length - 20} more notes</div>
          )}
        </div>
      </div>
    </div>
  );
}
