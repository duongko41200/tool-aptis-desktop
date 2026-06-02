import { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useQueryClient } from '@tanstack/react-query';
import { setPendingVocabWord } from '../store/appSlice';
import type { RootState } from '../store';
import {
  useDecks, useDueCards, useNotesForDeck,
  useSubmitRating, useBuryCard, useSuspendCard,
  useCreateNote, useCreateDeck, useDeleteDeck,
} from '../hooks/useAnki';
import type { Card, Deck, CardRating, TemplateType } from '../types/anki';
import TopBar from '../components/layout/TopBar';
import Icon from '../components/common/Icon';

/* ── helpers ──────────────────────────────────────── */
function renderClozeForCard(text: string, cardType: string): string {
  const m = cardType.match(/cloze_(\d+)/);
  if (!m) return text;
  const target = parseInt(m[1]);
  return text.replace(/\{\{c(\d+)::([^}]+)\}\}/g, (_: string, idx: string, ans: string) =>
    parseInt(idx) === target ? '[...]' : ans
  );
}
function stripCloze(text: string) {
  return text.replace(/\{\{c\d+::([^}]+)\}\}/g, '$1');
}

/* ── STATE BADGE ──────────────────────────────────── */
function StateBadge({ state }: { state: Card['state'] }) {
  const map = {
    new:      { label: 'Mới',     bg: 'rgba(106,166,196,0.18)', color: 'var(--info)' },
    learning: { label: 'Học',     bg: 'rgba(224,169,59,0.18)',  color: 'var(--warn)' },
    review:   { label: 'Ôn tập', bg: 'rgba(111,174,90,0.18)',  color: 'var(--good)' },
  };
  const s = map[state];
  return (
    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase',
      padding: '3px 9px', borderRadius: 'var(--r-pill)', background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
}

/* ── DECK SIDEBAR ─────────────────────────────────── */
interface DeckSidebarProps {
  decks: Deck[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}
function DeckSidebar({ decks, selectedId, onSelect }: DeckSidebarProps) {
  const { mutateAsync: createDeck } = useCreateDeck();
  const { mutateAsync: deleteDeck } = useDeleteDeck();
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [parentId, setParentId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const rootDecks = decks.filter(d => d.parent_deck_id === null);
  const childDecks = (pid: number) => decks.filter(d => d.parent_deck_id === pid);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true); setCreateError(null);
    try {
      await createDeck({ name: newName.trim(), parentDeckId: parentId ?? undefined });
      setNewName(''); setShowForm(false); setParentId(null);
    } catch (e) { setCreateError(String(e)); }
    finally { setCreating(false); }
  };

  const DeckRow = ({ deck, depth }: { deck: Deck; depth: number }) => {
    const total = deck.new_count + deck.learning_count + deck.review_count;
    const active = selectedId === deck.id;
    return (
      <>
        <button
          onClick={() => onSelect(deck.id)}
          style={{
            width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center',
            gap: 9, padding: `10px 16px 10px ${16 + depth * 14}px`,
            background: active ? 'rgba(217,232,157,0.28)' : 'transparent',
            border: 'none', borderRadius: active ? 'var(--r-sm)' : 0,
            borderLeft: active ? '2px solid var(--accent-deep)' : '2px solid transparent',
            cursor: 'pointer', transition: 'all 140ms var(--ease)',
          }}
          onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(40,55,30,0.05)'; }}
          onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
        >
          {depth > 0
            ? <Icon name="chevR" size={12} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
            : <Icon name="cards" size={15} style={{ color: active ? 'var(--accent-deep)' : 'var(--ink-3)', flexShrink: 0 }} />
          }
          <span style={{ flex: 1, fontSize: 13.5, fontWeight: active ? 800 : 600, color: active ? 'var(--ink)' : 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {deck.name}
          </span>
          {total > 0 && (
            <span style={{ fontSize: 11, fontWeight: 800, color: active ? 'var(--accent-deep)' : 'var(--ink-3)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
              {total}
            </span>
          )}
          <button
            onClick={e => { e.stopPropagation(); setConfirmDelete(deck.id); }}
            style={{ background: 'none', border: 'none', color: 'var(--ink-3)', cursor: 'pointer', padding: '0 2px', opacity: 0.6, lineHeight: 1, fontSize: 15 }}
            title="Xoá bộ thẻ"
          >×</button>
        </button>
        {childDecks(deck.id).map(c => <DeckRow key={c.id} deck={c} depth={depth + 1} />)}
      </>
    );
  };

  return (
    <div className="glass" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--glass-edge)' }}>
        <div className="label-cap" style={{ color: 'var(--accent-deep)' }}>Bộ thẻ</div>
      </div>

      <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {decks.length === 0 ? (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
            Chưa có bộ thẻ nào.
          </div>
        ) : rootDecks.map(d => <DeckRow key={d.id} deck={d} depth={0} />)}
      </div>

      {/* Delete confirm */}
      {confirmDelete !== null && (
        <div style={{ padding: 12, borderTop: '1px solid var(--glass-edge)', background: 'rgba(217,138,106,0.1)' }}>
          <p style={{ fontSize: 12.5, color: 'var(--bad)', margin: '0 0 10px', fontWeight: 600 }}>Xoá bộ thẻ và toàn bộ thẻ con?</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={async () => { await deleteDeck(confirmDelete); setConfirmDelete(null); }}
              className="btn btn-sm" style={{ flex: 1, background: 'var(--bad)', color: '#fff' }}>Xoá</button>
            <button onClick={() => setConfirmDelete(null)} className="btn btn-soft btn-sm" style={{ flex: 1 }}>Huỷ</button>
          </div>
        </div>
      )}

      {/* Create form */}
      <div style={{ padding: 12, borderTop: '1px solid var(--glass-edge)' }}>
        {showForm ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input
              value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="Tên bộ thẻ…" autoFocus
              style={{ width: '100%', background: 'rgba(255,255,255,0.65)', border: '1px solid var(--glass-edge)', borderRadius: 'var(--r-sm)', padding: '8px 12px', fontSize: 13, outline: 'none', color: 'var(--ink)', fontFamily: 'var(--font)' }}
            />
            <select
              value={parentId ?? ''} onChange={e => setParentId(e.target.value ? Number(e.target.value) : null)}
              style={{ width: '100%', background: 'rgba(255,255,255,0.65)', border: '1px solid var(--glass-edge)', borderRadius: 'var(--r-sm)', padding: '7px 12px', fontSize: 12, color: 'var(--ink)', fontFamily: 'var(--font)' }}
            >
              <option value="">Bộ thẻ gốc</option>
              {decks.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
            </select>
            {createError && <p style={{ fontSize: 11, color: 'var(--bad)', margin: 0 }}>{createError}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleCreate} disabled={creating} className="btn btn-primary btn-sm" style={{ flex: 1 }}>
                {creating ? '…' : 'Tạo'}
              </button>
              <button onClick={() => { setShowForm(false); setCreateError(null); }} className="btn btn-soft btn-sm" style={{ flex: 1 }}>Huỷ</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowForm(true)} className="btn btn-soft btn-sm" style={{ width: '100%' }}>
            <Icon name="plus" size={14} /> Bộ thẻ mới
          </button>
        )}
      </div>
    </div>
  );
}

/* ── FLASHCARD ────────────────────────────────────── */
interface FlashcardProps {
  card: Card;
  flipped: boolean;
  onFlip: () => void;
  onRate: (r: CardRating) => void;
  onBury: () => void;
  onSuspend: () => void;
  remaining: number;
  progress: number;
  totalInSession: number;
}
function Flashcard({ card, flipped, onFlip, onRate, onBury, onSuspend, remaining, progress, totalInSession }: FlashcardProps) {
  const [showMore, setShowMore] = useState(false);

  const isCloze = card.card_type?.startsWith('cloze');
  const frontText = isCloze && card.front
    ? renderClozeForCard(card.front, card.card_type)
    : (card.front ?? '');
  const backText = isCloze && card.front ? stripCloze(card.front) : (card.back ?? '');

  const RATINGS = [
    { r: 'again' as CardRating, label: 'Ôn lại', sub: '<10 phút', color: 'var(--bad)',    ink: '#fff', key: '1' },
    { r: 'hard'  as CardRating, label: 'Khó',    sub: '~1 ngày',  color: 'var(--warn)',   ink: '#fff', key: '2' },
    { r: 'good'  as CardRating, label: 'Được',   sub: '~3 ngày',  color: 'var(--good)',   ink: '#fff', key: '3' },
    { r: 'easy'  as CardRating, label: 'Dễ',     sub: '~7 ngày',  color: 'var(--accent)', ink: 'var(--accent-ink)', key: '4' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 16 }}>
      {/* Session progress */}
      <div className="glass-2" style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div className="bar"><i style={{ width: `${progress}%` }} /></div>
        </div>
        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--ink)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
          {totalInSession - remaining}/{totalInSession} thẻ
        </span>
        <StateBadge state={card.state} />
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowMore(v => !v)}
            className="iconbtn" style={{ width: 32, height: 32, background: 'rgba(40,55,30,0.07)', color: 'var(--ink-2)', border: '1px solid var(--glass-edge)' }}
            title="Thêm tuỳ chọn"
          >
            <Icon name="list" size={14} />
          </button>
          {showMore && (
            <>
              <div onClick={() => setShowMore(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
              <div className="glass" style={{ position: 'absolute', right: 0, top: 38, zIndex: 41, minWidth: 180, padding: 6, borderRadius: 'var(--r-md)', boxShadow: 'var(--sh-lg)' }}>
                <button onClick={() => { onBury(); setShowMore(false); }}
                  style={{ width: '100%', textAlign: 'left', padding: '9px 12px', borderRadius: 'var(--r-sm)', fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(40,55,30,0.06)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}>
                  <Icon name="calendar" size={15} style={{ color: 'var(--ink-3)' }} /> Chôn đến ngày mai
                </button>
                <button onClick={() => { onSuspend(); setShowMore(false); }}
                  style={{ width: '100%', textAlign: 'left', padding: '9px 12px', borderRadius: 'var(--r-sm)', fontSize: 13.5, fontWeight: 600, color: 'var(--bad)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(217,138,106,0.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}>
                  <Icon name="close" size={15} /> Tạm dừng thẻ này
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Card */}
      <div onClick={!flipped ? onFlip : undefined} style={{ flex: 1, minHeight: 260, position: 'relative', cursor: flipped ? 'default' : 'pointer' }}>
        {!flipped ? (
          /* FRONT */
          <div key="front" className="card-flip" style={{
            position: 'absolute', inset: 0,
            background: '#fff', borderRadius: 'var(--r-xl)',
            border: '1px solid var(--glass-edge)', boxShadow: 'var(--sh-sm)',
            padding: 28, display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              {card.template_type && (
                <span className="chip chip-accent" style={{ fontSize: 11 }}>
                  {card.template_type === 'cloze' ? 'Cloze' : card.template_type === 'basic_reverse' ? 'Đảo chiều' : 'Cơ bản'}
                </span>
              )}
              {card.flag_color && (
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: card.flag_color === 'red' ? 'var(--bad)' : card.flag_color === 'yellow' ? 'var(--warn)' : 'var(--good)', flexShrink: 0 }} />
              )}
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: isCloze ? 18 : 38, fontWeight: 800, color: 'var(--ink)', letterSpacing: isCloze ? '-0.01em' : '-0.03em', lineHeight: 1.2 }}>
                {frontText}
              </div>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', textAlign: 'center', fontWeight: 600 }}>
              Nhấn Space hoặc chạm để xem đáp án →
            </div>
          </div>
        ) : (
          /* BACK */
          <div key="back" className="card-flip" style={{
            position: 'absolute', inset: 0,
            background: 'var(--accent)', borderRadius: 'var(--r-xl)', boxShadow: 'var(--sh-glow)',
            padding: 28, display: 'flex', flexDirection: 'column', justifyContent: 'center',
            color: 'var(--accent-ink)',
          }}>
            <div style={{ marginBottom: 8 }}>
              <div className="label-cap" style={{ color: 'rgba(44,58,22,0.55)', marginBottom: 4 }}>Đáp án</div>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{backText}</div>
            </div>
            {card.example && (
              <div style={{ marginTop: 16 }}>
                <div className="label-cap" style={{ color: 'rgba(44,58,22,0.55)', marginBottom: 4 }}>Ví dụ</div>
                <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.55 }}>{card.example}</div>
              </div>
            )}
            <div style={{ fontSize: 12, marginTop: 'auto', paddingTop: 16, opacity: 0.55, textAlign: 'center', fontWeight: 600 }}>
              ← Nhấn Space để xem lại mặt trước
            </div>
          </div>
        )}
      </div>

      {/* Rating buttons */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10,
        transition: 'all 220ms var(--ease)',
        opacity: flipped ? 1 : 0,
        transform: flipped ? 'none' : 'translateY(8px)',
        pointerEvents: flipped ? 'auto' : 'none',
      }}>
        {RATINGS.map(b => (
          <button key={b.r} onClick={() => onRate(b.r)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              padding: '12px 8px', borderRadius: 'var(--r-md)', border: 'none', cursor: 'pointer',
              background: b.color, color: b.ink,
              transition: 'all 150ms var(--ease)',
              boxShadow: 'var(--sh-sm)',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--sh-md)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--sh-sm)'; }}
          >
            <span style={{ fontSize: 15, fontWeight: 800 }}>{b.label}</span>
            <span style={{ fontSize: 11, opacity: 0.75 }}>{b.sub} · <kbd style={{ fontFamily: 'var(--font-mono)', background: 'rgba(0,0,0,0.12)', padding: '0 4px', borderRadius: 3 }}>{b.key}</kbd></span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── RATING BADGE ─────────────────────────────────── */
const RATING_STYLE: Record<CardRating, { label: string; bg: string; color: string }> = {
  again: { label: 'Lại',  bg: 'rgba(217,138,106,0.18)', color: 'var(--bad)'    },
  hard:  { label: 'Khó',  bg: 'rgba(224,169,59,0.18)',  color: 'var(--warn)'   },
  good:  { label: 'Được', bg: 'rgba(111,174,90,0.18)',  color: 'var(--good)'   },
  easy:  { label: 'Dễ',   bg: 'rgba(217,232,157,0.45)', color: 'var(--accent-deep)' },
};
function RatingBadge({ rating }: { rating: CardRating }) {
  const s = RATING_STYLE[rating];
  return (
    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase',
      padding: '2px 8px', borderRadius: 'var(--r-pill)', background: s.bg, color: s.color, flexShrink: 0 }}>
      {s.label}
    </span>
  );
}

/* ── NOTES PANEL ──────────────────────────────────── */
interface NotesPanelProps {
  selectedDeckId: number | null;
  decks: Deck[];
  dueCards: Card[];
  sessionStats: { again: number; hard: number; good: number; easy: number } | null;
  sessionRatings: Map<number, CardRating>;
  onAddNote: () => void;
  isReviewing: boolean;
}
function NotesPanel({ selectedDeckId, decks, dueCards, sessionStats, sessionRatings, onAddNote, isReviewing }: NotesPanelProps) {
  const [search, setSearch] = useState('');
  const { data: notesData } = useNotesForDeck(selectedDeckId, { search: search || undefined });
  const notes = notesData ?? [];
  const deck = decks.find(d => d.id === selectedDeckId);

  // Build note_id → worst state map from due cards
  // 'new' < 'learning' < 'review' (priority: show least-progressed state)
  const stateOrder = { new: 0, learning: 1, review: 2 } as const;
  const noteStateMap = new Map<number, Card['state']>();
  for (const c of dueCards) {
    const noteId = c.note_id;
    const prev = noteStateMap.get(noteId);
    if (!prev || stateOrder[c.state] < stateOrder[prev]) noteStateMap.set(noteId, c.state);
  }

  const LEVEL_STATS = deck ? [
    { label: 'Mới',    v: deck.new_count,      color: 'var(--info)',       bg: 'rgba(106,166,196,0.15)' },
    { label: 'Học',    v: deck.learning_count,  color: 'var(--warn)',       bg: 'rgba(224,169,59,0.15)'  },
    { label: 'Ôn tập', v: deck.review_count,    color: 'var(--good)',       bg: 'rgba(111,174,90,0.15)'  },
  ] : [];

  return (
    <div className="glass" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--glass-edge)' }}>
        <div className="label-cap" style={{ color: 'var(--accent-deep)', marginBottom: 2 }}>Kho từ</div>
        {deck && <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginTop: 4 }}>{deck.name}</div>}
      </div>

      {/* Deck-level statistics — always visible when deck selected */}
      {deck && LEVEL_STATS.some(s => s.v > 0) && (
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--glass-edge)', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6 }}>
          {LEVEL_STATS.map(s => (
            <div key={s.label} style={{ textAlign: 'center', padding: '7px 4px', borderRadius: 'var(--r-sm)', background: s.bg, border: `1px solid ${s.color}22` }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: s.color, fontFamily: 'var(--font-mono)' }}>{s.v}</div>
              <div style={{ fontSize: 10, color: s.color, fontWeight: 700, opacity: 0.85 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Session stats — shown whenever a review session is active or just ended */}
      {sessionStats && (
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--glass-edge)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
            <div className="label-cap" style={{ color: isReviewing ? 'var(--accent-deep)' : 'var(--ink-3)' }}>
              {isReviewing ? 'Kết quả theo từng từ' : 'Kết quả buổi ôn'}
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
              {sessionStats.again + sessionStats.hard + sessionStats.good + sessionStats.easy} từ
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 5 }}>
            {([
              { r: 'again' as CardRating, label: 'Lại',  v: sessionStats.again },
              { r: 'hard'  as CardRating, label: 'Khó',  v: sessionStats.hard  },
              { r: 'good'  as CardRating, label: 'Được', v: sessionStats.good  },
              { r: 'easy'  as CardRating, label: 'Dễ',   v: sessionStats.easy  },
            ]).map(s => {
              const rs = RATING_STYLE[s.r];
              return (
                <div key={s.label} style={{ textAlign: 'center', padding: '7px 4px', borderRadius: 'var(--r-md)', background: rs.bg, border: `1.5px solid ${rs.color}44` }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: rs.color, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{s.v}</div>
                  <div style={{ fontSize: 10, color: rs.color, fontWeight: 700, marginTop: 3, opacity: 0.9 }}>{s.label}</div>
                  <div style={{ fontSize: 9, color: rs.color, fontWeight: 600, opacity: 0.6, marginTop: 1 }}>từ</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search */}
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--glass-edge)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.6)', border: '1px solid var(--glass-edge)', borderRadius: 'var(--r-pill)', padding: '7px 12px' }}>
          <Icon name="search" size={14} style={{ color: 'var(--ink-3)', flexShrink: 0 }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Tìm trong bộ thẻ…"
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--font)' }}
          />
        </div>
      </div>

      {/* Notes list */}
      <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {!selectedDeckId ? (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
            Chọn một bộ thẻ để xem từ vựng.
          </div>
        ) : notes.length === 0 ? (
          <div style={{ padding: '32px 16px', textAlign: 'center' }}>
            <span style={{ width: 52, height: 52, borderRadius: 'var(--r-md)', background: 'rgba(217,232,157,0.35)', color: 'var(--accent-ink)', display: 'grid', placeItems: 'center', margin: '0 auto 14px' }}>
              <Icon name="cards" size={24} />
            </span>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>Chưa có từ nào</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 4 }}>Thêm từ mới để bắt đầu học.</div>
          </div>
        ) : notes.map(note => {
          const state    = noteStateMap.get(note.id);
          const rating   = sessionRatings.get(note.id);
          return (
            <div key={note.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--glass-edge)', transition: 'background 140ms var(--ease)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(40,55,30,0.04)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 1 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{note.front}</span>
                  {/* Session rating badge — highest priority, shown if rated this session */}
                  {rating ? (
                    <RatingBadge rating={rating} />
                  ) : state ? (
                    <StateBadge state={state} />
                  ) : (
                    <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '2px 7px', borderRadius: 'var(--r-pill)', background: 'rgba(111,174,90,0.15)', color: 'var(--good)', flexShrink: 0 }}>
                      Đã học
                    </span>
                  )}
                </div>
                {note.back && (
                  <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{note.back}</div>
                )}
                {note.tags && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                    {note.tags.split(',').map(t => t.trim()).filter(Boolean).map(t => (
                      <span key={t} className="chip" style={{ fontSize: 10, padding: '2px 7px' }}>{t}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add note button */}
      <div style={{ padding: 12, borderTop: '1px solid var(--glass-edge)' }}>
        <button onClick={onAddNote} disabled={!selectedDeckId} className="btn btn-primary btn-sm" style={{ width: '100%', opacity: selectedDeckId ? 1 : 0.45 }}>
          <Icon name="plus" size={14} /> Thêm từ mới
        </button>
      </div>
    </div>
  );
}

/* ── NOTE EDITOR MODAL ────────────────────────────── */
function NoteEditorModal({ deckId, initialFront, initialBack, onClose }: {
  deckId: number; initialFront?: string; initialBack?: string; onClose: () => void;
}) {
  const { mutateAsync: createNote, isPending } = useCreateNote();
  const [template, setTemplate] = useState<TemplateType>('basic');
  const [front, setFront] = useState(initialFront ?? '');
  const [back, setBack]   = useState(initialBack  ?? '');
  const [example, setExample] = useState('');
  const [tags, setTags]   = useState('');
  const [error, setError] = useState<string | null>(null);
  const frontRef = useRef<HTMLTextAreaElement>(null);

  const clozeCount = front.match(/\{\{c\d+::/g)?.length ?? 0;

  const handleClozeWrap = () => {
    const ta = frontRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e } = ta;
    if (s === e) return;
    const existing = (front.match(/\{\{c(\d+)::/g) ?? []).map(m => parseInt(m.replace('{{c', '')));
    const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
    setFront(front.slice(0, s) + `{{c${next}::${front.slice(s, e)}}}` + front.slice(e));
  };

  const handleSubmit = async () => {
    if (!front.trim()) { setError('Vui lòng điền mặt trước thẻ.'); return; }
    if (template !== 'cloze' && !back.trim()) { setError('Vui lòng điền mặt sau thẻ.'); return; }
    if (template === 'cloze' && clozeCount === 0) { setError('Thêm ít nhất một cloze {{c1::đáp án}}.'); return; }
    setError(null);
    try {
      await createNote({ deckId, templateType: template, front, back: back || undefined, example: example || undefined, tags: tags || undefined });
      onClose();
    } catch (e) { setError(String(e)); }
  };

  const TEMPLATES = [
    { value: 'basic' as const,         label: 'Cơ bản',       desc: '1 thẻ: Trước → Sau' },
    { value: 'basic_reverse' as const,  label: 'Cơ bản + Đảo', desc: '2 thẻ: cả hai chiều' },
    { value: 'cloze' as const,          label: 'Cloze',        desc: 'Điền vào chỗ trống'  },
  ];

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'grid', placeItems: 'center', padding: 24, background: 'rgba(8,12,4,0.42)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', animation: 'screen-in 300ms var(--ease) both' }}>
      <div className="glass" style={{ width: 'min(560px,96vw)', borderRadius: 'var(--r-xl)', overflow: 'hidden', boxShadow: 'var(--sh-lg)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid var(--glass-edge)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 36, height: 36, borderRadius: 'var(--r-sm)', background: 'var(--accent)', color: 'var(--accent-ink)', display: 'grid', placeItems: 'center', boxShadow: 'var(--sh-glow)' }}>
              <Icon name="plus" size={18} />
            </span>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em' }}>Thêm từ mới</div>
          </div>
          <button onClick={onClose} className="iconbtn" style={{ background: 'rgba(40,55,30,0.08)', color: 'var(--ink)', border: '1px solid var(--glass-edge)' }}>
            <Icon name="close" size={17} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Template selector */}
          <div>
            <div className="label-cap" style={{ marginBottom: 8 }}>Loại thẻ</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {TEMPLATES.map(t => (
                <button key={t.value} onClick={() => setTemplate(t.value)}
                  style={{ flex: 1, padding: '9px 6px', borderRadius: 'var(--r-sm)', border: `1.5px solid ${template === t.value ? 'var(--accent-strong)' : 'var(--glass-edge)'}`, background: template === t.value ? 'rgba(217,232,157,0.35)' : 'rgba(255,255,255,0.6)', color: 'var(--ink)', cursor: 'pointer', textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 800 }}>{t.label}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--ink-3)', marginTop: 2 }}>{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Front */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label className="label-cap">{template === 'cloze' ? 'Văn bản cloze' : 'Mặt trước'}</label>
              {template === 'cloze' && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {clozeCount > 0 && <span style={{ fontSize: 11, color: 'var(--accent-deep)', fontWeight: 700 }}>{clozeCount} cloze → {clozeCount} thẻ</span>}
                  <button onClick={handleClozeWrap} className="btn btn-soft btn-sm" style={{ padding: '4px 10px' }}>Bọc Cloze</button>
                </div>
              )}
            </div>
            <textarea ref={frontRef} value={front} onChange={e => setFront(e.target.value)} rows={3}
              placeholder={template === 'cloze' ? 'Hà Nội là {{c1::thủ đô}} của Việt Nam…' : 'Từ hoặc câu hỏi…'}
              style={{ width: '100%', background: 'rgba(255,255,255,0.7)', border: '1px solid var(--glass-edge)', borderRadius: 'var(--r-md)', padding: '10px 14px', fontSize: 14, color: 'var(--ink)', outline: 'none', resize: 'vertical', fontFamily: template === 'cloze' ? 'var(--font-mono)' : 'var(--font)', lineHeight: 1.6 }}
            />
          </div>

          {/* Back (not for cloze) */}
          {template !== 'cloze' && (
            <div>
              <label className="label-cap" style={{ display: 'block', marginBottom: 6 }}>Mặt sau</label>
              <textarea value={back} onChange={e => setBack(e.target.value)} rows={2}
                placeholder="Nghĩa hoặc đáp án…"
                style={{ width: '100%', background: 'rgba(255,255,255,0.7)', border: '1px solid var(--glass-edge)', borderRadius: 'var(--r-md)', padding: '10px 14px', fontSize: 14, color: 'var(--ink)', outline: 'none', resize: 'vertical', fontFamily: 'var(--font)', lineHeight: 1.6 }}
              />
            </div>
          )}

          {/* Example + Tags */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="label-cap" style={{ display: 'block', marginBottom: 6 }}>Ví dụ</label>
              <input value={example} onChange={e => setExample(e.target.value)} placeholder="Câu ví dụ…"
                style={{ width: '100%', background: 'rgba(255,255,255,0.7)', border: '1px solid var(--glass-edge)', borderRadius: 'var(--r-md)', padding: '9px 12px', fontSize: 13, color: 'var(--ink)', outline: 'none', fontFamily: 'var(--font)' }}
              />
            </div>
            <div>
              <label className="label-cap" style={{ display: 'block', marginBottom: 6 }}>Nhãn</label>
              <input value={tags} onChange={e => setTags(e.target.value)} placeholder="ielts, toeic…"
                style={{ width: '100%', background: 'rgba(255,255,255,0.7)', border: '1px solid var(--glass-edge)', borderRadius: 'var(--r-md)', padding: '9px 12px', fontSize: 13, color: 'var(--ink)', outline: 'none', fontFamily: 'var(--font)' }}
              />
            </div>
          </div>

          {error && <p style={{ fontSize: 12.5, color: 'var(--bad)', margin: 0, fontWeight: 600 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={handleSubmit} disabled={isPending} className="btn btn-primary" style={{ flex: 1, opacity: isPending ? 0.6 : 1 }}>
              <Icon name="check" size={16} /> {isPending ? 'Đang thêm…' : 'Thêm thẻ'}
            </button>
            <button onClick={onClose} className="btn btn-soft">Huỷ</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── SESSION SUMMARY ──────────────────────────────── */
function SessionSummary({ stats, totalCards, onBack }: {
  stats: { again: number; hard: number; good: number; easy: number };
  totalCards: number;
  onBack: () => void;
}) {
  const total = stats.again + stats.hard + stats.good + stats.easy;
  const goodPct = total > 0 ? Math.round(((stats.good + stats.easy) / total) * 100) : 0;
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28 }}>
      <div className="glass rise" style={{ width: '100%', maxWidth: 480, padding: 32, textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: 'var(--r-lg)', background: 'rgba(217,232,157,0.45)', color: 'var(--accent-ink)', display: 'grid', placeItems: 'center', margin: '0 auto 20px' }}>
          <Icon name="checkCircle" size={34} />
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em', marginBottom: 6 }}>Buổi ôn hoàn thành!</div>
        <div style={{ fontSize: 14, color: 'var(--ink-2)', marginBottom: 24 }}>
          Bạn đã ôn <b style={{ color: 'var(--ink)' }}>{totalCards} thẻ</b> — {goodPct}% trả lời đúng.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 24 }}>
          {[
            { label: 'Ôn lại', v: stats.again, color: 'var(--bad)'    },
            { label: 'Khó',    v: stats.hard,  color: 'var(--warn)'   },
            { label: 'Được',   v: stats.good,  color: 'var(--good)'   },
            { label: 'Dễ',     v: stats.easy,  color: 'var(--accent-deep)' },
          ].map(s => (
            <div key={s.label} style={{ padding: '12px 4px', borderRadius: 'var(--r-md)', background: 'rgba(255,255,255,0.6)', border: '1px solid var(--glass-edge)', textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.color, fontFamily: 'var(--font-mono)' }}>{s.v}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 700 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <button onClick={onBack} className="btn btn-primary" style={{ width: '100%' }}>
          <Icon name="cards" size={17} /> Quay về bộ thẻ
        </button>
      </div>
    </div>
  );
}

/* ── MAIN PAGE ────────────────────────────────────── */
type PageView = 'idle' | 'reviewing' | 'summary' | 'adding-note';

export default function VocabPage() {
  const dispatch = useDispatch();
  const qc = useQueryClient();
  const pendingWord = useSelector((s: RootState) => s.app.pendingVocabWord);

  const [selectedDeckId, setSelectedDeckId] = useState<number | null>(null);
  const [view, setView] = useState<PageView>('idle');
  const [reviewQueue, setReviewQueue] = useState<Card[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [stats, setStats] = useState({ again: 0, hard: 0, good: 0, easy: 0 });
  const [sessionRatings, setSessionRatings] = useState<Map<number, CardRating>>(new Map());
  const totalInSession = reviewQueue.length;

  const { data: decks = [] } = useDecks();
  const { data: dueData } = useDueCards(selectedDeckId, true);
  const { mutateAsync: submitRating } = useSubmitRating();
  const { mutateAsync: buryCard }     = useBuryCard();
  const { mutateAsync: suspendCard }  = useSuspendCard();

  // Auto-select first deck
  useEffect(() => {
    if (decks.length > 0 && selectedDeckId === null) setSelectedDeckId(decks[0].id);
  }, [decks, selectedDeckId]);

  // Open add-note if clipboard pending
  useEffect(() => {
    if (pendingWord && selectedDeckId !== null) setView('adding-note');
  }, [pendingWord, selectedDeckId]);

  const selectedDeck = decks.find(d => d.id === selectedDeckId) ?? null;
  const dueCards = dueData?.cards ?? [];
  const remaining = reviewQueue.length - queueIndex;
  const progress = totalInSession > 0 ? ((totalInSession - remaining) / totalInSession) * 100 : 0;
  const current = reviewQueue[queueIndex];

  const handleStartReview = () => {
    if (dueCards.length === 0) return;
    setReviewQueue([...dueCards]);
    setQueueIndex(0);
    setFlipped(false);
    setStats({ again: 0, hard: 0, good: 0, easy: 0 });
    setSessionRatings(new Map());
    setView('reviewing');
  };

  const handleRate = useCallback(async (rating: CardRating) => {
    if (!current) return;
    await submitRating({ cardId: current.id, rating });
    setStats(s => ({ ...s, [rating]: s[rating] + 1 }));
    // Track last rating per note for per-word display
    if (current.note_id) {
      setSessionRatings(m => new Map(m).set(current.note_id, rating));
    }
    if (rating === 'again') setReviewQueue(q => [...q, current]);
    const nextIdx = queueIndex + 1;
    if (nextIdx >= reviewQueue.length) {
      setView('summary');
    } else {
      setQueueIndex(nextIdx);
      setFlipped(false);
    }
  }, [current, queueIndex, reviewQueue, submitRating]);

  const handleBury = async () => {
    if (!current) return;
    await buryCard(current.id);
    const nextIdx = queueIndex + 1;
    if (nextIdx >= reviewQueue.length) setView('summary');
    else { setQueueIndex(nextIdx); setFlipped(false); }
  };
  const handleSuspend = async () => {
    if (!current) return;
    await suspendCard({ cardId: current.id, suspended: true });
    const nextIdx = queueIndex + 1;
    if (nextIdx >= reviewQueue.length) setView('summary');
    else { setQueueIndex(nextIdx); setFlipped(false); }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (view !== 'reviewing') return;
      if (e.key === ' ') { e.preventDefault(); setFlipped(f => !f); }
      if (!flipped) return;
      if (e.key === '1') handleRate('again');
      else if (e.key === '2') handleRate('hard');
      else if (e.key === '3') handleRate('good');
      else if (e.key === '4') handleRate('easy');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [view, flipped, handleRate]);

  const handleBackToIdle = () => {
    setView('idle');
    setReviewQueue([]);
    setQueueIndex(0);
    setSessionRatings(new Map());
    dispatch(setPendingVocabWord(null));
    qc.invalidateQueries({ queryKey: ['anki-decks'] });
    qc.invalidateQueries({ queryKey: ['anki-due'] });
  };

  return (
    <div className="screen">
      <TopBar />

      <div style={{ position: 'absolute', inset: 0, top: 80, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, display: 'flex', gap: 16, padding: '16px 24px 24px', overflow: 'hidden', maxWidth: 1240, margin: '0 auto', width: '100%' }}>

          {/* LEFT: Deck sidebar */}
          <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
            <DeckSidebar
              decks={decks}
              selectedId={selectedDeckId}
              onSelect={id => { setSelectedDeckId(id); if (view === 'reviewing' || view === 'summary') setView('idle'); }}
            />
          </div>

          {/* CENTER: Main content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>

            {/* Deck header + start button (idle) */}
            {(view === 'idle' || !current) && (
              <div className="glass rise" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
                {selectedDeck ? (
                  <>
                    <div>
                      <div className="label-cap" style={{ color: 'var(--accent-deep)' }}>Bộ thẻ đang chọn</div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em', marginTop: 4 }}>{selectedDeck.name}</div>
                      <div style={{ display: 'flex', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                        {selectedDeck.new_count > 0 && (
                          <span className="chip" style={{ fontSize: 12, color: 'var(--info)' }}>
                            <Icon name="sparkle" size={13} /> {selectedDeck.new_count} mới
                          </span>
                        )}
                        {selectedDeck.learning_count > 0 && (
                          <span className="chip" style={{ fontSize: 12, color: 'var(--warn)' }}>
                            <Icon name="refresh" size={13} /> {selectedDeck.learning_count} đang học
                          </span>
                        )}
                        {selectedDeck.review_count > 0 && (
                          <span className="chip" style={{ fontSize: 12, color: 'var(--good)' }}>
                            <Icon name="check" size={13} /> {selectedDeck.review_count} ôn tập
                          </span>
                        )}
                        {dueCards.length === 0 && (
                          <span className="chip chip-accent" style={{ fontSize: 12 }}>
                            <Icon name="checkCircle" size={13} /> Đã học hết hôm nay!
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={handleStartReview}
                      disabled={dueCards.length === 0}
                      className="btn btn-primary"
                      style={{ opacity: dueCards.length === 0 ? 0.45 : 1 }}
                    >
                      <Icon name="play" size={17} fill /> Bắt đầu ôn · {dueCards.length} thẻ
                    </button>
                  </>
                ) : (
                  <div style={{ color: 'var(--ink-2)', fontSize: 14 }}>Chọn một bộ thẻ từ cột bên trái để bắt đầu.</div>
                )}
              </div>
            )}

            {/* REVIEWING state */}
            {view === 'reviewing' && current && (
              <div className="glass rise" style={{ flex: 1, padding: 22, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <Flashcard
                  card={current}
                  flipped={flipped}
                  onFlip={() => setFlipped(f => !f)}
                  onRate={handleRate}
                  onBury={handleBury}
                  onSuspend={handleSuspend}
                  remaining={remaining}
                  progress={progress}
                  totalInSession={totalInSession}
                />
              </div>
            )}

            {/* SUMMARY state */}
            {view === 'summary' && (
              <SessionSummary stats={stats} totalCards={totalInSession} onBack={handleBackToIdle} />
            )}

            {/* IDLE: no deck selected empty state */}
            {view === 'idle' && !selectedDeck && decks.length === 0 && (
              <div className="glass rise" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
                <span style={{ width: 72, height: 72, borderRadius: 'var(--r-lg)', background: 'rgba(217,232,157,0.35)', color: 'var(--accent-ink)', display: 'grid', placeItems: 'center', marginBottom: 18 }}>
                  <Icon name="cards" size={34} />
                </span>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)' }}>Tạo bộ thẻ đầu tiên</div>
                <p style={{ fontSize: 14, color: 'var(--ink-2)', maxWidth: 360, margin: '8px 0 0', lineHeight: 1.6 }}>
                  Nhấn "Bộ thẻ mới" ở cột trái để bắt đầu. Thử "Tiếng Anh" hoặc "IELTS::Vocab".
                </p>
              </div>
            )}
          </div>

          {/* RIGHT: Notes panel */}
          <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
            <NotesPanel
              selectedDeckId={selectedDeckId}
              decks={decks}
              dueCards={dueCards}
              sessionStats={view === 'reviewing' || view === 'summary' ? stats : null}
              sessionRatings={sessionRatings}
              onAddNote={() => setView('adding-note')}
              isReviewing={view === 'reviewing'}
            />
          </div>
        </div>
      </div>

      {/* Note editor modal */}
      {view === 'adding-note' && selectedDeckId !== null && (
        <NoteEditorModal
          deckId={selectedDeckId}
          initialFront={pendingWord?.word}
          initialBack={pendingWord?.meaning}
          onClose={() => { setView(view === 'adding-note' ? 'idle' : view); dispatch(setPendingVocabWord(null)); }}
        />
      )}
    </div>
  );
}
