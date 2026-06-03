import { useState, useEffect, useRef } from 'react';
import Icon from '../common/Icon';

type PomodoroMode = 'focus' | 'short' | 'long';

const MODES: Array<{ k: PomodoroMode; label: string; color: string }> = [
  { k: 'focus', label: 'Tập trung',  color: 'var(--accent-deep)' },
  { k: 'short', label: 'Nghỉ ngắn', color: 'var(--info)'        },
  { k: 'long',  label: 'Nghỉ dài',  color: 'var(--good)'        },
];

interface Durations { focus: number; short: number; long: number; }

// +/- stepper for duration setting
function DurationStepper({
  label, value, min, max,
  onChange, disabled,
}: {
  label: string; value: number; min: number; max: number;
  onChange: (v: number) => void; disabled: boolean;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0' }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', flex: 1 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={disabled || value <= min}
          style={{
            width: 24, height: 24, borderRadius: 7, border: '1px solid var(--glass-edge)',
            background: 'rgba(255,255,255,.65)', fontSize: 15, fontWeight: 700,
            color: disabled || value <= min ? 'var(--ink-3)' : 'var(--ink)',
            display: 'grid', placeItems: 'center', cursor: disabled || value <= min ? 'default' : 'pointer',
            transition: 'all 120ms',
          }}>−</button>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700,
          color: 'var(--ink)', minWidth: 30, textAlign: 'center',
        }}>
          {value}<span style={{ fontSize: 10, fontWeight: 500, color: 'var(--ink-3)', marginLeft: 2 }}>ph</span>
        </span>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={disabled || value >= max}
          style={{
            width: 24, height: 24, borderRadius: 7, border: '1px solid var(--glass-edge)',
            background: 'rgba(255,255,255,.65)', fontSize: 15, fontWeight: 700,
            color: disabled || value >= max ? 'var(--ink-3)' : 'var(--ink)',
            display: 'grid', placeItems: 'center', cursor: disabled || value >= max ? 'default' : 'pointer',
            transition: 'all 120ms',
          }}>+</button>
      </div>
    </div>
  );
}

interface PomodoroWidgetProps {
  compact?: boolean;
}

export default function PomodoroWidget({ compact = false }: PomodoroWidgetProps) {
  const [mode, setMode] = useState<PomodoroMode>('focus');
  const [running, setRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  // User-configurable durations (minutes)
  const [mins, setMins] = useState<Durations>({ focus: 25, short: 5, long: 15 });

  const totalSecs = (m: PomodoroMode) => mins[m] * 60;
  const [left, setLeft] = useState(() => totalSecs('focus'));
  const modeRef = useRef(mode);
  modeRef.current = mode;

  // Reset timer when mode changes
  useEffect(() => {
    setLeft(totalSecs(mode));
    setRunning(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // When duration setting changes for current mode while paused, reset the timer
  useEffect(() => {
    if (!running) setLeft(totalSecs(mode));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mins.focus, mins.short, mins.long]);

  // Countdown tick
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setLeft((v) => {
        if (v <= 1) {
          clearInterval(id);
          setRunning(false);
          if (modeRef.current === 'focus') setSessions((s) => Math.min(s + 1, 4));
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const total = totalSecs(mode);
  const progress = 1 - left / total;
  const R = compact ? 36 : 44;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - progress);
  const size = R * 2 + 12;
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  const mc = MODES.find((m) => m.k === mode)!;

  const reset = () => { setRunning(false); setLeft(totalSecs(mode)); };

  const setModeMins = (k: PomodoroMode, v: number) =>
    setMins((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="glass-2 rise" style={{ padding: compact ? '13px 13px' : '17px 16px', borderRadius: 'var(--r-lg)', animationDelay: '60ms' }}>
      <style>{`
        @keyframes pomo-beat {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.025); }
        }
      `}</style>

      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: compact ? 9 : 11 }}>
        <div className="label-cap" style={{ color: 'var(--accent-deep)' }}>Pomodoro</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {sessions > 0 && (
            <span className="chip chip-accent" style={{ fontSize: 11, padding: '4px 9px' }}>
              <Icon name="check" size={11} /> {sessions}/4
            </span>
          )}
          {/* settings toggle — hidden while running */}
          {!running && (
            <button
              onClick={() => setShowSettings((s) => !s)}
              title="Cài thời gian"
              style={{
                width: 26, height: 26, borderRadius: 8,
                border: '1px solid var(--glass-edge)',
                background: showSettings ? 'var(--accent)' : 'rgba(255,255,255,.55)',
                color: showSettings ? 'var(--accent-ink)' : 'var(--ink-3)',
                display: 'grid', placeItems: 'center', cursor: 'pointer',
                transition: 'all 150ms var(--ease)',
              }}>
              <Icon name="settings" size={13} />
            </button>
          )}
        </div>
      </div>

      {/* duration settings panel — expands when gear is clicked */}
      {showSettings && !running && (
        <div style={{
          marginBottom: 12, padding: '10px 12px', borderRadius: 'var(--r-sm)',
          background: 'rgba(255,255,255,.55)', border: '1px solid var(--glass-edge)',
        }}>
          <div className="label-cap" style={{ color: 'var(--ink-3)', marginBottom: 8 }}>Thời gian (phút)</div>
          <DurationStepper label="Tập trung"  value={mins.focus} min={5}  max={60} onChange={(v) => setModeMins('focus', v)} disabled={running} />
          <DurationStepper label="Nghỉ ngắn"  value={mins.short} min={1}  max={15} onChange={(v) => setModeMins('short', v)} disabled={running} />
          <DurationStepper label="Nghỉ dài"   value={mins.long}  min={10} max={30} onChange={(v) => setModeMins('long', v)}  disabled={running} />
        </div>
      )}

      {/* mode tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: compact ? 11 : 14 }}>
        {MODES.map((m) => (
          <button key={m.k} onClick={() => !running && setMode(m.k)}
            style={{
              flex: 1,
              padding: compact ? '4px 2px' : '5px 3px',
              borderRadius: 'var(--r-sm)',
              fontSize: compact ? 10 : 11,
              fontWeight: 700,
              border: 'none',
              cursor: running && mode !== m.k ? 'default' : 'pointer',
              transition: 'all 140ms var(--ease)',
              background: mode === m.k ? 'var(--accent)' : 'rgba(40,55,30,.07)',
              color: mode === m.k ? 'var(--accent-ink)' : 'var(--ink-3)',
              opacity: running && mode !== m.k ? 0.4 : 1,
            }}>
            {m.label}
          </button>
        ))}
      </div>

      {/* ring */}
      <div style={{ display: 'grid', placeItems: 'center', margin: compact ? '0 0 10px' : '0 0 12px' }}>
        <div style={{
          position: 'relative', width: size, height: size,
          display: 'grid', placeItems: 'center',
          animation: running ? 'pomo-beat 2.4s ease-in-out infinite' : 'none',
        }}>
          <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
            <circle cx={size / 2} cy={size / 2} r={R}
              fill="none" stroke="rgba(40,55,30,.12)" strokeWidth="8" />
            <circle cx={size / 2} cy={size / 2} r={R}
              fill="none" stroke={mc.color} strokeWidth="8" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset .7s var(--ease), stroke .4s' }} />
          </svg>
          <div style={{ position: 'absolute', textAlign: 'center', userSelect: 'none' }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: compact ? 26 : 30,
              fontWeight: 700, color: 'var(--ink)', lineHeight: 1, letterSpacing: '-0.04em',
            }}>
              {mm}:{ss}
            </div>
            <div style={{
              fontSize: compact ? 9.5 : 10.5, color: 'var(--ink-3)', fontWeight: 800,
              marginTop: 3, letterSpacing: '.05em', textTransform: 'uppercase',
            }}>
              {mc.label}
            </div>
          </div>
        </div>
      </div>

      {/* session dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 7, marginBottom: compact ? 11 : 13 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{
            width: compact ? 8 : 9, height: compact ? 8 : 9, borderRadius: '50%',
            background: i < sessions ? 'var(--accent-deep)' : 'rgba(40,55,30,.14)',
            transition: 'background .35s',
          }} />
        ))}
      </div>

      {/* controls */}
      <div style={{ display: 'flex', gap: 7 }}>
        <button onClick={() => { setRunning((r) => !r); setShowSettings(false); }}
          className="btn btn-primary btn-sm" style={{ flex: 1, gap: 5, fontSize: 12 }}>
          <Icon name={running ? 'pause' : 'play'} size={13} fill />
          {running ? 'Tạm dừng' : 'Bắt đầu'}
        </button>
        <button onClick={reset} className="btn btn-soft btn-sm"
          style={{ padding: '8px 11px' }} title="Đặt lại bộ đếm">
          <Icon name="refresh" size={14} />
        </button>
      </div>

      <div style={{ marginTop: 9, fontSize: 10.5, color: 'var(--ink-3)', textAlign: 'center', lineHeight: 1.45 }}>
        {sessions >= 4
          ? 'Hoàn thành 4 phiên · Hãy nghỉ dài nhé!'
          : sessions > 0
            ? `${sessions}/4 phiên · còn ${4 - sessions} phiên nữa thì nghỉ dài`
            : `${mins.focus} phút / phiên · nhấn Bắt đầu`}
      </div>
    </div>
  );
}
