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
    <div style={{ display: 'flex', height: '100%' }}>
      {/* History sidebar */}
      <aside className="glass-card-dark" style={{ width: 220, flexShrink: 0, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8, borderRadius: 0, borderTop: 'none', borderBottom: 'none', borderLeft: 'none' }}>
        <h3 className="label-upper" style={{ margin: 0 }}>History</h3>
        {submissions?.map((s) => (
          <button
            key={s.id}
            style={{ width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 10, border: '1px solid var(--border-dark)', background: 'rgba(255,255,255,0.04)', color: 'var(--text-primary)', cursor: 'pointer', transition: 'background 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
          >
            <div style={{ fontWeight: 700, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {s.evaluation_mode.toUpperCase()} — {s.overall_score?.toFixed(1)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{new Date(s.created_at).toLocaleDateString()}</div>
          </button>
        ))}
        {(!submissions || submissions.length === 0) && (
          <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>No submissions yet</p>
        )}
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: 'var(--text-primary)' }}>AI Writing Evaluation</h2>
        <div className="glass-card-dark" style={{ padding: 16 }}>
          <WritingEditor
            value={text}
            mode={mode}
            onValueChange={setText}
            onModeChange={setMode}
            onEvaluate={handleEvaluate}
            isLoading={isPending}
            isOnline={isOnline}
          />
        </div>
        {currentResult && (
          <div className="glass-card" style={{ padding: 16 }}>
            <EvaluationReport result={currentResult} />
          </div>
        )}
      </main>
    </div>
  );
}
