import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useProcessWithAI } from '../../hooks/useCapturedContent';
import { setActiveTab, setPendingVocabWord } from '../../store/appSlice';
import type { RootState } from '../../store';
import type { CapturedContent } from '../../types';
import LoadingSpinner from '../shared/LoadingSpinner';

interface Props {
  items: CapturedContent[];
  total: number;
  loading?: boolean;
}

export default function ContentLibrary({ items, total, loading }: Props) {
  const dispatch = useDispatch();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [sentToVocab, setSentToVocab] = useState<Set<number>>(new Set());
  const isOnline = useSelector((state: RootState) => state.app.isOnline);
  const { mutate: processAI, isPending: aiProcessing } = useProcessWithAI();

  const handleSendToVocab = (item: CapturedContent) => {
    // Pre-fill the word as the content (trimmed), meaning empty (user fills in Vocab tab)
    const word = item.content.trim().slice(0, 100);
    dispatch(setPendingVocabWord({
      word,
      meaning: item.ai_summary ?? '',
      sourceContent: item.content,
    }));
    dispatch(setActiveTab('vocabulary'));
    setSentToVocab(prev => new Set(prev).add(item.id));
  };

  if (loading) return <LoadingSpinner label="Searching..." />;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-gray-400">
        <div className="text-5xl mb-3">📋</div>
        <p>No saved items yet.</p>
        <p className="text-sm mt-1">Press Ctrl+K while selecting text to save.</p>
      </div>
    );
  }

  return (
    <div className="divide-y">
      <div className="px-4 py-2 text-xs text-gray-500">{total} items</div>
      {items.map((item) => (
        <div key={item.id} className="p-4 hover:bg-gray-50">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div
                className="text-sm cursor-pointer"
                onClick={() => setExpanded(expanded === item.id ? null : item.id)}
              >
                {expanded === item.id ? item.content : item.content.slice(0, 150) + (item.content.length > 150 ? '...' : '')}
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded">{item.category}</span>
                {item.folder && <span className="text-xs text-gray-500">📁 {item.folder}</span>}
                {(item.tags ?? []).map((t, i) => (
                  <span key={i} className="bg-gray-100 text-gray-600 text-xs px-1.5 rounded">{t}</span>
                ))}
                {item.ai_processed === 1 && <span className="text-xs text-purple-500">✨ AI</span>}
                <span className="text-xs text-gray-400 ml-auto">
                  {new Date(item.created_at).toLocaleDateString()}
                </span>
              </div>
              {item.ai_summary && expanded === item.id && (
                <div className="mt-2 bg-purple-50 text-purple-700 text-xs p-2 rounded">
                  📝 {item.ai_summary}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-1.5 shrink-0">
              {/* Send to Vocab button */}
              <button
                onClick={() => handleSendToVocab(item)}
                title="Add to Vocabulary (Anki)"
                className="text-xs whitespace-nowrap px-2 py-1 rounded font-medium transition-colors"
                style={{
                  background: sentToVocab.has(item.id) ? '#d1fae5' : '#ede9fe',
                  color: sentToVocab.has(item.id) ? '#065f46' : '#5b21b6',
                  border: `1px solid ${sentToVocab.has(item.id) ? '#6ee7b7' : '#c4b5fd'}`,
                }}
              >
                {sentToVocab.has(item.id) ? '✓ Sent' : '📚 → Vocab'}
              </button>

              {/* AI process button */}
              {isOnline && item.ai_processed === 0 && (
                <button
                  onClick={() => processAI(item.id)}
                  disabled={aiProcessing}
                  className="text-xs text-purple-600 hover:text-purple-800 whitespace-nowrap border border-purple-200 px-2 py-1 rounded"
                >
                  {aiProcessing ? '...' : '✨ AI'}
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
