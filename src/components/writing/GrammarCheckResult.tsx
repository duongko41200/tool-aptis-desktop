import type { GrammarCheck, GrammarError } from '../../types/writing-scorer';
import Icon from '../common/Icon';

interface Props {
  result: GrammarCheck;
  activeErrorId?: string | null;
  onErrorClick?: (id: string | null) => void;
}

const TYPE_META: Record<GrammarError['type'], { label: string; color: string; bg: string }> = {
  grammar:     { label: 'Ngữ pháp',  color: '#c04830', bg: '#fde8e0' },
  spelling:    { label: 'Chính tả',  color: '#b87020', bg: '#fdf0d8' },
  vocabulary:  { label: 'Từ vựng',   color: '#3a60a8', bg: '#e8eef8' },
  punctuation: { label: 'Dấu câu',   color: '#7048a8', bg: '#f0e8f8' },
};

function scoreColor(score: number, max: number) {
  const pct = score / max;
  return pct >= 0.7 ? 'var(--good)' : pct >= 0.5 ? 'var(--warn)' : 'var(--bad)';
}

export default function GrammarCheckResult({ result, activeErrorId, onErrorClick }: Props) {
  const errCount = result.errors.length;
  const color = scoreColor(result.score, 5);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 'var(--r-sm)', flexShrink: 0,
          background: `${color}22`, display: 'grid', placeItems: 'center',
        }}>
          <span style={{ fontSize: 20, fontWeight: 800, color }}>{result.score}</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>Ngữ pháp & Chính tả</span>
            <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>/5</span>
            {errCount === 0 ? (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--r-pill)', background: '#dff2d8', color: 'var(--good)' }}>
                Không có lỗi
              </span>
            ) : (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 'var(--r-pill)', background: '#fde8e0', color: '#c04830' }}>
                {errCount} lỗi
              </span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>{result.feedback}</p>
        </div>
      </div>

      {/* Error list */}
      {errCount > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {result.errors.map(err => {
            const meta = TYPE_META[err.type] ?? TYPE_META.grammar;
            const isActive = activeErrorId === err.id;
            return (
              <button
                key={err.id}
                onClick={() => onErrorClick?.(isActive ? null : err.id)}
                style={{
                  width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                  padding: '10px 12px', borderRadius: 'var(--r-sm)',
                  background: isActive ? meta.bg : `${meta.bg}88`,
                  borderLeft: `3px solid ${isActive ? meta.color : `${meta.color}66`}`,
                  transition: 'all 140ms var(--ease)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = meta.bg)}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = `${meta.bg}88`; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 800, padding: '2px 7px',
                    borderRadius: 'var(--r-pill)', background: meta.color, color: '#fff',
                  }}>
                    {meta.label}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                    <Icon name="chevR" size={10} style={{ display: 'inline', verticalAlign: 'middle' }} />
                    {' '}nhấn để xem trong bài
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, color: meta.color, textDecoration: 'line-through', fontFamily: 'var(--font-mono)' }}>
                    {err.originalText}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>→</span>
                  <span style={{ fontSize: 13, color: 'var(--good)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                    {err.correction}
                  </span>
                </div>
                {err.note && (
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.4 }}>
                    {err.note}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
