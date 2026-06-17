import React, { useMemo } from 'react';

export interface DailyActivity {
  date: string; // YYYY-MM-DD
  count: number;
}

interface ActivityHeatmapProps {
  data: DailyActivity[];
  days?: number; // Usually 182 for 6 months (26 weeks)
  className?: string;
  style?: React.CSSProperties;
  theme?: 'light' | 'dark';
}

function getLevel(count: number): number {
  if (count === 0) return 0;
  if (count <= 4) return 1;
  if (count <= 10) return 2;
  if (count <= 20) return 3;
  return 4;
}

function getLevelColor(level: number, theme: 'light' | 'dark'): string {
  const emptyColor = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(40,55,30,0.06)';
  switch (level) {
    case 0: return emptyColor;
    case 1: return 'rgba(180,210,120,0.6)';
    case 2: return 'rgba(160,200,80,0.8)';
    case 3: return 'rgba(130,180,50,0.9)';
    case 4: return 'var(--accent-deep)';
    default: return emptyColor;
  }
}

export default function ActivityHeatmap({ data, days = 182, className = "glass rise", style, theme = 'light' }: ActivityHeatmapProps) {
  const { weeks, totalCount, streak, months } = useMemo(() => {
    // Build a map for O(1) lookup
    const dataMap = new Map<string, number>();
    let total = 0;
    for (const d of data) {
      dataMap.set(d.date, d.count);
      total += d.count;
    }

    // Calculate dates backwards from today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Adjust to end on Saturday (or today if you want rolling weeks)
    // GitHub ends on the current day's column.
    // Let's just generate `days` nodes ending today.

    const nodes: { dateStr: string; date: Date; count: number; level: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000);
      // Format as YYYY-MM-DD using local time
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const ds = `${year}-${month}-${day}`;

      const count = dataMap.get(ds) || 0;
      nodes.push({
        dateStr: ds,
        date: d,
        count,
        level: getLevel(count)
      });
    }

    // Calculate current streak
    let currentStreak = 0;
    for (let i = nodes.length - 1; i >= 0; i--) {
      if (nodes[i].count > 0) {
        currentStreak++;
      } else {
        // Allow missing today without breaking streak if yesterday had activity
        if (i === nodes.length - 1) continue;
        break;
      }
    }

    // Group into columns (weeks). First column might not have 7 days if we start mid-week
    // GitHub grid has 7 rows: Sun to Sat.
    // Let's map nodes to a 7-row grid. 
    // Start by finding the day of the week of the first node.
    const startDay = nodes[0].date.getDay(); // 0 (Sun) - 6 (Sat)

    const cols: (typeof nodes[0] | null)[][] = [];
    let currentCol: (typeof nodes[0] | null)[] = new Array(7).fill(null);

    // Fill initial empty days
    let r = startDay;
    for (const n of nodes) {
      currentCol[r] = n;
      r++;
      if (r > 6) {
        cols.push(currentCol);
        currentCol = new Array(7).fill(null);
        r = 0;
      }
    }
    if (r > 0) {
      cols.push(currentCol);
    }

    // Identify months for labels
    const monthLabels: { label: string; colIndex: number }[] = [];
    let lastMonth = -1;
    cols.forEach((col, idx) => {
      const firstValidDay = col.find(d => d !== null);
      if (firstValidDay) {
        const m = firstValidDay.date.getMonth();
        if (m !== lastMonth) {
          // Add month label if it's not too close to the previous one
          if (monthLabels.length === 0 || (idx - monthLabels[monthLabels.length - 1].colIndex) > 4) {
            monthLabels.push({
              label: firstValidDay.date.toLocaleDateString('vi-VN', { month: 'short' }),
              colIndex: idx
            });
          }
          lastMonth = m;
        }
      }
    });

    return { weeks: cols, totalCount: total, streak: currentStreak, months: monthLabels };
  }, [data, days]);

  const CELL_SIZE = 12;
  const GAP = 3;

  const textColorMain = theme === 'dark' ? 'rgba(255,255,255,0.9)' : 'var(--ink)';
  const textColorSub1 = theme === 'dark' ? 'rgba(255,255,255,0.7)' : 'var(--ink-2)';
  const textColorSub2 = theme === 'dark' ? 'rgba(255,255,255,0.5)' : 'var(--ink-3)';

  return (
    <div className={className} style={{ padding: 22, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div className="label-cap" style={{ color: textColorSub2 }}>Hoạt động học tập</div>
        <div style={{ fontSize: 13, color: textColorSub1, fontWeight: 600 }}>{Math.round(days / 30)} tháng qua</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: GAP, overflowX: 'auto', paddingBottom: 8 }}>
        {/* Month Labels */}
        <div style={{ position: 'relative', height: 16, marginBottom: 4 }}>
          {months.map((m, i) => (
            <div key={i} style={{
              position: 'absolute',
              left: m.colIndex * (CELL_SIZE + GAP) + 24, // 24px offset for day labels
              fontSize: 11,
              fontWeight: 600,
              color: textColorSub2
            }}>
              {m.label}
            </div>
          ))}
        </div>

        {/* Grid Container */}
        <div style={{ display: 'flex', gap: GAP }}>
          {/* Day Labels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: GAP, paddingRight: 8, marginTop: 0 }}>
            <span style={{ fontSize: 10, color: textColorSub2, height: CELL_SIZE, display: 'flex', alignItems: 'center' }}></span>
            <span style={{ fontSize: 10, color: textColorSub2, height: CELL_SIZE, display: 'flex', alignItems: 'center' }}>T2</span>
            <span style={{ fontSize: 10, color: textColorSub2, height: CELL_SIZE, display: 'flex', alignItems: 'center' }}></span>
            <span style={{ fontSize: 10, color: textColorSub2, height: CELL_SIZE, display: 'flex', alignItems: 'center' }}>T4</span>
            <span style={{ fontSize: 10, color: textColorSub2, height: CELL_SIZE, display: 'flex', alignItems: 'center' }}></span>
            <span style={{ fontSize: 10, color: textColorSub2, height: CELL_SIZE, display: 'flex', alignItems: 'center' }}>T6</span>
            <span style={{ fontSize: 10, color: textColorSub2, height: CELL_SIZE, display: 'flex', alignItems: 'center' }}></span>
          </div>

          {/* Weeks */}
          {weeks.map((col, cIdx) => (
            <div key={cIdx} style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
              {col.map((day, rIdx) => {
                if (!day) return <div key={rIdx} style={{ width: CELL_SIZE, height: CELL_SIZE, borderRadius: 2, background: getLevelColor(0, theme) }} />;

                // Formatter for tooltip
                const tooltipDate = day.date.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' });

                return (
                  <div
                    key={rIdx}
                    title={`${tooltipDate} — ${day.count} hoạt động`}
                    style={{
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      borderRadius: 2,
                      background: getLevelColor(day.level, theme),
                      cursor: 'pointer',
                      transition: 'transform 100ms',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.2)'; e.currentTarget.style.boxShadow = '0 0 8px rgba(0,0,0,0.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: textColorSub2 }}>
          Ít
          <div style={{ display: 'flex', gap: 3 }}>
            {[0, 1, 2, 3, 4].map(l => (
              <div key={l} style={{ width: 10, height: 10, borderRadius: 2, background: getLevelColor(l, theme) }} />
            ))}
          </div>
          Nhiều
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: textColorSub1 }}>
          Tổng: <span style={{ color: textColorMain }}>{totalCount}</span> hoạt động · Streak: <span style={{ color: '#e08a3b' }}>{streak}</span> ngày
        </div>
      </div>
    </div>
  );
}
