/* global React */
// EngDaily shared UI library — exported to window for cross-file use.
const { useState, useRef, useEffect } = React;

/* ----------------------------------------------------------------
   Icon — lucide-style 1.6px stroke set on a 24 grid
   ---------------------------------------------------------------- */
const ICONS = {
  play: 'M7 5.5v13l11-6.5z',
  plus: 'M12 5v14M5 12h14',
  refresh: 'M3 12a9 9 0 0 1 15-6.7L21 8M21 4v4h-4 M21 12a9 9 0 0 1-15 6.7L3 16M3 20v-4h4',
  book: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z M20 18H6.5A2.5 2.5 0 0 0 4 20.5',
  video: 'M3.5 6.5h13v11h-13z M16.5 10l4-2.5v9l-4-2.5',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M20 20l-3.5-3.5',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  checkCircle: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M8.5 12l2.4 2.4 4.6-4.8',
  trophy: 'M7 4h10v3a5 5 0 0 1-10 0z M7 5H4.5v1.5A3.5 3.5 0 0 0 8 10 M17 5h2.5v1.5A3.5 3.5 0 0 1 16 10 M9.5 13.5h5l-.5 3.5h-4z M8 21h8 M10 17.5v3.5M14 17.5v3.5',
  flame: 'M12 3c1 3-2 4-2 7a2 2 0 0 0 4 0c0-1-.5-1.7-.5-2.5 2 1.2 3.5 3.3 3.5 6a5 5 0 0 1-10 0c0-3.5 3-5 5-10.5z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7.5V12l3 2',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M5 20a7 7 0 0 1 14 0',
  users: 'M9 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M3.5 20a5.5 5.5 0 0 1 11 0 M16 5.5a3 3 0 0 1 0 6 M17.5 14.2A5.5 5.5 0 0 1 20.5 19',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 13a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 0 1-4 0v-.2A1.6 1.6 0 0 0 7 19.3a1.6 1.6 0 0 0-1.8.3l-.1.1A2 2 0 1 1 2.3 17l.1-.1a1.6 1.6 0 0 0-1.1-2.7H1a2 2 0 0 1 0-4h.2A1.6 1.6 0 0 0 2.7 7a1.6 1.6 0 0 0-.3-1.8l-.1-.1A2 2 0 1 1 5 2.3l.1.1A1.6 1.6 0 0 0 7 2.7h.1A1.6 1.6 0 0 0 8.8 1.2V1a2 2 0 0 1 4 0v.2A1.6 1.6 0 0 0 15.5 2.7a1.6 1.6 0 0 0 1.8-.3l.1-.1A2 2 0 1 1 20.7 5l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1.5H22a2 2 0 0 1 0 4h-.2a1.6 1.6 0 0 0-1.4 1z',
  pencil: 'M16.5 4.5l3 3L8 19l-4 1 1-4z M14.5 6.5l3 3',
  mic: 'M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3z M6 11a6 6 0 0 0 12 0 M12 17v3 M9 20h6',
  send: 'M5 12l15-7-7 15-2.5-5.5z',
  chat: 'M5 5h14v10H9l-4 3z',
  close: 'M6 6l12 12M18 6L6 18',
  chevR: 'M9 6l6 6-6 6',
  chevL: 'M15 6l-6 6 6 6',
  chevD: 'M6 9l6 6 6-6',
  arrowR: 'M5 12h14M13 6l6 6-6 6',
  home: 'M4 11l8-7 8 7 M6 9.5V20h12V9.5 M10 20v-5h4v5',
  grid: 'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z',
  chart: 'M5 19V5 M5 19h14 M9 16v-4 M13 16V9 M17 16v-7',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z M19 15l.7 2 .2 .8 .8 .2 2 .7-2 .7-.8 .2-.2 .8-.7 2-.7-2-.2-.8-.8-.2-2-.7 2-.7 .8-.2 .2-.8z',
  volume: 'M5 9v6h4l5 4V5L9 9z M16.5 9a3.5 3.5 0 0 1 0 6 M19 6.5a7 7 0 0 1 0 11',
  music: 'M9 18V6l11-2v12 M9 18a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z M20 16a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z',
  pause: 'M8 5v14M16 5v14',
  skip: 'M5 5l9 7-9 7z M19 5v14',
  bell: 'M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6 M9.5 20a2.5 2.5 0 0 0 5 0',
  cards: 'M8 7h11v11H8z M5 4h11v2 M5 4v11h2',
  list: 'M8 6h12M8 12h12M8 18h12 M4 6h.01M4 12h.01M4 18h.01',
  lightbulb: 'M9 18h6 M10 21h4 M8.5 14a5 5 0 1 1 7 0c-.8.8-1.5 1.5-1.5 2.5h-4c0-1-.7-1.7-1.5-2.5z',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M3 12h18 M12 3c2.5 2.5 2.5 15 0 18 M12 3c-2.5 2.5-2.5 15 0 18',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M12 12h.01',
  star: 'M12 3.5l2.6 5.6 6 .6-4.5 4 1.3 5.9L12 16.9 6.6 19.6l1.3-5.9-4.5-4 6-.6z',
  trash: 'M5 7h14 M9 7V5h6v2 M7 7l1 13h8l1-13 M10 11v6M14 11v6',
  calendar: 'M5 6h14v14H5z M5 10h14 M9 4v3M15 4v3',
  bookmark: 'M7 4h10v16l-5-3.5L7 20z',
  headphones: 'M5 14v-2a7 7 0 0 1 14 0v2 M5 14a2.5 2.5 0 0 1 5 0v3a2.5 2.5 0 0 1-5 0z M19 14a2.5 2.5 0 0 0-5 0v3a2.5 2.5 0 0 0 5 0z',
};

function Icon({ name, size = 20, stroke = 1.7, fill = false, style, className }) {
  const d = ICONS[name] || ICONS.sparkle;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      className={className}
      style={{ flexShrink: 0, ...style }}
      stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} fill={fill ? 'currentColor' : 'none'} stroke={fill ? 'none' : 'currentColor'} />
    </svg>
  );
}

/* ----------------------------------------------------------------
   Small primitives
   ---------------------------------------------------------------- */
function Logo({ size = 'md', onClick }) {
  const dim = size === 'lg' ? 44 : size === 'sm' ? 30 : 36;
  const fs = size === 'lg' ? 28 : size === 'sm' ? 18 : 23;
  return (
    <button onClick={onClick} className="text-shadow"
      style={{ display: 'flex', alignItems: 'center', gap: 11, color: 'var(--on-dark)' }}>
      <span style={{
        width: dim, height: dim, borderRadius: '36% 64% 60% 40% / 50% 42% 58% 50%',
        background: 'var(--accent)', color: 'var(--accent-ink)',
        display: 'grid', placeItems: 'center', boxShadow: 'var(--sh-glow)',
        fontWeight: 800, fontSize: dim * 0.34, transform: 'rotate(-4deg)',
      }}>
        <svg width={dim*0.5} height={dim*0.5} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 14v-2a7 7 0 0 1 14 0v2" />
          <path d="M5 14a2.2 2.2 0 0 1 4.5 0v3a2.2 2.2 0 0 1-4.5 0z" />
          <path d="M19 14a2.2 2.2 0 0 0-4.5 0v3a2.2 2.2 0 0 0 4.5 0z" />
        </svg>
      </span>
      <span style={{ fontSize: fs, fontWeight: 800, letterSpacing: '-0.02em' }}>EngDaily</span>
    </button>
  );
}

function Tip({ children }) {
  return <span style={{ fontSize: 12, color: 'var(--ink-3)', fontStyle: 'italic' }}>{children}</span>;
}

/* A widget tile used in the corner stacks */
function Widget({ cap, children, accent, style }) {
  return (
    <div className="glass-2 rise" style={{ padding: '14px 16px', ...style }}>
      {cap && <div className="label-cap" style={{ color: accent ? 'var(--accent-deep)' : 'var(--ink-3)', marginBottom: 6 }}>{cap}</div>}
      {children}
    </div>
  );
}

/* count-up timer mm:ss:.. style display */
function useCountdown(initial = 8200) {
  const [s, setS] = useState(initial);
  useEffect(() => { const t = setInterval(() => setS(v => (v > 0 ? v - 1 : 0)), 1000); return () => clearInterval(t); }, []);
  const h = String(Math.floor(s / 3600)).padStart(2, '0');
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${h}:${m}:${sec}`;
}

Object.assign(window, { Icon, Logo, Tip, Widget, useCountdown });
