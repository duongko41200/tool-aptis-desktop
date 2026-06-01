import { useState } from 'react';
import { useDecks, useCreateDeck, useDeleteDeck } from '../../hooks/useAnki';
import type { Deck } from '../../types/anki';

interface Props {
  selectedDeckId: number | null;
  onSelect: (id: number) => void;
}

function Badge({ count, color }: { count: number; color: string }) {
  if (count === 0) return null;
  return (
    <span style={{ fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 99, background: color, color: '#fff', marginLeft: 3 }}>
      {count}
    </span>
  );
}

export default function DeckList({ selectedDeckId, onSelect }: Props) {
  const { data: decks = [], error: decksError } = useDecks();
  const { mutateAsync: createDeck } = useCreateDeck();
  const { mutateAsync: deleteDeck } = useDeleteDeck();
  const [newDeckName, setNewDeckName] = useState('');
  const [parentId, setParentId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const rootDecks = decks.filter(d => d.parent_deck_id === null);
  const childDecks = (pid: number) => decks.filter(d => d.parent_deck_id === pid);

  const handleCreate = async () => {
    if (!newDeckName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      await createDeck({ name: newDeckName.trim(), parentDeckId: parentId ?? undefined });
      setNewDeckName('');
      setShowForm(false);
      setParentId(null);
    } catch (e) {
      setCreateError(String(e));
    } finally {
      setCreating(false);
    }
  };

  const DeckRow = ({ deck, depth }: { deck: Deck; depth: number }) => (
    <>
      <div
        onClick={() => onSelect(deck.id)}
        style={{
          display: 'flex', alignItems: 'center',
          padding: `8px 12px 8px ${12 + depth * 16}px`,
          cursor: 'pointer',
          borderBottom: '1px solid var(--border-dark)',
          background: selectedDeckId === deck.id ? 'rgba(212,245,106,0.1)' : 'transparent',
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => { if (selectedDeckId !== deck.id) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)'; }}
        onMouseLeave={e => { if (selectedDeckId !== deck.id) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
      >
        <span style={{ fontSize: 12, marginRight: 6, opacity: 0.7 }}>{depth > 0 ? '↳' : '📂'}</span>
        <span style={{
          flex: 1, fontSize: 13,
          fontWeight: selectedDeckId === deck.id ? 800 : 600,
          color: selectedDeckId === deck.id ? 'var(--accent-primary)' : 'var(--text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {deck.name}
        </span>
        <Badge count={deck.new_count} color="#3b82f6" />
        <Badge count={deck.learning_count} color="#f97316" />
        <Badge count={deck.review_count} color="#22c55e" />
        <button
          onClick={e => { e.stopPropagation(); setConfirmDelete(deck.id); }}
          style={{ marginLeft: 6, background: 'none', border: 'none', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', fontSize: 14, padding: '0 2px' }}
          title="Delete deck"
        >×</button>
      </div>
      {childDecks(deck.id).map(child => <DeckRow key={child.id} deck={child} depth={depth + 1} />)}
    </>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'rgba(8,6,14,0.6)', backdropFilter: 'blur(16px)', borderRight: '1px solid var(--border-dark)' }}>
      {/* Header */}
      <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid var(--border-dark)' }}>
        <div className="label-upper" style={{ color: 'var(--accent-primary)' }}>DECKS</div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {decksError ? (
          <div style={{ padding: 12, color: '#f87171', fontSize: 11, background: 'rgba(220,38,38,0.1)', margin: 8, borderRadius: 10 }}>
            ⚠️ DB error: {String(decksError)}<br />
            <span style={{ opacity: 0.7 }}>Try restarting the app.</span>
          </div>
        ) : decks.length === 0 ? (
          <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
            No decks yet.<br />Create one below.
          </div>
        ) : rootDecks.map(d => <DeckRow key={d.id} deck={d} depth={0} />)}
      </div>

      {/* Delete confirm */}
      {confirmDelete !== null && (
        <div style={{ padding: 12, background: 'rgba(220,38,38,0.12)', borderTop: '1px solid rgba(220,38,38,0.3)' }}>
          <p style={{ fontSize: 12, color: '#f87171', margin: '0 0 8px' }}>Delete deck and all its notes?</p>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={async () => { await deleteDeck(confirmDelete); setConfirmDelete(null); }} className="btn-danger" style={{ flex: 1 }}>Delete</button>
            <button onClick={() => setConfirmDelete(null)} className="btn-muted" style={{ flex: 1 }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Create form */}
      <div style={{ padding: 10, borderTop: '1px solid var(--border-dark)' }}>
        {showForm ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input
              value={newDeckName}
              onChange={e => setNewDeckName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="Deck name…"
              autoFocus
              className="lofi-input"
              style={{ fontSize: 13 }}
            />
            <select
              value={parentId ?? ''}
              onChange={e => setParentId(e.target.value ? Number(e.target.value) : null)}
              className="lofi-select"
              style={{ fontSize: 12 }}
            >
              <option value="">Root deck</option>
              {decks.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
            </select>
            {createError && (
              <div style={{ color: '#f87171', fontSize: 11, background: 'rgba(220,38,38,0.1)', padding: '4px 8px', borderRadius: 6 }}>{createError}</div>
            )}
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={handleCreate} disabled={creating} className="btn-primary" style={{ flex: 1, padding: '7px', fontSize: 12 }}>
                {creating ? '…' : 'Create'}
              </button>
              <button onClick={() => { setShowForm(false); setCreateError(null); }} className="btn-muted" style={{ flex: 1 }}>Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowForm(true)} className="btn-primary" style={{ width: '100%', padding: '9px', fontSize: 12, letterSpacing: 1 }}>
            + NEW DECK
          </button>
        )}
      </div>
    </div>
  );
}
