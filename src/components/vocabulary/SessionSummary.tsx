interface Props {
  stats: { again: number; hard: number; good: number; easy: number };
  onBack: () => void;
}

export default function SessionSummary({ stats, onBack }: Props) {
  const total = stats.again + stats.hard + stats.good + stats.easy;
  const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;

  return (
    <div style={{ height: '100%', background: '#0f172a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 24 }}>
      <div style={{ fontSize: 72 }}>🎯</div>
      <div style={{ textAlign: 'center' }}>
        <h2 style={{ color: '#f8fafc', fontSize: 28, fontWeight: 900, margin: 0 }}>Session Complete!</h2>
        <p style={{ color: '#94a3b8', marginTop: 6 }}>{total} cards reviewed</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%', maxWidth: 360 }}>
        {[
          { label: 'Again', count: stats.again, color: '#ef4444', bg: '#1c0a0a' },
          { label: 'Hard', count: stats.hard, color: '#f97316', bg: '#1c1108' },
          { label: 'Good', count: stats.good, color: '#22c55e', bg: '#081c0e' },
          { label: 'Easy', count: stats.easy, color: '#3b82f6', bg: '#08101c' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, border: `2px solid ${s.color}33`, borderRadius: 14, padding: '14px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 900, color: s.color }}>{s.count}</div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#475569', letterSpacing: 1 }}>{s.label} ({pct(s.count)}%)</div>
          </div>
        ))}
      </div>

      <button onClick={onBack}
        style={{ background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 14, padding: '13px 36px', fontSize: 15, fontWeight: 900, cursor: 'pointer' }}>
        ← Back to Deck
      </button>
    </div>
  );
}
