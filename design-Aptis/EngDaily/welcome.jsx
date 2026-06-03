/* global React, Icon, Logo, Tip, Widget, useCountdown */
const { useState: useStateW } = React;

function TopBar({ go, current }) {
  return (
    <header style={{
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '22px 28px'
    }}>
      <Logo onClick={() => go('welcome')} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <nav className="darkglass" style={{ display: 'flex', gap: 4, padding: 6, borderRadius: 'var(--r-pill)' }}>
          {[['home', 'Trang chủ', 'welcome'], ['grid', 'Học tập', 'dashboard'], ['chat', 'Nói', 'speaking'], ['pencil', 'Viết', 'writing'], ['headphones', 'Nghe', 'listening']].map(([ic, label, key]) =>
          <button key={key} onClick={() => go(key)}
          style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '9px 15px',
            borderRadius: 'var(--r-pill)', fontSize: 14, fontWeight: 700,
            color: current === key ? 'var(--accent-ink)' : 'rgba(255,255,255,0.8)',
            background: current === key ? 'var(--accent)' : 'transparent',
            transition: 'all 160ms var(--ease)'
          }}
          onMouseEnter={(e) => {if (current !== key) e.currentTarget.style.background = 'rgba(255,255,255,0.1)';}}
          onMouseLeave={(e) => {if (current !== key) e.currentTarget.style.background = 'transparent';}}>
              <Icon name={ic} size={17} /> <span>{label}</span>
            </button>
          )}
        </nav>
        <button className="iconbtn" title="Thành tích"><Icon name="trophy" size={19} /></button>
        <button className="btn btn-primary btn-sm" style={{ padding: '11px 20px' }}>Đăng nhập</button>
      </div>
    </header>);

}

function WelcomeScreen({ go, t }) {
  const time = useCountdown(8285);
  const [mode, setMode] = useStateW('study');
  const [panel, setPanel] = useStateW(null); // 'profile' | 'settings' | 'search' | null
  const pom = usePomodoro(); // lifted here so the timer keeps running across tab switches
  const toggle = (k) => setPanel((p) => p === k ? null : k);

  const opt = (ic, label, key) =>
  <button onClick={() => go(key)} className="btn btn-ghost btn-sm"
  style={{ borderRadius: 'var(--r-md)' }}>
      <Icon name={ic} size={16} /> {label}
    </button>;


  return (
    <div className="screen">
      <TopBar go={go} current="welcome" />

      {/* hero */}
      <main style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24
      }}>
        <div className="rise" style={{ maxWidth: 860 }}>
          <div className="chip chip-dark text-shadow" style={{ margin: '0 auto 22px', fontSize: 12 }}>
            <Icon name="sparkle" size={14} /> Học mỗi ngày · giữ chuỗi của bạn
          </div>
          <h1 className="text-shadow" style={{
            color: 'var(--on-dark)', fontSize: 'clamp(26px, 3.1vw, 40px)', fontWeight: 800,
            lineHeight: 1.15, letterSpacing: '-0.025em', margin: '0 0 16px', whiteSpace: 'nowrap'
          }}>
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
            <button onClick={() => go('dashboard')} className="btn btn-primary btn-lg pulse-soft"
            style={{ padding: '22px 56px', flexDirection: 'column', gap: 4, borderRadius: 'var(--r-xl)' }}>
              <span style={{ fontSize: 22, fontWeight: 800 }}>Bắt đầu bài học</span>
              <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.7 }}>Từ vựng • Đọc • Nghe</span>
            </button>
          </div>

          <div style={{ marginTop: 56 }}>
            <div className="label-cap text-shadow" style={{ color: 'var(--on-dark-2)', marginBottom: 14 }}>Thêm lựa chọn luyện tập</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              {opt('plus', 'Thêm từ mới', 'vocab')}
              {opt('refresh', 'Ôn từ vựng', 'vocab')}
              {opt('book', 'Luyện đọc', 'writing')}
              {opt('headphones', 'Luyện nghe', 'listening')}
            </div>
          </div>
        </div>
      </main>

      {/* bottom-left widgets — switches between Học tập and Pomodoro (duong) */}
      <div style={{ position: 'absolute', bottom: 22, left: 22, zIndex: 15, width: 268, display: 'flex', flexDirection: 'column', gap: 11 }}>
        {mode === 'study' ?
        <>
            <Widget cap="Có gì mới?" accent style={{ animationDelay: '60ms' }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>Đã thêm chế độ tối & âm thanh mưa.</div>
            </Widget>
            <Widget cap="Luyện phát âm" style={{ animationDelay: '120ms' }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>Bắt đầu với âm <b style={{ color: 'var(--accent-deep)' }}>/iː/</b> nhé.</div>
            </Widget>
            <div style={{ display: 'flex', gap: 11 }}>
              <Widget style={{ flex: 1, animationDelay: '180ms' }}>
                <div className="label-cap" style={{ marginBottom: 6 }}>Streak</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="flame" size={18} fill style={{ color: '#e08a3b' }} />
                  <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--ink)' }}>9</span>
                  <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>ngày</span>
                </div>
              </Widget>
              <Widget style={{ flex: 1.3, animationDelay: '240ms' }}>
                <div className="label-cap" style={{ marginBottom: 6 }}>Thử thách</div>
                <div className="chip chip-accent" style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600, padding: '4px 9px' }}>
                  <Icon name="clock" size={12} /> {time}
                </div>
              </Widget>
            </div>
          </> :

        <PomodoroPanel pom={pom} />
        }
        <div className="glass-2" style={{ display: 'flex', gap: 5, padding: 5, borderRadius: 'var(--r-pill)' }}>
          {[['study', 'pencil', 'Học tập'], ['pomodoro', 'clock', 'Pomodoro']].map(([k, ic, label]) =>
          <button key={k} onClick={() => setMode(k)}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            padding: '9px', borderRadius: 'var(--r-pill)', fontSize: 13, fontWeight: 700,
            color: mode === k ? 'var(--accent-ink)' : 'var(--ink-2)',
            background: mode === k ? 'var(--accent)' : 'transparent', transition: 'all 160ms var(--ease)'
          }}>
              <Icon name={ic} size={15} /> {label}
            </button>
          )}
        </div>
      </div>

      {/* right utility rail */}
      <aside style={{ position: 'absolute', right: 22, bottom: 22, zIndex: 30, display: 'flex', flexDirection: 'column', gap: 11 }}>
        {[
        { ic: 'search', title: 'Tìm kiếm', onClick: () => toggle('search'), key: 'search' },
        { ic: 'checkCircle', title: 'Đã hoàn thành', onClick: () => go('dashboard') },
        { ic: 'user', title: 'Hồ sơ của bạn', onClick: () => toggle('profile'), key: 'profile' },
        { ic: 'chat', title: 'Trò chuyện với AI', onClick: () => go('speaking') },
        { ic: 'settings', title: 'Cài đặt', onClick: () => toggle('settings'), key: 'settings' }].
        map((b, i) => {
          const active = b.key && panel === b.key;
          return (
            <button key={i} className="iconbtn" title={b.title} onClick={b.onClick}
            style={active ? { background: 'var(--accent)', color: 'var(--accent-ink)', boxShadow: 'var(--sh-glow)', border: '1px solid var(--accent-strong)' } : undefined}>
              <Icon name={b.ic} size={18} />
            </button>);

        })}
      </aside>

      {/* rail popovers */}
      {panel &&
      <>
          <div onClick={() => setPanel(null)} style={{ position: 'absolute', inset: 0, zIndex: 28 }}></div>
          <div className="glass rise" style={{
          position: 'absolute', right: 80, bottom: 22, zIndex: 31, width: 312,
          padding: 0, borderRadius: 'var(--r-lg)', overflow: 'hidden', boxShadow: 'var(--sh-lg)'
        }}>
            {panel === 'profile' && <ProfilePopover go={go} onClose={() => setPanel(null)} />}
            {panel === 'settings' && <SettingsPopover go={go} onClose={() => setPanel(null)} />}
            {panel === 'search' && <SearchPopover go={go} onClose={() => setPanel(null)} />}
          </div>
        </>
      }
    </div>);

}

/* ---- Profile popover (duong: "hiển thị profile") ---- */
function ProfilePopover({ go, onClose }) {
  return (
    <div>
      <div style={{ padding: '20px 20px 16px', background: 'linear-gradient(135deg, rgba(217,232,157,0.55), rgba(217,232,157,0.18))', borderBottom: '1px solid var(--glass-edge)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
          <span style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--accent)', color: 'var(--accent-ink)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 22, boxShadow: 'var(--sh-glow)' }}>M</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--ink)' }}>Minh Nguyễn</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>minh@engdaily.vn</div>
          </div>
          <span className="chip chip-accent" style={{ fontSize: 11 }}><Icon name="trophy" size={13} /> Bạc</span>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          {[['flame', '9', 'Streak'], ['cards', '142', 'Từ'], ['target', '67%', 'Mục tiêu']].map(([ic, v, l]) =>
          <div key={l} style={{ flex: 1, textAlign: 'center', padding: '9px 4px', borderRadius: 'var(--r-sm)', background: 'rgba(255,255,255,0.55)', border: '1px solid var(--glass-edge)' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>{v}</div>
              <div style={{ fontSize: 10.5, color: 'var(--ink-3)', fontWeight: 700 }}>{l}</div>
            </div>
          )}
        </div>
      </div>
      <div style={{ padding: 8 }}>
        {[['user', 'Xem hồ sơ', () => go('dashboard')], ['chart', 'Thống kê học tập', () => go('dashboard')], ['bookmark', 'Kho từ đã lưu', () => go('vocab')], ['settings', 'Cài đặt tài khoản', null]].map(([ic, label, fn], i) =>
        <button key={i} onClick={() => {fn && fn();onClose();}} style={{
          width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px',
          borderRadius: 'var(--r-sm)', fontSize: 14, fontWeight: 600, color: 'var(--ink)', transition: 'background 140ms'
        }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(40,55,30,0.06)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
            <Icon name={ic} size={17} style={{ color: 'var(--accent-deep)' }} /> <span style={{ flex: 1 }}>{label}</span>
            <Icon name="chevR" size={15} style={{ color: 'var(--ink-3)' }} />
          </button>
        )}
        <div className="divider" style={{ margin: '6px 8px' }}></div>
        <button onClick={onClose} style={{
          width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px',
          borderRadius: 'var(--r-sm)', fontSize: 14, fontWeight: 600, color: 'var(--bad)', transition: 'background 140ms'
        }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(217,138,106,0.12)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
          <Icon name="arrowR" size={17} /> <span>Đăng xuất</span>
        </button>
      </div>
    </div>);

}

/* ---- Settings popover (duong: "nhấn không ra gì cả") ---- */
function SettingsPopover({ go, onClose }) {
  const [sound, setSound] = useStateW(true);
  const [notif, setNotif] = useStateW(true);
  const Row = ({ ic, label, children }) =>
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px' }}>
      <Icon name={ic} size={17} style={{ color: 'var(--accent-deep)' }} />
      <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{label}</span>
      {children}
    </div>;

  const Sw = ({ on, set }) =>
  <button onClick={() => set((v) => !v)} style={{ width: 42, height: 24, borderRadius: 999, background: on ? 'var(--accent-deep)' : 'rgba(40,55,30,0.18)', position: 'relative', transition: 'background 180ms' }}>
      <span style={{ position: 'absolute', top: 2, left: on ? 20 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: 'var(--sh-sm)', transition: 'left 180ms var(--ease)' }}></span>
    </button>;

  return (
    <div>
      <div style={{ padding: '15px 18px', borderBottom: '1px solid var(--glass-edge)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Icon name="settings" size={18} style={{ color: 'var(--ink)' }} />
        <span style={{ fontSize: 15.5, fontWeight: 800, color: 'var(--ink)' }}>Cài đặt</span>
      </div>
      <div style={{ padding: 6 }}>
        <Row ic="volume" label="Âm thanh nền"><Sw on={sound} set={setSound} /></Row>
        <Row ic="bell" label="Nhắc học hằng ngày"><Sw on={notif} set={setNotif} /></Row>
        <Row ic="globe" label="Ngôn ngữ"><span className="chip" style={{ fontSize: 12 }}>Tiếng Việt</span></Row>
        <div className="divider" style={{ margin: '4px 12px' }}></div>
        <button onClick={() => {onClose();window.postMessage({ type: '__activate_edit_mode' }, '*');}} style={{
          width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 12px',
          borderRadius: 'var(--r-sm)', fontSize: 14, fontWeight: 600, color: 'var(--ink)', transition: 'background 140ms'
        }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(40,55,30,0.06)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
          <Icon name="sparkle" size={17} style={{ color: 'var(--accent-deep)' }} /> <span style={{ flex: 1 }}>Tùy chỉnh giao diện</span>
          <span style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>Tweaks ↗</span>
        </button>
      </div>
    </div>);

}

/* ---- Search popover ---- */
function SearchPopover({ go, onClose }) {
  const [q, setQ] = useStateW('');
  const recent = ['serene', 'diligent', 'Talking about hobbies', 'My hometown'];
  return (
    <div>
      <div style={{ padding: 14, borderBottom: '1px solid var(--glass-edge)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 13px', borderRadius: 'var(--r-pill)', background: 'rgba(255,255,255,0.65)', border: '1px solid var(--glass-edge)' }}>
          <Icon name="search" size={17} style={{ color: 'var(--ink-3)' }} />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm từ vựng, bài học…"
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, fontFamily: 'var(--font)', color: 'var(--ink)' }} />
        </div>
      </div>
      <div style={{ padding: 8 }}>
        <div className="label-cap" style={{ padding: '6px 10px' }}>Gần đây</div>
        {recent.filter((r) => r.toLowerCase().includes(q.toLowerCase())).map((r, i) =>
        <button key={i} onClick={onClose} style={{
          width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px',
          borderRadius: 'var(--r-sm)', fontSize: 14, fontWeight: 600, color: 'var(--ink)', transition: 'background 140ms'
        }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(40,55,30,0.06)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
            <Icon name="clock" size={15} style={{ color: 'var(--ink-3)' }} /> {r}
          </button>
        )}
      </div>
    </div>);

}

/* ---- Pomodoro countdown modal (duong: "màn hình đồng hồ đếm ngược, có setup thời gian") ---- */
const { useEffect: useEffectW, useRef: useRefW } = React;
const FOCUS_PRESETS = [15, 25, 50];
const BREAK_PRESETS = [5, 10, 15];

// Pomodoro state lives in a hook so it can be lifted into WelcomeScreen and
// keep running while the user is on the "Học tập" tab (duong's request).
function usePomodoro() {
  const [phase, setPhase] = useStateW('focus'); // 'focus' | 'break'
  const [focusMin, setFocusMin] = useStateW(25);
  const [breakMin, setBreakMin] = useStateW(5);
  const [left, setLeft] = useStateW(25 * 60); // seconds remaining
  const [running, setRunning] = useStateW(false);
  const [rounds, setRounds] = useStateW(0);
  const tick = useRefW(null);

  const total = (phase === 'focus' ? focusMin : breakMin) * 60;

  // when not running, keep `left` synced to the chosen duration
  useEffectW(() => {
    if (!running) setLeft((phase === 'focus' ? focusMin : breakMin) * 60);
  }, [focusMin, breakMin, phase, running]);

  // the countdown
  useEffectW(() => {
    if (!running) return;
    tick.current = setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          clearInterval(tick.current);
          setRunning(false);
          setPhase((p) => {
            const nextIsBreak = p === 'focus';
            if (nextIsBreak) setRounds((r) => r + 1);
            return nextIsBreak ? 'break' : 'focus';
          });
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(tick.current);
  }, [running]);

  const reset = () => {setRunning(false);setLeft((phase === 'focus' ? focusMin : breakMin) * 60);};
  return { phase, setPhase, focusMin, setFocusMin, breakMin, setBreakMin,
    left, running, setRunning, rounds, total, reset };
}

// Compact inline panel — replaces the study widgets in the bottom-left column.
function PomodoroPanel({ pom }) {
  const { phase, setPhase, focusMin, setFocusMin, breakMin, setBreakMin,
    left, running, setRunning, rounds, total, reset } = pom;

  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  const pct = total > 0 ? (1 - left / total) * 100 : 0;
  const size = 150, r = (size - 16) / 2, c = 2 * Math.PI * r, off = c - pct / 100 * c;
  const accent = phase === 'focus' ? 'var(--accent-deep)' : 'var(--info)';
  const syncStop = (p) => { if (phase === p) setRunning(false); };

  return (
    <div className="glass rise" style={{ padding: 16 }}>
      {/* header + phase switch */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div className="label-cap" style={{ color: 'var(--accent-deep)' }}>Pomodoro</div>
        <div className="glass-2" style={{ display: 'flex', gap: 3, padding: 3, borderRadius: 'var(--r-pill)' }}>
          {[['focus', 'Tập trung'], ['break', 'Nghỉ']].map(([k, label]) =>
          <button key={k} onClick={() => {setPhase(k);setRunning(false);}} style={{
            padding: '5px 11px', borderRadius: 'var(--r-pill)', fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap',
            color: phase === k ? 'var(--accent-ink)' : 'var(--ink-2)',
            background: phase === k ? 'var(--accent)' : 'transparent', transition: 'all 160ms var(--ease)'
          }}>{label}</button>
          )}
        </div>
      </div>

      {/* ring */}
      <div style={{ position: 'relative', width: size, height: size, margin: '0 auto', display: 'grid', placeItems: 'center' }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(40,55,30,0.12)" strokeWidth="9" />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={accent} strokeWidth="9"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off}
          style={{ transition: 'stroke-dashoffset 980ms linear' }} />
        </svg>
        <div style={{ position: 'absolute', textAlign: 'center' }}>
          <div style={{ fontSize: 34, fontWeight: 800, color: 'var(--ink)', fontFamily: 'var(--font-mono)', lineHeight: 1, letterSpacing: '-0.02em' }}>{mm}:{ss}</div>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ink-3)', marginTop: 5 }}>{phase === 'focus' ? 'Tập trung' : 'Giải lao'} · {rounds} phiên</div>
        </div>
      </div>

      {/* controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
        <button className="iconbtn" onClick={reset} title="Đặt lại" style={{ width: 38, height: 38, background: 'rgba(40,55,30,0.07)', color: 'var(--ink)', border: '1px solid var(--glass-edge)' }}><Icon name="refresh" size={16} /></button>
        <button onClick={() => setRunning((x) => !x)} className={running ? '' : 'pulse-soft'} style={{
          flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '11px', borderRadius: 'var(--r-pill)', fontSize: 14, fontWeight: 800,
          background: 'var(--accent)', color: 'var(--accent-ink)', boxShadow: 'var(--sh-glow)', transition: 'all 160ms var(--ease)'
        }}>
          <Icon name={running ? 'pause' : 'play'} size={17} fill={!running} /> {running ? 'Tạm dừng' : 'Bắt đầu'}
        </button>
      </div>

      {/* time setup */}
      <div className="divider" style={{ margin: '14px 0 12px' }}></div>
      <div className="label-cap" style={{ marginBottom: 8 }}>Cài đặt thời gian</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <span style={{ width: 54, fontSize: 12, fontWeight: 700, color: 'var(--ink-2)' }}>Tập trung</span>
        <div style={{ display: 'flex', gap: 5 }}>
          {FOCUS_PRESETS.map((m) =>
          <button key={m} onClick={() => {setFocusMin(m);syncStop('focus');}} style={miniChip(focusMin === m)}>{m}</button>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 54, fontSize: 12, fontWeight: 700, color: 'var(--ink-2)' }}>Nghỉ</span>
        <div style={{ display: 'flex', gap: 5 }}>
          {BREAK_PRESETS.map((m) =>
          <button key={m} onClick={() => {setBreakMin(m);syncStop('break');}} style={miniChip(breakMin === m)}>{m}</button>
          )}
        </div>
      </div>
    </div>);

}

function miniChip(active) {
  return {
    minWidth: 36, padding: '7px 0', borderRadius: 'var(--r-pill)', fontSize: 12.5, fontWeight: 700,
    fontFamily: 'var(--font-mono)',
    color: active ? 'var(--accent-ink)' : 'var(--ink-2)',
    background: active ? 'var(--accent)' : 'rgba(255,255,255,0.55)',
    border: active ? '1px solid var(--accent-strong)' : '1px solid var(--glass-edge)',
    transition: 'all 140ms var(--ease)'
  };
}

Object.assign(window, { WelcomeScreen, TopBar });