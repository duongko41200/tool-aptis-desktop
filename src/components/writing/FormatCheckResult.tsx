import Icon from '../common/Icon';
import type { FormatCheckResult as FormatResult } from '../../types/writing-scorer';

interface Props {
  result: FormatResult;
}

const COMPONENT_LABELS: Record<string, string> = {
  greeting: 'Lời chào',
  openingLine: 'Câu mở đầu',
  body: 'Nội dung chính',
  suggestions: 'Đề xuất / Ý kiến',
  closing: 'Câu kết',
  signature: 'Chữ ký',
};

function ScoreRing({ score, max }: { score: number; max: number }) {
  const pct = Math.round((score / max) * 100);
  const color = pct >= 70 ? 'var(--good)' : pct >= 50 ? 'var(--warn)' : 'var(--bad)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{
        width: 56, height: 56, borderRadius: '50%',
        background: `conic-gradient(${color} ${pct}%, rgba(40,55,30,0.10) 0%)`,
        display: 'grid', placeItems: 'center', position: 'relative',
      }}>
        <div style={{
          width: 42, height: 42, borderRadius: '50%',
          background: 'var(--glass)', display: 'grid', placeItems: 'center',
        }}>
          <span style={{ fontSize: 16, fontWeight: 800, color }}>{score}</span>
        </div>
      </div>
      <span style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600 }}>/{max}</span>
    </div>
  );
}

export default function FormatCheckResult({ result }: Props) {
  const entries = Object.entries(result.components) as [string, { found: boolean; text?: string; note?: string; paragraphCount?: number; count?: number }][];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <ScoreRing score={result.score} max={5} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>Cấu trúc bài viết</span>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 'var(--r-pill)',
              background: result.passed ? 'rgba(111,174,90,0.15)' : 'rgba(217,138,106,0.15)',
              color: result.passed ? 'var(--good)' : 'var(--bad)',
            }}>
              {result.passed ? 'Đạt' : 'Chưa đạt'}
            </span>
            <span style={{ fontSize: 11, color: 'var(--ink-3)', marginLeft: 'auto' }}>
              {result.wordCount} từ
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>{result.feedback}</p>
        </div>
      </div>

      {/* Component checklist */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {entries.map(([key, comp]) => {
          const label = COMPONENT_LABELS[key] ?? key;
          const extra = comp.count != null ? ` (${comp.count})` : comp.paragraphCount != null ? ` (${comp.paragraphCount} đoạn)` : '';
          return (
            <div key={key} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '10px 14px', borderRadius: 'var(--r-sm)',
              background: comp.found ? 'rgba(111,174,90,0.08)' : 'rgba(217,138,106,0.08)',
              border: `1px solid ${comp.found ? 'rgba(111,174,90,0.18)' : 'rgba(217,138,106,0.18)'}`,
            }}>
              <span style={{ color: comp.found ? 'var(--good)' : 'var(--bad)', marginTop: 1, flexShrink: 0 }}>
                {comp.found
                  ? <Icon name="checkCircle" size={16} />
                  : <Icon name="close" size={16} />
                }
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{label}{extra}</span>
                  {comp.text && (
                    <span style={{
                      fontSize: 12, color: 'var(--ink-2)', fontStyle: 'italic',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220,
                    }}>
                      "{comp.text}"
                    </span>
                  )}
                </div>
                {comp.note && (
                  <p style={{
                    margin: '2px 0 0', fontSize: 12, lineHeight: 1.4,
                    color: comp.found ? 'var(--warn)' : 'var(--bad)',
                  }}>
                    {comp.note}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
