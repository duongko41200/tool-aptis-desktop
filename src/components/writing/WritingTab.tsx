import { useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import WritingEditor from './WritingEditor';
import EvaluationReport from './EvaluationReport';
import { useWritingHistory, useEvaluateWriting } from '../../hooks/useWritingHistory';
import type { EvaluationMode, WritingEvaluationResult } from '../../types';

export default function WritingTab() {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<EvaluationMode>('general');
  const [currentResult, setCurrentResult] = useState<WritingEvaluationResult | null>(null);
  const isOnline = useSelector((state: RootState) => state.app.isOnline);
  const { data: submissions } = useWritingHistory();
  const { mutateAsync: evaluate, isPending } = useEvaluateWriting();

  const handleEvaluate = async () => {
    try {
      const result = await evaluate({ content: text, mode });
      setCurrentResult(result);
    } catch (e) {
      alert(String(e));
    }
  };

  return (
    <div className="flex h-full">
      <aside className="w-64 border-r bg-white overflow-y-auto p-3 space-y-2">
        <h3 className="font-semibold text-sm text-gray-600 uppercase tracking-wide">History</h3>
        {submissions?.map((s) => (
          <button
            key={s.id}
            className="w-full text-left p-2 rounded hover:bg-gray-50 border text-xs"
          >
            <div className="font-medium truncate">{s.evaluation_mode.toUpperCase()} — {s.overall_score?.toFixed(1)}</div>
            <div className="text-gray-400">{new Date(s.created_at).toLocaleDateString()}</div>
          </button>
        ))}
        {(!submissions || submissions.length === 0) && (
          <p className="text-xs text-gray-400">No submissions yet</p>
        )}
      </aside>

      <main className="flex-1 p-4 overflow-y-auto space-y-4">
        <h2 className="text-xl font-bold">AI Writing Evaluation</h2>
        <WritingEditor
          value={text}
          mode={mode}
          onValueChange={setText}
          onModeChange={setMode}
          onEvaluate={handleEvaluate}
          isLoading={isPending}
          isOnline={isOnline}
        />
        {currentResult && <EvaluationReport result={currentResult} />}
      </main>
    </div>
  );
}
