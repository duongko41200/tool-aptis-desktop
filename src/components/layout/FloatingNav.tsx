import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Icon from '../common/Icon';

const NAV_ITEMS = [
  { icon: 'home',       label: 'Trang chủ', path: '/' },
  { icon: 'chat',       label: 'Nói',       path: '/speaking' },
  { icon: 'pencil',     label: 'Viết',      path: '/writing' },
  { icon: 'headphones', label: 'Nghe',      path: '/listening' },
  { icon: 'sparkle',    label: 'AI Chat',   path: '/rag-chat' },
  { icon: 'calendar',   label: 'Lịch học',  path: '/calendar' },
];

export default function FloatingNav({ align = 'left' }: { align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Close on route change
  useEffect(() => { setOpen(false); }, [pathname]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const isCurrent = (path: string) =>
    path === '/' ? pathname === '/' : pathname.startsWith(path);

  return (
    <>
      {/* ── Floating trigger button ── */}
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          bottom: 24,
          ...(align === 'right' ? { right: 24 } : { left: 24 }),
          zIndex: 40,
          width: 50,
          height: 50,
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.22)',
          background: 'rgba(30,42,20,0.72)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          color: 'rgba(255,255,255,0.92)',
          display: 'grid',
          placeItems: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.06) inset',
          transition: 'transform 160ms var(--ease), box-shadow 160ms var(--ease)',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = 'scale(1.08)';
          e.currentTarget.style.boxShadow = '0 6px 28px rgba(0,0,0,0.36), 0 0 0 1px rgba(255,255,255,0.10) inset';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.06) inset';
        }}
        title="Menu điều hướng"
      >
        <Icon name="grid" size={20} />
      </button>

      {/* ── Backdrop ── */}
      <div
        onClick={() => setOpen(false)}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 48,
          background: 'rgba(10,16,8,0.55)',
          backdropFilter: 'blur(3px)',
          WebkitBackdropFilter: 'blur(3px)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 260ms var(--ease)',
        }}
      />

      {/* ── Slide-up drawer ── */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          background: 'rgba(22,32,16,0.92)',
          backdropFilter: 'blur(28px)',
          WebkitBackdropFilter: 'blur(28px)',
          borderTop: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '20px 20px 0 0',
          padding: '0 0 env(safe-area-inset-bottom, 0)',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 320ms cubic-bezier(0.32,0.72,0,1)',
          boxShadow: '0 -8px 48px rgba(0,0,0,0.38)',
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.18)' }} />
        </div>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 24px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              width: 32, height: 32, borderRadius: '36% 64% 60% 40% / 50% 42% 58% 50%',
              background: 'var(--accent)', color: 'var(--accent-ink)',
              display: 'grid', placeItems: 'center',
              transform: 'rotate(-4deg)', flexShrink: 0,
            }}>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 14v-2a7 7 0 0 1 14 0v2" />
                <path d="M5 14a2.2 2.2 0 0 1 4.5 0v3a2.2 2.2 0 0 1-4.5 0z" />
                <path d="M19 14a2.2 2.2 0 0 0-4.5 0v3a2.2 2.2 0 0 0 4.5 0z" />
              </svg>
            </span>
            <span style={{ fontSize: 18, fontWeight: 800, color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.02em' }}>
              EngDaily
            </span>
          </div>
          <button
            onClick={() => setOpen(false)}
            style={{
              width: 34, height: 34, borderRadius: '50%', border: 'none',
              background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)',
              display: 'grid', placeItems: 'center', cursor: 'pointer',
              transition: 'background 160ms var(--ease)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; }}
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Nav items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '12px 16px 24px' }}>
          {NAV_ITEMS.map(({ icon, label, path }) => {
            const active = isCurrent(path);
            return (
              <button
                key={path}
                onClick={() => { navigate(path); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '13px 18px', borderRadius: 'var(--r-md)',
                  border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
                  fontSize: 15, fontWeight: active ? 700 : 500,
                  color: active ? 'var(--accent-ink)' : 'rgba(255,255,255,0.78)',
                  background: active ? 'var(--accent)' : 'transparent',
                  transition: 'all 160ms var(--ease)',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ opacity: active ? 1 : 0.8 }}>
                  <Icon name={icon} size={20} />
                </span>
                {label}
                {active && (
                  <span style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-ink)', opacity: 0.7 }} />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
}
