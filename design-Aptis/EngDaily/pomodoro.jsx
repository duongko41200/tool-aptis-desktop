/* global React, Icon */
// pomodoro.jsx — Pomodoro timer widget.
// Exports PomodoroWidget to window.
//
// Usage:
//   <PomodoroWidget />               — standard (card width ~230+)
//   <PomodoroWidget compact />       — condensed (fits 200px wide right-column)
//
// The component is fully self-contained — owns its own state,
// requires no props, and starts paused at session 1 / focus mode.
const { useState: useStatePomo, useEffect: useEffectPomo, useRef: useRefPomo } = React;

const POMO_DURATIONS = { focus: 25 * 60, short: 5 * 60, long: 15 * 60 };

const POMO_MODES = [
  { k: 'focus', label: 'Tập trung',  color: 'var(--accent-deep)' },
  { k: 'short', label: 'Nghỉ ngắn', color: 'var(--info)'        },
  { k: 'long',  label: 'Nghỉ dài',  color: 'var(--good)'        },
];

function PomodoroWidget({ compact = false }) {
  const [mode, setMode] = useStatePomo('focus');
  const [running, setRunning] = useStatePomo(false);
  const [sessions, setSessions] = useStatePomo(0);
  const [left, setLeft] = useStatePomo(POMO_DURATIONS.focus);
  const modeRef = useRefPomo(mode);
  modeRef.current = mode;

  // Reset timer when mode changes (only when not running)
  useEffectPomo(() => {
    setLeft(POMO_DURATIONS[mode]);
  }, [mode]);

  // Countdown tick
  useEffectPomo(() => {
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

  const total = POMO_DURATIONS[mode];
  const progress = 1 - left / total;

  // Ring geometry
  const R = compact ? 36 : 44;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - progress);
  const size = R * 2 + 12;

  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  const mc = POMO_MODES.find((m) => m.k === mode);

  const reset = () => { setRunning(false); setLeft(POMO_DURATIONS[mode]); };
  const switchMode = (m) => { if (!running) { setMode(m); } };

  const pad = compact ? '13px 13px' : '18px 16px';
  const timerSize = compact ? 26 : 30;
  const modeFs = compact ? 9.5 : 10.5;
  const dotSize = compact ? 8 : 9;

  return (
    <div className="glass-2 rise" style={{ padding: pad, borderRadius: 'var(--r-lg)', animationDelay: '60ms' }}>
      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: compact ? 9 : 11 }}>
        <div className="label-cap" style={{ color: 'var(--accent-deep)' }}>Pomodoro</div>
        {sessions > 0 && (
          <span className="chip chip-accent" style={{ fontSize: 11, padding: '4px 9px' }}>
            <Icon name="check" size={11} /> {sessions}/4 phiên
          </span>
        )}
      </div>

      {/* mode tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: compact ? 11 : 14 }}>
        {POMO_MODES.map((m) => (
          <button key={m.k} onClick={() => switchMode(m.k)}
            style={{
              flex: 1, padding: compact ? '4px 2px' : '5px 3px',
              borderRadius: 'var(--r-sm)', fontSize: compact ? 10 : 11, fontWeight: 700,
              border: 'none', cursor: running && mode !== m.k ? 'default' : 'pointer',
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
      <style>{`
        @keyframes pomo-beat {
          0%, 100% { transform: scale(1); }
          50%       { transform: scale(1.025); }
        }
      `}</style>
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
              fontFamily: 'var(--font-mono)', fontSize: timerSize,
              fontWeight: 700, color: 'var(--ink)', lineHeight: 1, letterSpacing: '-0.04em',
            }}>
              {mm}:{ss}
            </div>
            <div style={{
              fontSize: modeFs, color: 'var(--ink-3)', fontWeight: 800,
              marginTop: 3, letterSpacing: '.05em', textTransform: 'uppercase',
            }}>
              {mc.label}
            </div>
          </div>
        </div>
      </div>

      {/* session dots — 4 circles fill up each completed focus session */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 7, marginBottom: compact ? 11 : 13 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{
            width: dotSize, height: dotSize, borderRadius: '50%',
            background: i < sessions ? 'var(--accent-deep)' : 'rgba(40,55,30,.14)',
            transition: 'background .35s',
          }} />
        ))}
      </div>

      {/* controls */}
      <div style={{ display: 'flex', gap: 7 }}>
        <button onClick={() => setRunning((r) => !r)}
          className="btn btn-primary btn-sm"
          style={{ flex: 1, gap: 5, fontSize: 12 }}>
          <Icon name={running ? 'pause' : 'play'} size={13} fill />
          {running ? 'Tạm dừng' : 'Bắt đầu'}
        </button>
        <button onClick={reset} className="btn btn-soft btn-sm"
          style={{ padding: '8px 11px' }} title="Đặt lại bộ đếm">
          <Icon name="refresh" size={14} />
        </button>
      </div>

      {/* status line */}
      <div style={{ marginTop: 9, fontSize: 10.5, color: 'var(--ink-3)', textAlign: 'center', lineHeight: 1.45 }}>
        {sessions >= 4
          ? 'Hoàn thành 4 phiên · Hãy nghỉ dài nhé!'
          : sessions > 0
            ? `${sessions}/4 phiên · còn ${4 - sessions} phiên nữa thì nghỉ dài`
            : 'Mỗi phiên 25 phút · nhấn Bắt đầu'}
      </div>
    </div>
  );
}

Object.assign(window, { PomodoroWidget });
