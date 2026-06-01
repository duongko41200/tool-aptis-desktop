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
          display: 'flex', alignItems: 'center', padding: `8px 12px 8px ${12 + depth * 16}px`,
          cursor: 'pointer', borderBottom: '1px solid #f1f5f9',
          background: selectedDeckId === deck.id ? '#ede9fe' : 'transparent',
          transition: 'background 0.15s',
        }}
      >
        <span style={{ fontSize: 12, marginRight: 6 }}>{depth > 0 ? '↳' : '📂'}</span>
        <span style={{ flex: 1, fontSize: 13, fontWeight: selectedDeckId === deck.id ? 800 : 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {deck.name}
        </span>
        <Badge count={deck.new_count} color="#3b82f6" />
        <Badge count={deck.learning_count} color="#f97316" />
        <Badge count={deck.review_count} color="#22c55e" />
        <button
          onClick={e => { e.stopPropagation(); setConfirmDelete(deck.id); }}
          style={{ marginLeft: 6, background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', fontSize: 14, padding: '0 2px' }}
          title="Delete deck"
        >×</button>
      </div>
      {childDecks(deck.id).map(child => <DeckRow key={child.id} deck={child} depth={depth + 1} />)}
    </>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff', borderRight: '2px solid #0f172a' }}>
      <div style={{ padding: '12px 14px 10px', borderBottom: '2px solid #0f172a', background: '#0f172a' }}>
        <div style={{ fontSize: 10, fontWeight: 900, color: '#7c3aed', letterSpacing: 2 }}>DECKS</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {decksError ? (
          <div style={{ padding: 12, color: '#dc2626', fontSize: 11, background: '#fef2f2' }}>
            ⚠️ DB error: {String(decksError)}<br />
            <span style={{ opacity: 0.7 }}>Try restarting the app to apply migrations.</span>
          </div>
        ) : decks.length === 0 ? (
          <div style={{ padding: 16, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
            No decks yet.<br />Create one below.
          </div>
        ) : rootDecks.map(d => <DeckRow key={d.id} deck={d} depth={0} />)}
      </div>

      {confirmDelete !== null && (
        <div style={{ padding: 12, background: '#fef2f2', borderTop: '1px solid #fecaca' }}>
          <p style={{ fontSize: 12, color: '#dc2626', margin: '0 0 8px' }}>Delete deck and all its notes?</p>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={async () => { await deleteDeck(confirmDelete); setConfirmDelete(null); }}
              style={{ flex: 1, background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, padding: '5px', fontSize: 12, cursor: 'pointer' }}>Delete</button>
            <button onClick={() => setConfirmDelete(null)}
              style={{ flex: 1, background: '#f1f5f9', border: 'none', borderRadius: 6, padding: '5px', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ padding: 10, borderTop: '2px solid #0f172a' }}>
        {showForm ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input value={newDeckName} onChange={e => setNewDeckName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="Deck name…"
              autoFocus
              style={{ border: '2px solid #7c3aed', borderRadius: 8, padding: '5px 8px', fontSize: 13, outline: 'none' }} />
            <select value={parentId ?? ''} onChange={e => setParentId(e.target.value ? Number(e.target.value) : null)}
              style={{ border: '1.5px solid #e2e8f0', borderRadius: 8, padding: '4px 8px', fontSize: 12 }}>
              <option value="">Root deck</option>
              {decks.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
            </select>
            {createError && (
              <div style={{ color: '#dc2626', fontSize: 11, background: '#fef2f2', padding: '4px 8px', borderRadius: 6 }}>{createError}</div>
            )}
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={handleCreate} disabled={creating}
                style={{ flex: 1, background: creating ? '#94a3b8' : '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, padding: '6px', fontSize: 12, fontWeight: 800, cursor: creating ? 'wait' : 'pointer' }}>
                {creating ? '…' : 'Create'}
              </button>
              <button onClick={() => { setShowForm(false); setCreateError(null); }}
                style={{ flex: 1, background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '6px', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowForm(true)}
            style={{ width: '100%', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 10, padding: '9px', fontSize: 12, fontWeight: 900, cursor: 'pointer', letterSpacing: 1 }}>
            + NEW DECK
          </button>
        )}
      </div>
    </div>
  );
}
