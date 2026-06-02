import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/layout/TopBar';
import Icon from '../components/common/Icon';

function useCountdown(initial = 8285) {
  const [s, setS] = useState(initial);
  useEffect(() => {
    const t = setInterval(() => setS((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);
  const h = String(Math.floor(s / 3600)).padStart(2, '0');
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${h}:${m}:${sec}`;
}

type PanelKey = 'profile' | 'settings' | 'search' | null;

function ProfilePopover({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  return (
    <div>
      <div style={{ padding: '20px 20px 16px', background: 'linear-gradient(135deg,rgba(217,232,157,0.55),rgba(217,232,157,0.18))', borderBottom: '1px solid var(--glass-edge)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
          <span style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--accent)', color: 'var(--accent-ink)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 22, boxShadow: 'var(--sh-glow)' }}>M</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink)' }}>Minh Nguyễn</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>minh@engdaily.vn</div>
          </div>
          <span className="chip chip-accent" style={{ fontSize: 11 }}>
            <Icon name="trophy" size={13} /> Bạc
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          {([['flame', '9', 'Streak'], ['cards', '142', 'Từ'], ['target', '67%', 'Mục tiêu']] as const).map(([_ic, v, l]) => (
            <div key={l} style={{ flex: 1, textAlign: 'center', padding: '9px 4px', borderRadius: 'var(--r-sm)', background: 'rgba(255,255,255,0.55)', border: '1px solid var(--glass-edge)' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>{v}</div>
              <div style={{ fontSize: 10.5, color: 'var(--ink-3)', fontWeight: 700 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: 8 }}>
        {([
          ['user', 'Xem hồ sơ', () => navigate('/dashboard')],
          ['chart', 'Thống kê học tập', () => navigate('/dashboard')],
          ['bookmark', 'Kho từ đã lưu', () => navigate('/vocab')],
          ['settings', 'Cài đặt tài khoản', null],
        ] as [string, string, (() => void) | null][]).map(([ic, label, fn], i) => (
          <button key={i} onClick={() => { fn?.(); onClose(); }}
            style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 'var(--r-sm)', fontSize: 14, fontWeight: 600, color: 'var(--ink)', transition: 'background 140ms', background: 'transparent' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(40,55,30,0.06)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
            <Icon name={ic} size={17} style={{ color: 'var(--accent-deep)' }} />
            <span style={{ flex: 1 }}>{label}</span>
            <Icon name="chevR" size={15} style={{ color: 'var(--ink-3)' }} />
          </button>
        ))}
        <hr className="divider" style={{ margin: '6px 8px' }} />
        <button onClick={onClose}
          style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 'var(--r-sm)', fontSize: 14, fontWeight: 600, color: 'var(--bad)', transition: 'background 140ms', background: 'transparent' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(217,138,106,0.12)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
          <Icon name="arrowR" size={17} /> <span>Đăng xuất</span>
        </button>
      </div>
    </div>
  );
}

function SettingsPopover({ onClose }: { onClose: () => void }) {
  const [sound, setSound] = useState(true);
  const [notif, setNotif] = useState(true);

  const Switch = ({ on, set }: { on: boolean; set: React.Dispatch<React.SetStateAction<boolean>> }) => (
    <button onClick={() => set(v => !v)}
      style={{ width: 42, height: 24, borderRadius: 999, background: on ? 'var(--accent-deep)' : 'rgba(40,55,30,0.18)', position: 'relative', transition: 'background 180ms' }}>
      <span style={{ position: 'absolute', top: 2, left: on ? 20 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: 'var(--sh-sm)', transition: 'left 180ms var(--ease)' }} />
    </button>
  );

  const Row = ({ ic, label, children }: { ic: string; label: string; children: React.ReactNode }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px' }}>
      <Icon name={ic} size={17} style={{ color: 'var(--accent-deep)' }} />
      <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{label}</span>
      {children}
    </div>
  );

  return (
    <div>
      <div style={{ padding: '15px 18px', borderBottom: '1px solid var(--glass-edge)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Icon name="settings" size={18} style={{ color: 'var(--ink)' }} />
        <span style={{ fontSize: 15.5, fontWeight: 800, color: 'var(--ink)' }}>Cài đặt</span>
      </div>
      <div style={{ padding: 6 }}>
        <Row ic="volume" label="Âm thanh nền"><Switch on={sound} set={setSound} /></Row>
        <Row ic="bell" label="Nhắc học hằng ngày"><Switch on={notif} set={setNotif} /></Row>
        <Row ic="globe" label="Ngôn ngữ"><span className="chip" style={{ fontSize: 12 }}>Tiếng Việt</span></Row>
        <hr className="divider" style={{ margin: '4px 12px' }} />
        <button onClick={onClose}
          style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px', borderRadius: 'var(--r-sm)', fontSize: 14, fontWeight: 600, color: 'var(--ink)', transition: 'background 140ms', background: 'transparent' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(40,55,30,0.06)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
          <Icon name="sparkle" size={17} style={{ color: 'var(--accent-deep)' }} />
          <span style={{ flex: 1 }}>Tùy chỉnh giao diện</span>
          <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>Tweaks ↗</span>
        </button>
      </div>
    </div>
  );
}

function SearchPopover({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const recent = ['serene', 'diligent', 'Talking about hobbies', 'My hometown'];

  return (
    <div>
      <div style={{ padding: 14, borderBottom: '1px solid var(--glass-edge)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 13px', borderRadius: 'var(--r-pill)', background: 'rgba(255,255,255,0.65)', border: '1px solid var(--glass-edge)' }}>
          <Icon name="search" size={17} style={{ color: 'var(--ink-3)' }} />
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Tìm từ vựng, bài học…"
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, fontFamily: 'var(--font)', color: 'var(--ink)' }}
          />
        </div>
      </div>
      <div style={{ padding: 8 }}>
        <div className="label-cap" style={{ padding: '6px 10px' }}>Gần đây</div>
        {recent.filter(r => r.toLowerCase().includes(q.toLowerCase())).map((r, i) => (
          <button key={i} onClick={() => { navigate('/vocab'); onClose(); }}
            style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px', borderRadius: 'var(--r-sm)', fontSize: 14, fontWeight: 600, color: 'var(--ink)', transition: 'background 140ms', background: 'transparent' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(40,55,30,0.06)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
            <Icon name="clock" size={15} style={{ color: 'var(--ink-3)' }} />
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function WelcomePage() {
  const navigate = useNavigate();
  const time = useCountdown(8285);
  const [mode, setMode] = useState<'study' | 'pomodoro'>('study');
  const [panel, setPanel] = useState<PanelKey>(null);

  const toggle = (k: Exclude<PanelKey, null>) => setPanel(p => (p === k ? null : k));

  const railButtons = [
    { ic: 'search',      title: 'Tìm kiếm',       onClick: () => toggle('search'),  key: 'search' as const },
    { ic: 'checkCircle', title: 'Đã hoàn thành',   onClick: () => navigate('/dashboard') },
    { ic: 'user',        title: 'Hồ sơ của bạn',   onClick: () => toggle('profile'), key: 'profile' as const },
    { ic: 'chat',        title: 'Trò chuyện với AI', onClick: () => navigate('/speaking') },
    { ic: 'settings',    title: 'Cài đặt',          onClick: () => toggle('settings'), key: 'settings' as const },
  ];

  return (
    <div className="screen">
      <TopBar />

      {/* Hero */}
      <main style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}>
        <div className="rise" style={{ maxWidth: 860 }}>
          <div className="chip chip-dark text-shadow" style={{ margin: '0 auto 22px', fontSize: 12 }}>
            <Icon name="sparkle" size={14} /> Học mỗi ngày · giữ chuỗi của bạn
          </div>
          <h1 className="text-shadow" style={{ color: 'var(--on-dark)', fontSize: 'clamp(26px,3.1vw,40px)', fontWeight: 800, lineHeight: 1.15, letterSpacing: '-0.025em', margin: '0 0 16px', whiteSpace: 'nowrap' }}>
            Bắt đầu bài học hôm nay nhé.
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 30 }}>
            <span className="chip chip-dark" style={{ fontSize: 13, fontWeight: 700 }}>
              <Icon name="clock" size={14} /> 5 phút
            </span>
            <span className="text-shadow" style={{ color: 'var(--on-dark-2)', fontSize: 15 }}>
              Dựa trên những gì bạn đã học hôm qua · Từ vựng · Đọc · Nghe
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn btn-primary btn-lg pulse-soft"
              style={{ padding: '22px 56px', flexDirection: 'column', gap: 4, borderRadius: 'var(--r-xl)' }}
            >
              <span style={{ fontSize: 22, fontWeight: 800 }}>Bắt đầu bài học</span>
              <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.7 }}>Từ vựng • Đọc • Nghe</span>
            </button>
          </div>

          <div style={{ marginTop: 56 }}>
            <div className="label-cap text-shadow" style={{ color: 'var(--on-dark-2)', marginBottom: 14 }}>Thêm lựa chọn luyện tập</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              {([
                ['plus',    'Thêm từ mới',   '/vocab'],
                ['refresh', 'Ôn từ vựng',   '/vocab'],
                ['book',    'Luyện đọc',     '/writing'],
                ['video',   'Xem video',     '/speaking'],
              ] as const).map(([ic, label, path]) => (
                <button key={label} onClick={() => navigate(path)} className="btn btn-ghost btn-sm" style={{ borderRadius: 'var(--r-md)' }}>
                  <Icon name={ic} size={16} /> {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Bottom-left widgets */}
      <div style={{ position: 'absolute', bottom: 22, left: 22, zIndex: 15, width: 268, display: 'flex', flexDirection: 'column', gap: 11 }}>
        <div className="glass-2 rise" style={{ padding: '14px 16px', animationDelay: '60ms' }}>
          <div className="label-cap" style={{ color: 'var(--accent-deep)', marginBottom: 6 }}>Có gì mới?</div>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>Đã thêm chế độ ôn từ vựng & AI luyện nói.</div>
        </div>
        <div className="glass-2 rise" style={{ padding: '14px 16px', animationDelay: '120ms' }}>
          <div className="label-cap" style={{ color: 'var(--ink-3)', marginBottom: 6 }}>Luyện phát âm</div>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>
            Bắt đầu với âm <b style={{ color: 'var(--accent-deep)' }}>/iː/</b> nhé.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 11 }}>
          <div className="glass-2 rise" style={{ flex: 1, padding: '14px 16px', animationDelay: '180ms' }}>
            <div className="label-cap" style={{ marginBottom: 6 }}>Streak</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon name="flame" size={18} fill style={{ color: '#e08a3b' }} />
              <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--ink)' }}>9</span>
              <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>ngày</span>
            </div>
          </div>
          <div className="glass-2 rise" style={{ flex: 1.3, padding: '14px 16px', animationDelay: '240ms' }}>
            <div className="label-cap" style={{ marginBottom: 6 }}>Thử thách</div>
            <div className="chip chip-accent" style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600, padding: '4px 9px' }}>
              <Icon name="clock" size={12} /> {time}
            </div>
          </div>
        </div>

        <div className="glass-2" style={{ display: 'flex', gap: 5, padding: 5, borderRadius: 'var(--r-pill)' }}>
          {([['study', 'pencil', 'Học tập'], ['pomodoro', 'clock', 'Pomodoro']] as const).map(([k, ic, label]) => (
            <button key={k} onClick={() => setMode(k)}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '9px', borderRadius: 'var(--r-pill)', fontSize: 13, fontWeight: 700, color: mode === k ? 'var(--accent-ink)' : 'var(--ink-2)', background: mode === k ? 'var(--accent)' : 'transparent', transition: 'all 160ms var(--ease)' }}>
              <Icon name={ic} size={15} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Right utility rail */}
      <aside style={{ position: 'absolute', right: 22, bottom: 22, zIndex: 30, display: 'flex', flexDirection: 'column', gap: 11 }}>
        {railButtons.map((b, i) => {
          const active = b.key && panel === b.key;
          return (
            <button key={i} className="iconbtn" title={b.title} onClick={b.onClick}
              style={active ? { background: 'var(--accent)', color: 'var(--accent-ink)', boxShadow: 'var(--sh-glow)', border: '1px solid var(--accent-strong)' } : undefined}>
              <Icon name={b.ic} size={18} />
            </button>
          );
        })}
      </aside>

      {/* Rail popovers */}
      {panel && (
        <>
          <div onClick={() => setPanel(null)} style={{ position: 'absolute', inset: 0, zIndex: 28 }} />
          <div className="glass rise" style={{ position: 'absolute', right: 80, bottom: 22, zIndex: 31, width: 312, padding: 0, borderRadius: 'var(--r-lg)', overflow: 'hidden', boxShadow: 'var(--sh-lg)' }}>
            {panel === 'profile'  && <ProfilePopover onClose={() => setPanel(null)} />}
            {panel === 'settings' && <SettingsPopover onClose={() => setPanel(null)} />}
            {panel === 'search'   && <SearchPopover onClose={() => setPanel(null)} />}
          </div>
        </>
      )}
    </div>
  );
}
