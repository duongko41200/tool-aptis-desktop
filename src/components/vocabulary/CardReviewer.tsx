import { useState, useEffect, useCallback } from 'react';
import { useSubmitRating, useBuryCard, useSuspendCard, useFlagCard } from '../../hooks/useAnki';
import type { Card, CardRating, FlagColor } from '../../types/anki';

interface Props {
  cards: Card[];
  onFinish: (stats: { again: number; hard: number; good: number; easy: number }) => void;
}

const FLAG_COLORS: { color: FlagColor; label: string; bg: string }[] = [
  { color: 'red', label: '🟥 Red', bg: '#fef2f2' },
  { color: 'yellow', label: '🟨 Yellow', bg: '#fefce8' },
  { color: 'green', label: '🟩 Green', bg: '#f0fdf4' },
  { color: null, label: '⬜ Clear', bg: '#f8fafc' },
];

function renderClozeForCard(text: string, cardType: string): string {
  const match = cardType.match(/cloze_(\d+)/);
  if (!match) return text;
  const targetIdx = parseInt(match[1]);
  return text.replace(/\{\{c(\d+)::([^}]+)\}\}/g, (_: string, idx: string, answer: string) =>
    parseInt(idx) === targetIdx ? '[...]' : answer
  );
}

function stripCloze(text: string): string {
  return text.replace(/\{\{c\d+::([^}]+)\}\}/g, '$1');
}

export default function CardReviewer({ cards, onFinish }: Props) {
  const [index, setIndex] = useState(0);
  const [queue, setQueue] = useState<Card[]>([...cards]);
  const [flipped, setFlipped] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [stats, setStats] = useState({ again: 0, hard: 0, good: 0, easy: 0 });

  const { mutateAsync: submitRating } = useSubmitRating();
  const { mutateAsync: buryCard } = useBuryCard();
  const { mutateAsync: suspendCard } = useSuspendCard();
  const { mutateAsync: flagCard } = useFlagCard();

  const current = queue[index];
  const remaining = queue.length - index;

  const handleRate = useCallback(async (rating: CardRating) => {
    if (!current) return;
    await submitRating({ cardId: current.id, rating });
    const newStats = { ...stats, [rating]: stats[rating as keyof typeof stats] + 1 };
    setStats(newStats);

    if (rating === 'again') {
      // Re-queue at end
      setQueue(prev => [...prev, current]);
    }

    if (index + 1 >= queue.length) {
      onFinish(newStats);
    } else {
      setIndex(i => i + 1);
      setFlipped(false);
      setShowMore(false);
    }
  }, [current, index, queue, stats, submitRating, onFinish]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === ' ') { e.preventDefault(); setFlipped(f => !f); }
      if (!flipped) return;
      if (e.key === '1') handleRate('again');
      else if (e.key === '2') handleRate('hard');
      else if (e.key === '3') handleRate('good');
      else if (e.key === '4') handleRate('easy');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [flipped, handleRate]);

  if (!current) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No cards.</div>;
  }

  const isCloze = current.card_type?.startsWith('cloze');
  const frontText = isCloze && current.front
    ? renderClozeForCard(current.front, current.card_type)
    : (current.front ?? '');
  const backText = isCloze && current.front
    ? stripCloze(current.front)
    : (current.back ?? '');

  const flagBg = current.flag_color === 'red' ? '#fef2f2' : current.flag_color === 'yellow' ? '#fefce8' : current.flag_color === 'green' ? '#f0fdf4' : '#fff';

  const stateBadge = current.state === 'new' ? { bg: '#dbeafe', color: '#1e40af', label: 'NEW' }
    : current.state === 'learning' ? { bg: '#fef3c7', color: '#92400e', label: 'LEARNING' }
    : { bg: '#d1fae5', color: '#065f46', label: 'REVIEW' };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0f172a' }}>
      {/* Progress bar */}
      <div style={{ height: 4, background: '#1e293b' }}>
        <div style={{ height: '100%', background: '#7c3aed', width: `${((cards.length - remaining) / cards.length) * 100}%`, transition: 'width 0.3s' }} />
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px' }}>
        <span style={{ fontSize: 11, color: '#475569', fontWeight: 700 }}>{remaining} remaining</span>
        <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 99, background: stateBadge.bg, color: stateBadge.color }}>{stateBadge.label}</span>
        <button onClick={() => setShowMore(!showMore)} style={{ background: 'none', border: '1px solid #334155', color: '#94a3b8', borderRadius: 6, padding: '3px 10px', fontSize: 11, cursor: 'pointer' }}>
          ··· More
        </button>
      </div>

      {/* More menu */}
      {showMore && (
        <div style={{ position: 'absolute', right: 20, top: 60, background: '#1e293b', border: '1px solid #334155', borderRadius: 12, padding: 8, zIndex: 10, minWidth: 160 }}>
          <button onClick={async () => { await buryCard(current.id); setShowMore(false); if (index + 1 >= queue.length) onFinish(stats); else { setIndex(i => i + 1); setFlipped(false); } }}
            style={{ display: 'block', width: '100%', padding: '7px 12px', textAlign: 'left', background: 'none', border: 'none', color: '#e2e8f0', fontSize: 12, cursor: 'pointer', borderRadius: 8 }}>
            💤 Bury (until tomorrow)
          </button>
          <button onClick={async () => { await suspendCard({ cardId: current.id, suspended: true }); setShowMore(false); if (index + 1 >= queue.length) onFinish(stats); else { setIndex(i => i + 1); setFlipped(false); } }}
            style={{ display: 'block', width: '100%', padding: '7px 12px', textAlign: 'left', background: 'none', border: 'none', color: '#e2e8f0', fontSize: 12, cursor: 'pointer', borderRadius: 8 }}>
            🚫 Suspend (forever)
          </button>
          <div style={{ borderTop: '1px solid #334155', margin: '4px 0' }} />
          {FLAG_COLORS.map(f => (
            <button key={String(f.color)} onClick={async () => { await flagCard({ cardId: current.id, color: f.color }); setShowMore(false); }}
              style={{ display: 'block', width: '100%', padding: '7px 12px', textAlign: 'left', background: 'none', border: 'none', color: '#e2e8f0', fontSize: 12, cursor: 'pointer', borderRadius: 8 }}>
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Card */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div
          onClick={() => !flipped && setFlipped(true)}
          style={{
            width: '100%', maxWidth: 520, minHeight: 200, background: flagBg, borderRadius: 20,
            border: '2px solid #e2e8f0', padding: 28, cursor: flipped ? 'default' : 'pointer',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            display: 'flex', flexDirection: 'column', gap: 12,
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', lineHeight: 1.4 }}>{frontText}</div>
          {current.flag_color && (
            <div style={{ fontSize: 12, color: '#64748b' }}>🏴 Flagged</div>
          )}

          {!flipped ? (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <span style={{ fontSize: 13, color: '#94a3b8' }}>Space or tap to reveal</span>
            </div>
          ) : (
            <>
              <div style={{ borderTop: '2px dashed #e2e8f0', paddingTop: 12 }}>
                <div style={{ fontSize: 18, color: '#334155', lineHeight: 1.5 }}>{backText || (isCloze ? '(Cloze — see highlighted above)' : '')}</div>
                {current.example && (
                  <div style={{ marginTop: 8, fontSize: 13, color: '#64748b', fontStyle: 'italic', borderLeft: '3px solid #c4b5fd', paddingLeft: 10 }}>
                    {current.example}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Rating buttons */}
      {flipped && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, padding: '0 20px 20px' }}>
          {([
            { rating: 'again', label: 'Again', sub: '<10m', color: '#ef4444', key: '1' },
            { rating: 'hard', label: 'Hard', sub: '<1d', color: '#f97316', key: '2' },
            { rating: 'good', label: 'Good', sub: '~3d', color: '#22c55e', key: '3' },
            { rating: 'easy', label: 'Easy', sub: '~7d', color: '#3b82f6', key: '4' },
          ] as const).map(b => (
            <button key={b.rating} onClick={() => handleRate(b.rating)}
              style={{ background: b.color, color: '#fff', border: 'none', borderRadius: 12, padding: '12px 4px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <span style={{ fontSize: 14, fontWeight: 900 }}>{b.label}</span>
              <span style={{ fontSize: 10, opacity: 0.8 }}>{b.sub} [{b.key}]</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
