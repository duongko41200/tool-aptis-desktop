import { useState } from 'react';
import type { GrammarError } from '../../types/writing-scorer';

interface Props {
  essay: string;
  errors: GrammarError[];
  activeErrorId?: string | null;
  onErrorClick?: (id: string | null) => void;
}

const TYPE_STYLE: Record<GrammarError['type'], { bg: string; underline: string; label: string }> = {
  grammar:     { bg: '#fde8e0', underline: '#e06040', label: 'Ngữ pháp' },
  spelling:    { bg: '#fdf0d8', underline: '#d4903a', label: 'Chính tả' },
  vocabulary:  { bg: '#e8eef8', underline: '#5a82c4', label: 'Từ vựng' },
  punctuation: { bg: '#f0e8f8', underline: '#9a68c4', label: 'Dấu câu' },
};

interface Segment {
  text: string;
  error?: GrammarError;
}

function buildSegments(essay: string, errors: GrammarError[]): Segment[] {
  // Map each error to its first occurrence position in the essay
  const positions = errors
    .map(e => {
      const idx = essay.indexOf(e.originalText);
      return idx >= 0 ? { start: idx, end: idx + e.originalText.length, error: e } : null;
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .sort((a, b) => a.start - b.start);

  const segments: Segment[] = [];
  let cursor = 0;

  for (const pos of positions) {
    if (pos.start < cursor) continue; // skip overlapping
    if (pos.start > cursor) {
      segments.push({ text: essay.slice(cursor, pos.start) });
    }
    segments.push({ text: essay.slice(pos.start, pos.end), error: pos.error });
    cursor = pos.end;
  }
  if (cursor < essay.length) {
    segments.push({ text: essay.slice(cursor) });
  }
  return segments;
}

export default function GrammarHighlight({ essay, errors, activeErrorId, onErrorClick }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (!errors.length) {
    return (
      <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
        {essay}
      </p>
    );
  }

  const segments = buildSegments(essay, errors);
  const focusedId = hoveredId ?? activeErrorId;

  return (
    <div style={{ position: 'relative' }}>
      <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.85, whiteSpace: 'pre-wrap' }}>
        {segments.map((seg, i) => {
          if (!seg.error) return <span key={i}>{seg.text}</span>;

          const e = seg.error;
          const style = TYPE_STYLE[e.type] ?? TYPE_STYLE.grammar;
          const isActive = focusedId === e.id;

          return (
            <span key={i} style={{ position: 'relative', display: 'inline' }}>
              <span
                onClick={() => onErrorClick?.(isActive ? null : e.id)}
                onMouseEnter={() => setHoveredId(e.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  background: isActive ? style.bg : `${style.bg}88`,
                  borderBottom: `2px ${isActive ? 'solid' : 'dashed'} ${style.underline}`,
                  borderRadius: 2,
                  cursor: 'pointer',
                  transition: 'background 120ms',
                  padding: '0 1px',
                }}
              >
                {seg.text}
              </span>

              {/* Tooltip */}
              {isActive && (
                <span style={{
                  position: 'absolute', bottom: 'calc(100% + 6px)', left: 0,
                  zIndex: 10, minWidth: 200, maxWidth: 280,
                  background: '#1e2a18', color: '#ffffff',
                  borderRadius: 'var(--r-sm)', padding: '8px 10px',
                  fontSize: 12, lineHeight: 1.5,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.28)',
                  pointerEvents: 'none',
                }}>
                  <span style={{
                    display: 'inline-block', marginBottom: 4,
                    fontSize: 10, fontWeight: 700, padding: '1px 6px',
                    borderRadius: 'var(--r-pill)', background: style.underline,
                  }}>
                    {style.label}
                  </span>
                  <br />
                  <span style={{ color: '#fde8e0', fontWeight: 700 }}>✕ </span>
                  <span style={{ textDecoration: 'line-through', color: 'rgba(255,255,255,0.55)' }}>{e.originalText}</span>
                  <br />
                  <span style={{ color: '#a8f0a0', fontWeight: 700 }}>✓ </span>
                  <span style={{ fontWeight: 600 }}>{e.correction}</span>
                  {e.note && (
                    <>
                      <br />
                      <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11 }}>{e.note}</span>
                    </>
                  )}
                </span>
              )}
            </span>
          );
        })}
      </p>

      {/* Legend */}
      {errors.length > 0 && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
          {(Object.entries(TYPE_STYLE) as [GrammarError['type'], typeof TYPE_STYLE[GrammarError['type']]][])
            .filter(([type]) => errors.some(e => e.type === type))
            .map(([type, s]) => (
              <span key={type} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#79836d' }}>
                <span style={{ width: 14, height: 2, background: s.underline, display: 'inline-block', borderRadius: 1 }} />
                {s.label}
              </span>
            ))}
        </div>
      )}
    </div>
  );
}
