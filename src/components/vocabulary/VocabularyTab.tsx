import { useState } from 'react';
import { useDueCards, useVocabularyList } from '../../hooks/useVocabulary';
import AddWordForm from './AddWordForm';
import ReviewSession from './ReviewSession';

export default function VocabularyTab() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [search, setSearch] = useState('');
  const { data: dueData } = useDueCards();
  const { data: allWords } = useVocabularyList();

  const dueCount = dueData?.total_due ?? 0;
  const filteredWords = allWords?.filter((w) =>
    w.word.toLowerCase().includes(search.toLowerCase()) ||
    w.meaning.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  if (reviewing && dueData && dueData.cards.length > 0) {
    return (
      <ReviewSession
        cards={dueData.cards}
        totalDue={dueData.total_due}
        onFinish={() => setReviewing(false)}
      />
    );
  }

  return (
    <div className="flex h-full">
      <aside className="w-72 border-r bg-white flex flex-col">
        <div className="p-3 border-b">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search words..."
            className="w-full border rounded px-3 py-1.5 text-sm"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredWords.map((w) => (
            <div key={w.id} className="px-3 py-2 border-b hover:bg-gray-50 cursor-pointer">
              <div className="font-medium text-sm">{w.word}</div>
              <div className="text-xs text-gray-500 truncate">{w.meaning}</div>
              {w.tags && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {w.tags.split(',').map((t, i) => (
                    <span key={i} className="bg-gray-100 text-gray-600 text-xs px-1.5 rounded">{t.trim()}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {filteredWords.length === 0 && (
            <p className="p-4 text-center text-sm text-gray-400">No words yet</p>
          )}
        </div>
        <div className="p-3 border-t">
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700"
          >
            + Add Word
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col items-center justify-center p-8">
        {showAddForm ? (
          <div className="w-full max-w-md bg-white border rounded-lg p-6">
            <AddWordForm onClose={() => setShowAddForm(false)} />
          </div>
        ) : (
          <div className="text-center space-y-4">
            <div className="text-6xl">📚</div>
            <h2 className="text-2xl font-bold">Vocabulary Review</h2>
            <p className="text-gray-500">{allWords?.length ?? 0} words in library</p>
            {dueCount > 0 ? (
              <button
                onClick={() => setReviewing(true)}
                className="bg-green-600 text-white px-8 py-3 rounded-xl text-lg font-medium hover:bg-green-700 flex items-center gap-2 mx-auto"
              >
                Start Review
                <span className="bg-white text-green-700 rounded-full px-2 py-0.5 text-sm font-bold">{dueCount}</span>
              </button>
            ) : (
              <div className="text-green-600 font-medium">🎉 All caught up! No cards due.</div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
