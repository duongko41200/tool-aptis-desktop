import { useCallback, useEffect, useState } from 'react';
import Icon from '../common/Icon';
import { useWritingScorer, hasStoredApiKey } from '../../hooks/useWritingScorer';
import FormatCheckResult from './FormatCheckResult';
import ContentAnalysisResult from './ContentAnalysisResult';
import CrossExamResultPanel from './CrossExamResultPanel';
import type { LetterType, ExamSummary } from '../../types/writing-scorer';
import writingData from '../../public/data/exams/writing-part4.json';
import { htmlToText } from '../../utils/html-to-text';
import { saveSettings } from '../../services/tauriCommands';
import { saveEntry } from '../../services/writing-history-store';

interface Props {
  essay: string;
  examId: string;
  examTitle: string;
  examContentHtml: string;
  subQuestionContent: string;
  letterType: LetterType;
  wordCountTarget: number;
}

function buildExamSummaries(): ExamSummary[] {
  return (writingData as any[]).map((exam) => ({
    examId: exam._id,
    examTitle: exam.title,
    context: htmlToText(exam.questions?.[0]?.content ?? '').slice(0, 200),
  }));
}

function LoadingDots({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 0' }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={{
            width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-deep)',
            animation: `bounce 1.1s ease-in-out ${i * 0.18}s infinite`,
            display: 'inline-block',
          }} />
        ))}
      </div>
      <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>{label}</span>
    </div>
  );
}

interface ApiKeySetupProps {
  onSaved: () => void;
}

function ApiKeySetup({ onSaved }: ApiKeySetupProps) {
  const [inputKey, setInputKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const handleSave = async () => {
    const key = inputKey.trim();
    if (!key.startsWith('AIza')) {
      setSaveError('Key Gemini phải bắt đầu bằng "AIza..."');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      localStorage.setItem('gemini_api_key', key);
      try {
        await saveSettings({ gemini_api_key: key } as any);
      } catch {
        // Tauri unavailable — localStorage is enough
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      padding: '16px 18px', borderRadius: 'var(--r-md)',
      background: 'rgba(224,169,59,0.08)', border: '1px solid rgba(224,169,59,0.28)',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon name="bell" size={15} style={{ color: 'var(--warn)', flexShrink: 0 }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Cần Gemini API key để chấm bài</span>
      </div>

      <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5 }}>
        Lấy key miễn phí tại{' '}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, background: 'rgba(40,55,30,0.08)', padding: '1px 5px', borderRadius: 4 }}>
          aistudio.google.com
        </span>
        {' '}→ Get API Key → Create API key.
      </p>

      {/* Input row */}
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type={showKey ? 'text' : 'password'}
            value={inputKey}
            onChange={e => { setInputKey(e.target.value); setSaveError(''); }}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            placeholder="AIzaSy..."
            style={{
              width: '100%', padding: '9px 36px 9px 12px',
              borderRadius: 'var(--r-sm)', border: '1px solid rgba(40,55,30,0.18)',
              background: 'rgba(255,255,255,0.7)', fontSize: 13,
              fontFamily: 'var(--font-mono)', color: 'var(--ink)',
              outline: 'none', boxSizing: 'border-box',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--accent-deep)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(40,55,30,0.18)')}
          />
          <button
            onClick={() => setShowKey(v => !v)}
            style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              color: 'var(--ink-3)', display: 'flex',
            }}
            title={showKey ? 'Ẩn key' : 'Hiện key'}
          >
            <Icon name="eye" size={15} />
          </button>
        </div>
        <button
          className="btn btn-primary btn-sm"
          onClick={handleSave}
          disabled={saving || inputKey.trim().length < 10}
          style={{ flexShrink: 0, gap: 6 }}
        >
          {saving
            ? <span style={{ width: 13, height: 13, borderRadius: '50%', border: '2px solid var(--accent-ink)', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
            : <Icon name="check" size={14} />
          }
          Lưu key
        </button>
      </div>

      {saveError && (
        <span style={{ fontSize: 12, color: 'var(--bad)' }}>{saveError}</span>
      )}
    </div>
  );
}

export default function WritingScorerPanel({
  essay,
  examId,
  examTitle,
  examContentHtml,
  subQuestionContent,
  letterType,
  wordCountTarget,
}: Props) {
  const { status, result, crossExamResults, error, isStale, score, runCrossExamAnalysis, reset, markStale } =
    useWritingScorer() as ReturnType<typeof useWritingScorer> & { markStale: (e: string) => void };

  const [apiKeyReady, setApiKeyReady] = useState(hasStoredApiKey);
  const [historySaved, setHistorySaved] = useState(false);

  const isLoading = status === 'scoring';
  const isCrossLoading = status === 'analyzing_cross';
  const wordCount = essay.trim() ? essay.trim().split(/\s+/).length : 0;

  useEffect(() => {
    if (status === 'done') markStale(essay);
  }, [essay, status, markStale]);

  const handleScore = useCallback(() => {
    setHistorySaved(false);
    score({ essay, examId, examTitle, examContentHtml, subQuestionContent, letterType, wordCountTarget });
  }, [essay, examId, examTitle, examContentHtml, subQuestionContent, letterType, wordCountTarget, score]);

  const handleCrossExam = useCallback(() => {
    runCrossExamAnalysis(buildExamSummaries(), examId);
  }, [examId, runCrossExamAnalysis]);

  const handleReset = useCallback(() => {
    setHistorySaved(false);
    reset();
  }, [reset]);

  const handleSaveHistory = useCallback(async () => {
    if (!result) return;
    await saveEntry({ essay, examId, examTitle, letterType, result });
    setHistorySaved(true);
    setTimeout(() => setHistorySaved(false), 2500);
  }, [result, essay, examId, examTitle, letterType]);

  /* ── Idle ─────────────────────────────────────────────── */
  if (status === 'idle') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 16 }}>
        {!apiKeyReady && <ApiKeySetup onSaved={() => setApiKeyReady(true)} />}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={handleScore}
            disabled={wordCount < 5 || !apiKeyReady}
            style={{ opacity: wordCount < 5 || !apiKeyReady ? 0.5 : 1, gap: 8 }}
          >
            <Icon name="sparkle" size={15} />
            Chấm bài AI
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      borderTop: '1px solid var(--glass-edge)',
      marginTop: 8, paddingTop: 18,
      display: 'flex', flexDirection: 'column', gap: 16,
    }}>

      {/* Section header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="sparkle" size={16} style={{ color: 'var(--accent-deep)' }} />
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink)' }}>Kết quả chấm điểm</span>
          {isStale && (
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 'var(--r-pill)',
              background: 'rgba(224,169,59,0.15)', color: 'var(--warn)',
            }}>
              Bài đã thay đổi
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-soft btn-sm"
            onClick={handleScore}
            disabled={isLoading || isCrossLoading || wordCount < 5}
            style={{ gap: 7 }}
          >
            <Icon name="refresh" size={13} />
            Chấm lại
          </button>
          <button
            className="btn btn-soft btn-sm"
            onClick={handleReset}
            disabled={isLoading || isCrossLoading}
            style={{ gap: 7 }}
          >
            <Icon name="close" size={13} />
            Ẩn
          </button>
        </div>
      </div>

      {/* Loading — scoring */}
      {isLoading && <LoadingDots label="Gemini đang chấm bài..." />}

      {/* Error */}
      {status === 'error' && error && (
        <div style={{
          padding: '14px 16px', borderRadius: 'var(--r-sm)',
          background: 'rgba(217,138,106,0.10)', border: '1px solid rgba(217,138,106,0.25)',
          display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <Icon name="close" size={15} style={{ color: 'var(--bad)', flexShrink: 0, marginTop: 2 }} />
          <span style={{ fontSize: 13, color: 'var(--bad)', lineHeight: 1.5 }}>{error}</span>
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          <div className="glass-2" style={{ padding: 18, borderRadius: 'var(--r-md)' }}>
            <FormatCheckResult result={result.formatCheck} />
          </div>

          <div className="glass-2" style={{ padding: 18, borderRadius: 'var(--r-md)' }}>
            <ContentAnalysisResult
              result={result.contentAnalysis}
              onAnalyzeCrossExam={handleCrossExam}
              isCrossExamLoading={isCrossLoading}
              crossExamDone={crossExamResults !== null}
              showCrossExam={letterType === 'formal'}
            />
          </div>

          {isCrossLoading && <LoadingDots label="Đang so sánh với các đề khác..." />}

          {crossExamResults !== null && !isCrossLoading && (
            <div className="glass-2" style={{ padding: 18, borderRadius: 'var(--r-md)' }}>
              <CrossExamResultPanel results={crossExamResults} />
            </div>
          )}

          {/* Save to history */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 4 }}>
            <button
              className="btn btn-soft btn-sm"
              onClick={handleSaveHistory}
              disabled={historySaved || isLoading || isCrossLoading}
              style={{ gap: 7, transition: 'all 200ms var(--ease)' }}
            >
              {historySaved ? (
                <>
                  <Icon name="checkCircle" size={14} style={{ color: 'var(--good)' }} />
                  <span style={{ color: 'var(--good)' }}>Đã lưu</span>
                </>
              ) : (
                <>
                  <Icon name="bookmark" size={14} />
                  Lưu vào lịch sử
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
