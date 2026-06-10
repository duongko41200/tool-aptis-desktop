import Icon from '../common/Icon';
import type { ContentAnalysisResult as ContentResult } from '../../types/writing-scorer';

interface Props {
  result: ContentResult;
  onAnalyzeCrossExam: () => void;
  isCrossExamLoading: boolean;
  crossExamDone: boolean;
  showCrossExam: boolean;
}

function CoverageBar({ value }: { value: number }) {
  const color = value >= 70 ? 'var(--good)' : value >= 40 ? 'var(--warn)' : 'var(--bad)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 'var(--r-pill)', background: 'rgba(40,55,30,0.10)' }}>
        <div style={{
          height: '100%', borderRadius: 'var(--r-pill)',
          width: `${Math.min(value, 100)}%`,
          background: color,
          transition: 'width 0.6s var(--ease)',
        }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 36, textAlign: 'right' }}>{value}%</span>
    </div>
  );
}

export default function ContentAnalysisResult({ result, onAnalyzeCrossExam, isCrossExamLoading, crossExamDone, showCrossExam }: Props) {
  const scoreColor = result.score >= 7 ? 'var(--good)' : result.score >= 5 ? 'var(--warn)' : 'var(--bad)';
  const relevant = result.solutions.filter(s => s.relevantToPrompt);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 'var(--r-sm)', flexShrink: 0,
          background: `${scoreColor}22`, display: 'grid', placeItems: 'center',
        }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: scoreColor }}>{result.score}</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>Nội dung & Ý tưởng</span>
            <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>/10</span>
          </div>
          <p style={{ margin: '0 0 6px', fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>{result.feedback}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>Độ phủ đề bài:</span>
            <div style={{ flex: 1 }}><CoverageBar value={result.promptCoverage} /></div>
          </div>
        </div>
      </div>

      {/* Solutions list */}
      {result.solutions.length === 0 ? (
        <div style={{
          padding: '16px', borderRadius: 'var(--r-sm)', textAlign: 'center',
          background: 'rgba(217,138,106,0.08)', border: '1px solid rgba(217,138,106,0.18)',
        }}>
          <span style={{ fontSize: 13, color: 'var(--bad)' }}>Không tìm thấy ý tưởng/giải pháp trong bài viết.</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {relevant.length}/{result.solutions.length} ý tưởng đúng đề
          </span>
          {result.solutions.map((solution) => (
            <div key={solution.id} style={{
              padding: '12px 14px', borderRadius: 'var(--r-sm)',
              background: solution.relevantToPrompt ? 'rgba(111,174,90,0.08)' : 'rgba(217,138,106,0.06)',
              border: `1px solid ${solution.relevantToPrompt ? 'rgba(111,174,90,0.18)' : 'rgba(217,138,106,0.15)'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ color: solution.relevantToPrompt ? 'var(--good)' : 'var(--warn)', marginTop: 2, flexShrink: 0 }}>
                  <Icon name="lightbulb" size={15} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{solution.idea}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--r-pill)',
                      background: solution.relevantToPrompt ? 'rgba(111,174,90,0.2)' : 'rgba(224,169,59,0.2)',
                      color: solution.relevantToPrompt ? 'var(--good)' : 'var(--warn)',
                    }}>
                      {solution.relevantToPrompt ? 'Đúng đề' : 'Lạc đề'}
                    </span>
                  </div>
                  {solution.originalText && (
                    <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--ink-2)', fontStyle: 'italic', lineHeight: 1.4 }}>
                      "{solution.originalText}"
                    </p>
                  )}
                  {solution.relevanceNote && (
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.4 }}>
                      {solution.relevanceNote}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cross-exam analysis button — formal letters only */}
      {showCrossExam && relevant.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button
            onClick={onAnalyzeCrossExam}
            disabled={isCrossExamLoading}
            className="btn btn-soft btn-sm"
            style={{ alignSelf: 'flex-start', gap: 8 }}
          >
            {isCrossExamLoading ? (
              <>
                <span style={{
                  width: 14, height: 14, borderRadius: '50%',
                  border: '2px solid var(--ink-3)', borderTopColor: 'var(--accent-deep)',
                  animation: 'spin 0.7s linear infinite', display: 'inline-block', flexShrink: 0,
                }} />
                Đang phân tích đa đề...
              </>
            ) : (
              <>
                <Icon name="globe" size={14} />
                {crossExamDone ? 'Phân tích lại' : 'Phân tích đa đề'}
              </>
            )}
          </button>
          <span style={{ fontSize: 11, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Icon name="sparkle" size={11} />
            Tốn thêm 1 lượt Gemini API
          </span>
        </div>
      )}
    </div>
  );
}
