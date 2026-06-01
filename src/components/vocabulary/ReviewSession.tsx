import { useState, useEffect, useCallback } from 'react';
import { startReviewSession, endReviewSession, submitReviewRating } from '../../services/tauriCommands';
import Flashcard from './Flashcard';
import type { VocabularyEntry, ReviewRating } from '../../types';

const MAX_CARDS = 20;

interface Props {
  cards: VocabularyEntry[];
  totalDue: number;
  onFinish: () => void;
}

interface Summary {
  total: number;
  again: number;
  hard: number;
  good: number;
  easy: number;
}

export default function ReviewSession({ cards, totalDue, onFinish }: Props) {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [queue, setQueue] = useState<VocabularyEntry[]>(cards.slice(0, MAX_CARDS));
  const [current, setCurrent] = useState(0);
  const [done, setDone] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    startReviewSession().then((s) => setSessionId(s.id));
  }, []);

  const handleRate = useCallback(async (rating: ReviewRating) => {
    if (!sessionId || current >= queue.length) return;
    const card = queue[current];
    await submitReviewRating({
      reviewSessionId: sessionId,
      vocabularyEntryId: card.id,
      rating,
    });

    if (rating === 'again') {
      setQueue((prev) => [...prev, card]);
    }

    if (current + 1 >= queue.length || (rating !== 'again' && current + 1 >= queue.length)) {
      const sess = await endReviewSession(sessionId);
      setSummary({
        total: sess.cards_reviewed,
        again: sess.cards_again,
        hard: sess.cards_hard,
        good: sess.cards_good,
        easy: sess.cards_easy,
      });
      setDone(true);
    } else {
      setCurrent((prev) => prev + 1);
    }
  }, [sessionId, current, queue]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === ' ') { e.preventDefault(); }
      if (e.key === '1') handleRate('again');
      else if (e.key === '2') handleRate('hard');
      else if (e.key === '3') handleRate('good');
      else if (e.key === '4') handleRate('easy');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleRate]);

  if (done && summary) {
    const moreWaiting = totalDue > MAX_CARDS ? totalDue - MAX_CARDS : 0;
    return (
      <div className="flex flex-col items-center gap-4 p-8">
        <h3 className="text-2xl font-bold">Session Complete!</h3>
        <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-3xl font-bold">{summary.total}</div>
            <div className="text-sm text-gray-500">Total Reviewed</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="text-3xl font-bold text-blue-600">{summary.easy}</div>
            <div className="text-sm text-gray-500">Easy</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="text-3xl font-bold text-green-600">{summary.good}</div>
            <div className="text-sm text-gray-500">Good</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <div className="text-3xl font-bold text-red-500">{summary.again}</div>
            <div className="text-sm text-gray-500">Again</div>
          </div>
        </div>
        {moreWaiting > 0 && (
          <p className="text-sm text-orange-600">{moreWaiting} more cards waiting for next session</p>
        )}
        <button onClick={onFinish} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
          Done
        </button>
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">No cards to review!</p>
        <button onClick={onFinish} className="mt-4 text-blue-600 hover:underline">Back</button>
      </div>
    );
  }

  return (
    <div className="p-8">
      {totalDue > MAX_CARDS && (
        <p className="text-center text-sm text-orange-600 mb-4">
          Showing {MAX_CARDS} of {totalDue} due cards
        </p>
      )}
      <Flashcard
        card={queue[current]}
        remaining={queue.length - current}
        onRate={handleRate}
      />
    </div>
  );
}
