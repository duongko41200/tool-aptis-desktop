import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setPendingVocabWord } from '../../store/appSlice';
import type { RootState } from '../../store';
import { useDecks, useDueCards } from '../../hooks/useAnki';
import DeckList from './DeckList';
import DeckStudyView from './DeckStudyView';
import NoteEditor from './NoteEditor';
import CardReviewer from './CardReviewer';
import SessionSummary from './SessionSummary';
type View = 'study' | 'review' | 'summary' | 'add-note';

export default function VocabularyTab() {
  const dispatch = useDispatch();
  const pendingWord = useSelector((s: RootState) => s.app.pendingVocabWord);

  const [selectedDeckId, setSelectedDeckId] = useState<number | null>(null);
  const [view, setView] = useState<View>('study');
  const [reviewSnapshot, setReviewSnapshot] = useState<ReturnType<typeof useDueCards>['data']>();
  const [sessionStats, setSessionStats] = useState({ again: 0, hard: 0, good: 0, easy: 0 });

  const { data: decks = [] } = useDecks();
  const { data: dueData } = useDueCards(selectedDeckId, true);

  // Select first deck automatically
  useEffect(() => {
    if (decks.length > 0 && selectedDeckId === null) {
      setSelectedDeckId(decks[0].id);
    }
  }, [decks, selectedDeckId]);

  // Handle pending word from clipboard
  useEffect(() => {
    if (pendingWord && selectedDeckId !== null) {
      setView('add-note');
    }
  }, [pendingWord, selectedDeckId]);

  const selectedDeck = decks.find(d => d.id === selectedDeckId) ?? null;

  const handleStartReview = () => {
    setReviewSnapshot(dueData);
    setView('review');
  };

  const handleReviewFinish = (stats: { again: number; hard: number; good: number; easy: number }) => {
    setSessionStats(stats);
    setView('summary');
  };

  const handleBackToStudy = () => {
    setView('study');
    setReviewSnapshot(undefined);
    dispatch(setPendingVocabWord(null));
  };

  // ── Views ──
  if (view === 'review' && reviewSnapshot && reviewSnapshot.cards.length > 0) {
    return <CardReviewer cards={reviewSnapshot.cards} onFinish={handleReviewFinish} />;
  }

  if (view === 'summary') {
    return <SessionSummary stats={sessionStats} onBack={handleBackToStudy} />;
  }

  if (view === 'add-note' && selectedDeck) {
    return (
      <div style={{ padding: 24, overflowY: 'auto', height: '100%', background: '#f8fafc' }}>
        <button onClick={handleBackToStudy} style={{ background: 'none', border: 'none', color: '#7c3aed', fontWeight: 700, fontSize: 13, cursor: 'pointer', marginBottom: 16 }}>← Back</button>
        {pendingWord && (
          <div style={{ marginBottom: 16, padding: '12px 16px', background: '#faf5ff', border: '2px solid #c4b5fd', borderRadius: 14, color: '#5b21b6', fontSize: 13 }}>
            <strong>📋 From Clipboard</strong>
            {pendingWord.sourceContent && <p style={{ margin: '4px 0 0', opacity: 0.7, fontSize: 12 }}>{pendingWord.sourceContent.slice(0, 80)}…</p>}
          </div>
        )}
        <div style={{ background: '#fff', borderRadius: 20, border: '2px solid #e2e8f0', padding: 24, maxWidth: 520 }}>
          <NoteEditor
            deckId={selectedDeck.id}
            initialFront={pendingWord?.word ?? ''}
            initialBack={pendingWord?.meaning ?? ''}
            onClose={handleBackToStudy}
          />
        </div>
      </div>
    );
  }

  // ── No decks onboarding ──
  if (decks.length === 0) {
    return (
      <div style={{ display: 'flex', height: '100%' }}>
        <div style={{ width: 220 }}>
          <DeckList selectedDeckId={null} onSelect={id => { setSelectedDeckId(id); }} />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: '#f8fafc', padding: 32 }}>
          <div style={{ fontSize: 60 }}>📚</div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: 0 }}>Create your first Deck</h2>
          <p style={{ color: '#64748b', textAlign: 'center', maxWidth: 320 }}>
            Decks organize your flashcards. Try "English" or "Japanese::N5".<br />
            Then add Notes → cards are generated automatically.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{ width: 220, flexShrink: 0 }}>
        <DeckList
          selectedDeckId={selectedDeckId}
          onSelect={id => { setSelectedDeckId(id); setView('study'); }}
        />
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {selectedDeck ? (
          <DeckStudyView
            deck={selectedDeck}
            onStartReview={handleStartReview}
          />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
            Select a deck to start studying
          </div>
        )}
      </div>
    </div>
  );
}
