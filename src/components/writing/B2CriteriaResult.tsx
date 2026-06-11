import type { B2CriteriaCheck } from '../../types/writing-scorer';

interface Props {
  result: B2CriteriaCheck;
}

function scoreColor(pct: number) {
  return pct >= 0.7 ? 'var(--good)' : pct >= 0.5 ? 'var(--warn)' : 'var(--bad)';
}

function MiniBar({ score, max }: { score: number; max: number }) {
  const pct = score / max;
  const color = scoreColor(pct);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
      <div style={{ flex: 1, height: 5, borderRadius: 'var(--r-pill)', background: '#e8ede0' }}>
        <div style={{
          height: '100%', borderRadius: 'var(--r-pill)',
          width: `${Math.round(pct * 100)}%`,
          background: color,
          transition: 'width 500ms var(--ease)',
        }} />
      </div>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color, minWidth: 28, textAlign: 'right' }}>
        {score}/{max}
      </span>
    </div>
  );
}

const CRITERIA = [
  { key: 'vocabulary',     label: 'Từ vựng đa dạng', max: 3, desc: 'Phạm vi và độ phong phú của từ vựng' },
  { key: 'cohesion',       label: 'Mạch lạc',         max: 3, desc: 'Dùng từ nối, discourse markers' },
  { key: 'register',       label: 'Văn phong',         max: 2, desc: 'Ngôn ngữ phù hợp formal/informal' },
  { key: 'sentenceVariety',label: 'Đa dạng câu văn',   max: 2, desc: 'Kết hợp câu đơn, ghép, phức' },
] as const;

export default function B2CriteriaResult({ result }: Props) {
  const total = result.score;
  const totalColor = scoreColor(total / 10);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 'var(--r-sm)', flexShrink: 0,
          background: `${totalColor}22`, display: 'grid', placeItems: 'center',
        }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: totalColor }}>{total}</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>Tiêu chí B2</span>
            <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>/10</span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>{result.feedback}</p>
        </div>
      </div>

      {/* Criteria rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {CRITERIA.map(({ key, label, max, desc }) => {
          const criterion = result[key];
          return (
            <div key={key} style={{
              padding: '10px 12px', borderRadius: 'var(--r-sm)',
              background: '#fafcf5', border: '1px solid #e4eada',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{label}</span>
                    <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{desc}</span>
                  </div>
                </div>
                <MiniBar score={criterion.score} max={max} />
              </div>
              {criterion.note && (
                <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.4 }}>
                  {criterion.note}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
