import { useState } from 'react';
import type { VocabularyEntry, ReviewRating } from '../../types';

interface Props {
  card: VocabularyEntry;
  onRate: (rating: ReviewRating) => void;
  remaining: number;
}

const RATINGS: { value: ReviewRating; label: string; color: string; key: string }[] = [
  { value: 'again', label: 'Again', color: 'bg-red-500 hover:bg-red-600', key: '1' },
  { value: 'hard', label: 'Hard', color: 'bg-orange-500 hover:bg-orange-600', key: '2' },
  { value: 'good', label: 'Good', color: 'bg-green-500 hover:bg-green-600', key: '3' },
  { value: 'easy', label: 'Easy', color: 'bg-blue-500 hover:bg-blue-600', key: '4' },
];

export default function Flashcard({ card, onRate, remaining }: Props) {
  const [flipped, setFlipped] = useState(false);

  const speakWord = () => {
    const utterance = new SpeechSynthesisUtterance(card.word);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-lg mx-auto">
      <p className="text-sm text-gray-500">{remaining} cards remaining</p>

      <div
        className="w-full bg-white border rounded-xl shadow-md p-8 min-h-48 cursor-pointer select-none"
        onClick={() => setFlipped(!flipped)}
      >
        {!flipped ? (
          <div className="flex flex-col items-center gap-3">
            <h2 className="text-4xl font-bold">{card.word}</h2>
            {card.phonetics && <p className="text-gray-500 text-lg">{card.phonetics}</p>}
            <button
              onClick={(e) => { e.stopPropagation(); speakWord(); }}
              className="text-blue-500 hover:text-blue-700 text-sm mt-2"
            >
              🔊 Pronounce
            </button>
            <p className="text-xs text-gray-400 mt-4">Tap to reveal</p>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-2xl font-bold">{card.word}</h2>
            <p className="text-gray-700">{card.meaning}</p>
            {card.example && (
              <p className="text-sm text-gray-500 italic border-l-2 border-gray-300 pl-3">{card.example}</p>
            )}
            {card.personal_notes && (
              <p className="text-xs text-gray-400 bg-yellow-50 p-2 rounded">{card.personal_notes}</p>
            )}
          </div>
        )}
      </div>

      {flipped && (
        <div className="flex gap-3">
          {RATINGS.map((r) => (
            <button
              key={r.value}
              onClick={() => { setFlipped(false); onRate(r.value); }}
              className={`${r.color} text-white px-4 py-2 rounded-lg font-medium text-sm`}
              title={`Keyboard: ${r.key}`}
            >
              {r.label}
              <span className="ml-1 opacity-60 text-xs">[{r.key}]</span>
            </button>
          ))}
        </div>
      )}

      {!flipped && (
        <p className="text-xs text-gray-400">Space to flip • 1=Again 2=Hard 3=Good 4=Easy</p>
      )}
    </div>
  );
}
