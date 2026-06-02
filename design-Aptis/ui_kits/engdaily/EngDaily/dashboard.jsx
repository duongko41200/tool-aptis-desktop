/* global React, Icon, Logo, Widget, TopBar */
const { useState: useStateD } = React;

function Ring({ value = 68, size = 92, label, sub }) {
  const r = (size - 12) / 2, c = 2 * Math.PI * r, off = c - (value / 100) * c;
  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'grid', placeItems: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(40,55,30,0.13)" strokeWidth="9" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--accent-deep)" strokeWidth="9"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off}
          style={{ transition: 'stroke-dashoffset 900ms var(--ease)' }} />
      </svg>
      <div style={{ position: 'absolute', textAlign: 'center' }}>
        <div style={{ fontSize: size * 0.27, fontWeight: 800, color: 'var(--ink)', lineHeight: 1 }}>{label}</div>
        {sub && <div style={{ fontSize: 10.5, color: 'var(--ink-3)', fontWeight: 700, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

function ModeCard({ ic, tag, title, desc, meta, go, target, delay, big }) {
  const [h, setH] = useStateD(false);
  return (
    <button onClick={() => go(target)} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      className="glass rise"
      style={{
        textAlign: 'left', padding: 22, display: 'flex', flexDirection: 'column', gap: 14,
        cursor: 'pointer', transition: 'all 220ms var(--ease)', animationDelay: delay,
        transform: h ? 'translateY(-4px)' : 'none',
        boxShadow: h ? 'var(--sh-lg)' : 'var(--sh-md), inset 0 1px 0 rgba(255,255,255,0.55)',
        border: h ? '1px solid var(--accent-strong)' : '1px solid var(--glass-line)',
        gridColumn: big ? 'span 2' : 'auto',
      }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          width: 48, height: 48, borderRadius: 'var(--r-md)', display: 'grid', placeItems: 'center',
          background: 'var(--accent)', color: 'var(--accent-ink)', boxShadow: 'var(--sh-glow)',
        }}><Icon name={ic} size={24} /></span>
        <span className="chip chip-accent" style={{ fontSize: 11 }}>{tag}</span>
      </div>
      <div>
        <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em' }}>{title}</div>
        <div style={{ fontSize: 13.5, color: 'var(--ink-2)', marginTop: 4, lineHeight: 1.5 }}>{desc}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
        <span style={{ fontSize: 12.5, color: 'var(--ink-3)', fontWeight: 600 }}>{meta}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: 'var(--accent-deep)' }}>
          Bắt đầu <Icon name="arrowR" size={16} />
        </span>
      </div>
    </button>
  );
}

function Player() {
  const [playing, setPlaying] = useStateD(true);
  return (
    <div className="darkglass" style={{ borderRadius: 'var(--r-lg)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <button onClick={() => setPlaying(p => !p)}
        style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--accent)', color: 'var(--accent-ink)', display: 'grid', placeItems: 'center', boxShadow: 'var(--sh-glow)' }}>
        <Icon name={playing ? 'pause' : 'play'} size={20} fill={!playing} />
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Rainy Café — lofi beats</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-mono)' }}>1:24</span>
          <div className="bar" style={{ flex: 1, background: 'rgba(255,255,255,0.18)' }}><i style={{ width: '38%', background: 'var(--accent)' }}></i></div>
          <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-mono)' }}>3:40</span>
        </div>
      </div>
      <button className="iconbtn" style={{ width: 38, height: 38 }}><Icon name="skip" size={16} fill /></button>
      <button className="iconbtn" style={{ width: 38, height: 38 }}><Icon name="volume" size={17} /></button>
    </div>
  );
}

function DashboardScreen({ go, t }) {
  return (
    <div className="screen scroll" style={{ overflowY: 'auto' }}>
      <TopBar go={go} current="dashboard" />
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '108px 28px 32px' }}>

        {/* header card */}
        <div className="glass rise" style={{ padding: 26, display: 'flex', alignItems: 'center', gap: 24, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div className="label-cap" style={{ color: 'var(--accent-deep)' }}>Thứ Hai · Buổi sáng</div>
            <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.025em', color: 'var(--ink)', margin: '6px 0 6px' }}>Chào buổi sáng, Minh 🌿</h1>
            <p style={{ fontSize: 14.5, color: 'var(--ink-2)', margin: 0 }}>Bạn đã học <b style={{ color: 'var(--ink) ' }}>20 / 30 phút</b> hôm nay. Cố thêm chút nữa nhé!</p>
            <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
              <span className="chip"><Icon name="flame" size={15} fill style={{ color: '#e08a3b' }} /> Streak 9 ngày</span>
              <span className="chip"><Icon name="cards" size={15} /> 142 từ đã thuộc</span>
              <span className="chip"><Icon name="trophy" size={15} /> Hạng Bạc</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 22, alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <Ring value={67} label="67%" sub="MỤC TIÊU" />
            </div>
            <button onClick={() => go('welcome')} className="btn btn-primary">
              <Icon name="play" size={18} fill /> Tiếp tục học
            </button>
          </div>
        </div>

        {/* mode grid */}
        <div className="label-cap" style={{ color: 'var(--on-dark-2)', margin: '4px 2px 12px' }}>Luyện tập hôm nay</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
          <ModeCard ic="chat" tag="AI · Nói" title="Luyện nói với AI" desc="Hội thoại tự nhiên, nhận sửa lỗi phát âm & ngữ pháp ngay lập tức." meta="~10 phút · 3 chủ đề mới" go={go} target="speaking" delay="60ms" />
          <ModeCard ic="pencil" tag="AI · Viết" title="Phòng viết" desc="Viết theo đề mỗi ngày, AI chấm chi tiết Grammar · Vocab · Structure." meta="~15 phút · đề hôm nay" go={go} target="writing" delay="120ms" />
          <ModeCard ic="headphones" tag="Shadowing" title="Luyện nghe & nhại" desc="Nghe đoạn hội thoại lofi, nhại theo từng câu để cải thiện ngữ điệu." meta="~8 phút · video mới" go={go} target="speaking" delay="180ms" />
        </div>

        {/* bottom row: recent + player */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }}>
          <div className="glass rise" style={{ padding: 22, animationDelay: '220ms' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div className="label-cap">Hoạt động gần đây</div>
              <button className="chip" style={{ fontSize: 12 }} onClick={() => go('feedback')}>Xem tất cả <Icon name="chevR" size={13} /></button>
            </div>
            {[['pencil', 'Bài viết: My hometown', 'Điểm 82 · 2 giờ trước', 'feedback'], ['chat', 'Nói: Talking about hobbies', '12 phút · hôm qua', 'speaking'], ['cards', 'Ôn 24 thẻ từ vựng', 'Hoàn thành · hôm qua', 'vocab']].map(([ic, ti, sub, tg], i) => (
              <button key={i} onClick={() => go(tg)} style={{
                width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 13,
                padding: '11px 8px', borderRadius: 'var(--r-sm)', transition: 'background 140ms',
              }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(40,55,30,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span style={{ width: 38, height: 38, borderRadius: 'var(--r-sm)', background: 'rgba(217,232,157,0.5)', color: 'var(--accent-ink)', display: 'grid', placeItems: 'center' }}><Icon name={ic} size={18} /></span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{ti}</span>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{sub}</span>
                </span>
                <Icon name="chevR" size={16} style={{ color: 'var(--ink-3)' }} />
              </button>
            ))}
          </div>

          <div className="rise" style={{ display: 'flex', flexDirection: 'column', gap: 16, animationDelay: '280ms' }}>
            <Player />
            <div className="glass" style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div className="label-cap" style={{ color: 'var(--accent-deep)', marginBottom: 8 }}>Từ của ngày</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em' }}>serene <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>/səˈriːn/</span></div>
              <div style={{ fontSize: 13.5, color: 'var(--ink-2)', marginTop: 4 }}>(tính từ) thanh bình, yên ả</div>
              <button onClick={() => go('vocab')} className="btn btn-soft btn-sm" style={{ marginTop: 14, alignSelf: 'flex-start' }}>
                <Icon name="plus" size={15} /> Lưu vào kho từ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DashboardScreen, Ring });
