import { useCallback, useEffect, useState } from 'react';
import Icon from '../common/Icon';
import { useWritingScorer, hasStoredApiKey } from '../../hooks/useWritingScorer';
import FormatCheckResult from './FormatCheckResult';
import ContentAnalysisResult from './ContentAnalysisResult';
import GrammarCheckResult from './GrammarCheckResult';
import B2CriteriaResult from './B2CriteriaResult';
import GrammarHighlight from './GrammarHighlight';
import CrossExamResultPanel from './CrossExamResultPanel';
import type { LetterType, ExamSummary } from '../../types/writing-scorer';
import writingData from '../../public/data/exams/writing-part4.json';
import { htmlToText } from '../../utils/html-to-text';
import { saveSettings } from '../../services/tauriCommands';
import { saveEntry } from '../../services/writing-history-store';
import WritingPdfPreviewModal from './WritingPdfPreviewModal';
import type { PdfExportParams } from '../../services/writing-pdf-export';

interface Props {
  essay: string;
  examId: string;
  examTitle: string;
  examContentHtml: string;
  examSummary?: string;
  subQuestionContent: string;
  letterType: LetterType;
  wordCountTarget: number;
}

function buildExamSummaries(): ExamSummary[] {
  return (writingData as any[]).map((exam) => ({
    examId: exam._id,
    examTitle: exam.title,
    context: htmlToText(exam.questions?.[0]?.content ?? '').slice(0, 200),
    summary: exam.summary ?? undefined,
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
  examSummary,
  subQuestionContent,
  letterType,
  wordCountTarget,
}: Props) {
  const { status, result, crossExamResults, error, isStale, score, runCrossExamAnalysis, reset, markStale } =
    useWritingScorer() as ReturnType<typeof useWritingScorer> & { markStale: (e: string) => void };

  const [apiKeyReady, setApiKeyReady] = useState(hasStoredApiKey);
  const [historySaved, setHistorySaved] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'scoring' | 'cross-exam'>('scoring');
  const [activeErrorId, setActiveErrorId] = useState<string | null>(null);

  const isLoading = status === 'scoring';
  const isCrossLoading = status === 'analyzing_cross';
  const wordCount = essay.trim() ? essay.trim().split(/\s+/).length : 0;

  useEffect(() => {
    if (status === 'done') markStale(essay);
  }, [essay, status, markStale]);

  const handleScore = useCallback(() => {
    setHistorySaved(false);
    setActiveTab('scoring');
    setActiveErrorId(null);
    score({ essay, examId, examTitle, examContentHtml, examSummary, subQuestionContent, letterType, wordCountTarget });
  }, [essay, examId, examTitle, examContentHtml, examSummary, subQuestionContent, letterType, wordCountTarget, score]);

  const handleCrossExam = useCallback(() => {
    runCrossExamAnalysis(buildExamSummaries(), examId);
  }, [examId, runCrossExamAnalysis]);

  const handleReset = useCallback(() => {
    setHistorySaved(false);
    reset();
  }, [reset]);

  const handleSaveHistory = useCallback(async () => {
    if (!result) return;
    await saveEntry({ essay, examId, examTitle, letterType, result, crossExamResults });
    setHistorySaved(true);
    setTimeout(() => setHistorySaved(false), 2500);
  }, [result, crossExamResults, essay, examId, examTitle, letterType]);

  const pdfParams: PdfExportParams | null = result
    ? { essay, examId, examTitle, letterType, result, crossExamResults }
    : null;

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
          {/* Tab bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ display: 'inline-flex', gap: 3, padding: 4, background: 'rgba(255,255,255,0.55)', borderRadius: 'var(--r-pill)' }}>
              {([
                ['scoring',    'Chấm điểm',     'sparkle'],
                ['cross-exam', 'Phân tích đa đề','globe'],
              ] as const).map(([tab, label, icon]) => {
                const isActive = activeTab === tab;
                const hasBadge = tab === 'cross-exam' && crossExamResults !== null && !isCrossLoading;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 14px', borderRadius: 'var(--r-pill)',
                      fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer',
                      transition: 'all 160ms var(--ease)',
                      background: isActive ? 'var(--accent)' : 'transparent',
                      color: isActive ? 'var(--accent-ink)' : 'var(--ink-2)',
                      boxShadow: isActive ? 'var(--sh-glow)' : 'none',
                    }}
                  >
                    <Icon name={icon} size={12} />
                    {label}
                    {hasBadge && (
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: isActive ? 'var(--accent-ink)' : 'var(--good)',
                        flexShrink: 0,
                      }} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 6 }}>
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
                    Lưu
                  </>
                )}
              </button>
              <button
                className="btn btn-soft btn-sm"
                onClick={() => setPreviewOpen(true)}
                disabled={isLoading || isCrossLoading}
                style={{ gap: 7 }}
                title="Xem trước & Xuất PDF"
              >
                <Icon name="eye" size={14} />
                Xuất PDF
              </button>
            </div>
          </div>

          {/* ── Tab: Chấm điểm ──────────────────────────── */}
          {activeTab === 'scoring' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Score summary card */}
              {result && (() => {
                const cefrLevel = result.b2Criteria?.cefrLevel;
                const CEFR_COLORS: Record<string, string> = { A2: '#c0392b', B1: '#e67e22', B2: '#27ae60', C1: '#2980b9' };
                const CEFR_LABEL: Record<string, string> = { A2: 'Cơ bản', B1: 'Trung cấp', B2: 'Trên trung cấp', C1: 'Nâng cao' };
                const cefrColor = cefrLevel ? (CEFR_COLORS[cefrLevel] ?? 'var(--accent-deep)') : 'var(--accent-deep)';
                const subScores = [
                  { label: 'Định dạng', score: result.formatCheck?.score ?? 0, max: 5 },
                  { label: 'Nội dung',  score: result.contentAnalysis?.score ?? 0, max: 10 },
                  { label: 'Ngữ pháp', score: result.grammarCheck?.score ?? 0, max: 5 },
                  { label: 'Ngôn ngữ', score: result.b2Criteria?.score ?? 0, max: 10 },
                ];
                const subColor = (s: number, m: number) => {
                  const p = s / m;
                  return p >= 0.7 ? 'var(--good)' : p >= 0.5 ? 'var(--warn)' : 'var(--bad)';
                };
                return (
                  <div style={{
                    padding: '14px 18px', borderRadius: 'var(--r-md)',
                    background: 'rgba(255,255,255,0.7)', border: `1px solid ${cefrColor}44`,
                    display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap',
                    boxShadow: `0 0 0 2px ${cefrColor}12`,
                  }}>
                    {/* CEFR level badge */}
                    {cefrLevel ? (
                      <div style={{
                        width: 64, height: 64, borderRadius: 'var(--r-md)', flexShrink: 0,
                        background: `${cefrColor}18`, border: `2px solid ${cefrColor}55`,
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                      }}>
                        <span style={{ fontSize: 22, fontWeight: 900, color: cefrColor, lineHeight: 1, fontFamily: 'var(--font-mono)' }}>{cefrLevel}</span>
                        <span style={{ fontSize: 9, fontWeight: 700, color: cefrColor, opacity: 0.8, textAlign: 'center', lineHeight: 1.2, maxWidth: 52 }}>
                          {CEFR_LABEL[cefrLevel]}
                        </span>
                      </div>
                    ) : (
                      <div style={{ width: 64, height: 64, borderRadius: 'var(--r-md)', background: '#e8ede0', flexShrink: 0 }} />
                    )}

                    {/* Sub-scores */}
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
                      {subScores.map(({ label, score, max }) => (
                        <div key={label} style={{
                          padding: '6px 12px', borderRadius: 'var(--r-sm)',
                          background: '#f5f9ea', border: '1px solid #e4eada',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                        }}>
                          <span style={{ fontSize: 10, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{label}</span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 800, color: subColor(score, max), lineHeight: 1 }}>
                            {score}<span style={{ fontSize: 10, color: 'var(--ink-3)', fontWeight: 400 }}>/{max}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Grammar highlight essay */}
              {result.grammarCheck?.errors?.length > 0 && (
                <div className="glass-2" style={{ padding: 18, borderRadius: 'var(--r-md)' }}>
                  <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    Bài làm — lỗi được đánh dấu
                  </p>
                  <GrammarHighlight
                    essay={essay}
                    errors={result.grammarCheck.errors}
                    activeErrorId={activeErrorId}
                    onErrorClick={setActiveErrorId}
                  />
                </div>
              )}

              <div className="glass-2" style={{ padding: 18, borderRadius: 'var(--r-md)' }}>
                <FormatCheckResult result={result.formatCheck} />
              </div>

              {result.grammarCheck && (
                <div className="glass-2" style={{ padding: 18, borderRadius: 'var(--r-md)' }}>
                  <GrammarCheckResult
                    result={result.grammarCheck}
                    activeErrorId={activeErrorId}
                    onErrorClick={setActiveErrorId}
                  />
                </div>
              )}

              {result.b2Criteria && (
                <div className="glass-2" style={{ padding: 18, borderRadius: 'var(--r-md)' }}>
                  <B2CriteriaResult result={result.b2Criteria} targetLevel="B2" />
                </div>
              )}

              <div className="glass-2" style={{ padding: 18, borderRadius: 'var(--r-md)' }}>
                <ContentAnalysisResult result={result.contentAnalysis} />
              </div>
            </div>
          )}

          {/* ── Tab: Phân tích đa đề ─────────────────────── */}
          {activeTab === 'cross-exam' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {letterType !== 'formal' ? (
                <div style={{ padding: '16px', borderRadius: 'var(--r-sm)', textAlign: 'center', background: 'rgba(106,166,196,0.08)', border: '1px solid rgba(106,166,196,0.18)' }}>
                  <span style={{ fontSize: 13, color: 'var(--info)' }}>Phân tích đa đề chỉ áp dụng cho thư trang trọng.</span>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      onClick={handleCrossExam}
                      disabled={isCrossLoading}
                      className="btn btn-soft btn-sm"
                      style={{ gap: 8 }}
                    >
                      {isCrossLoading ? (
                        <>
                          <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--ink-3)', borderTopColor: 'var(--accent-deep)', animation: 'spin 0.7s linear infinite', display: 'inline-block', flexShrink: 0 }} />
                          Đang phân tích...
                        </>
                      ) : (
                        <>
                          <Icon name="globe" size={14} />
                          {crossExamResults !== null ? 'Phân tích lại' : 'Phân tích đa đề'}
                        </>
                      )}
                    </button>
                    <span style={{ fontSize: 11, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Icon name="sparkle" size={11} />
                      Tốn thêm 1 lượt Gemini API
                    </span>
                  </div>

                  {isCrossLoading && <LoadingDots label="Đang so sánh với các đề khác..." />}

                  {crossExamResults !== null && !isCrossLoading && (
                    <div className="glass-2" style={{ padding: 18, borderRadius: 'var(--r-md)' }}>
                      <CrossExamResultPanel results={crossExamResults} />
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}

      {previewOpen && pdfParams && (
        <WritingPdfPreviewModal params={pdfParams} onClose={() => setPreviewOpen(false)} />
      )}
    </div>
  );
}
