import { useNavigate, useLocation } from 'react-router-dom';
import Icon from '../common/Icon';

function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-shadow"
      style={{ display: 'flex', alignItems: 'center', gap: 11, color: 'var(--on-dark)', background: 'none', border: 'none', cursor: 'pointer' }}
    >
      <span style={{
        width: 36, height: 36, borderRadius: '36% 64% 60% 40% / 50% 42% 58% 50%',
        background: 'var(--accent)', color: 'var(--accent-ink)',
        display: 'grid', placeItems: 'center', boxShadow: 'var(--sh-glow)',
        transform: 'rotate(-4deg)', flexShrink: 0,
      }}>
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 14v-2a7 7 0 0 1 14 0v2" />
          <path d="M5 14a2.2 2.2 0 0 1 4.5 0v3a2.2 2.2 0 0 1-4.5 0z" />
          <path d="M19 14a2.2 2.2 0 0 0-4.5 0v3a2.2 2.2 0 0 0 4.5 0z" />
        </svg>
      </span>
      <span style={{ fontSize: 21, fontWeight: 800, letterSpacing: '-0.02em' }}>EngDaily</span>
    </button>
  );
}

const NAV_ITEMS = [
  { icon: 'home',       label: 'Trang chủ', path: '/' },
  { icon: 'chat',       label: 'Nói',       path: '/speaking' },
  { icon: 'pencil',     label: 'Viết',      path: '/writing' },
  { icon: 'headphones', label: 'Nghe',      path: '/listening' },
  { icon: 'sparkle',    label: 'Ai Chat',   path: '/rag-chat' },
  { icon: 'calendar',   label: 'Lịch học',  path: '/calendar' },
];

export default function TopBar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Ẩn hoàn toàn trên các trang có header riêng
  if (pathname.startsWith('/rag-chat')) return null;

  const isCurrent = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  return (
    <header style={{
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '22px 28px',
    }}>
      <Logo onClick={() => navigate('/')} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <nav
          className="darkglass"
          style={{ display: 'flex', gap: 4, padding: 6, borderRadius: 'var(--r-pill)' }}
        >
          {NAV_ITEMS.map(({ icon, label, path }) => {
            const active = isCurrent(path);
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7, padding: '9px 15px',
                  borderRadius: 'var(--r-pill)', fontSize: 14, fontWeight: 700, border: 'none',
                  color: active ? 'var(--accent-ink)' : 'rgba(255,255,255,0.8)',
                  background: active ? 'var(--accent)' : 'transparent',
                  transition: 'all 160ms var(--ease)', cursor: 'pointer',
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
              >
                <Icon name={icon} size={17} />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        <button className="iconbtn" title="Thành tích" onClick={() => navigate('/dashboard')}>
          <Icon name="trophy" size={19} />
        </button>
        <button
          className="btn btn-primary btn-sm"
          style={{ padding: '11px 20px' }}
          onClick={() => navigate('/dashboard')}
        >
          Bắt đầu học
        </button>
      </div>
    </header>
  );
}
