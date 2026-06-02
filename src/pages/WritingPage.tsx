import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/layout/TopBar';
import Icon from '../components/common/Icon';

function Ring({ value = 68, size = 56, label }: { value?: number; size?: number; label?: string }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;
  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(40,55,30,0.13)" strokeWidth="7" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent-deep)" strokeWidth="7"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off}
          style={{ transition: 'stroke-dashoffset 600ms var(--ease)' }} />
      </svg>
      <div style={{ position: 'absolute', fontSize: size * 0.24, fontWeight: 800, color: 'var(--ink)', lineHeight: 1 }}>{label}</div>
    </div>
  );
}

const PROMPT = {
  title: "My favourite place to relax",
  desc: "Mô tả một nơi bạn thường đến để thư giãn. Vì sao nơi đó đặc biệt với bạn?",
  reqs: [
    { t: 'Tối thiểu 80 từ',              test: (n: number) => n >= 80 },
    { t: 'Dùng ít nhất 2 tính từ miêu tả', test: (n: number) => n >= 30 },
    { t: 'Có câu mở đầu & kết luận',      test: (n: number) => n >= 50 },
  ],
};

const SAMPLE = `My favourite place to relax is a small café near my house. It is very cozy and quiet, with warm lights and soft lofi music playing all day. I usually go there in the afternoon to read a book or study English. The serene atmosphere helps me feel calm and focused.`;

export default function WritingPage() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const done = PROMPT.reqs.filter(r => r.test(words)).length;

  return (
    <div className="screen">
      <TopBar />
      <div style={{ position: 'absolute', inset: 0, paddingTop: 92, display: 'grid', placeItems: 'center' }}>
        <div style={{ width: 'min(1080px,95vw)', height: 'min(80vh,740px)', display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16 }}>

          {/* Left: prompt + reqs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0 }}>
            <div className="glass" style={{ padding: 20 }}>
              <div className="chip chip-accent" style={{ marginBottom: 12 }}>
                <Icon name="calendar" size={14} /> Đề hôm nay
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em', margin: '0 0 8px', lineHeight: 1.2 }}>
                {PROMPT.title}
              </h2>
              <p style={{ fontSize: 13.5, color: 'var(--ink-2)', margin: 0, lineHeight: 1.55 }}>{PROMPT.desc}</p>
            </div>

            <div className="glass" style={{ padding: 20, flex: 1 }}>
              <div className="label-cap" style={{ marginBottom: 12 }}>Yêu cầu bài viết</div>
              {PROMPT.reqs.map((r, i) => {
                const ok = r.test(words);
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0' }}>
                    <span style={{ width: 24, height: 24, borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0, background: ok ? 'var(--accent)' : 'rgba(40,55,30,0.08)', color: ok ? 'var(--accent-ink)' : 'var(--ink-3)', transition: 'all 200ms var(--ease)' }}>
                      <Icon name={ok ? 'check' : 'close'} size={14} />
                    </span>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: ok ? 'var(--ink)' : 'var(--ink-3)' }}>{r.t}</span>
                  </div>
                );
              })}
              <hr className="divider" style={{ margin: '12px 0' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Ring value={(done / PROMPT.reqs.length) * 100} size={56} label={`${done}/${PROMPT.reqs.length}`} />
                <span style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 600 }}>Hoàn thành yêu cầu</span>
              </div>
            </div>
          </div>

          {/* Right: editor */}
          <div className="glass" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 'var(--r-xl)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px', borderBottom: '1px solid var(--glass-edge)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Icon name="pencil" size={19} style={{ color: 'var(--accent-deep)' }} />
                <span style={{ fontSize: 15.5, fontWeight: 800, color: 'var(--ink)' }}>Phòng viết</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={() => setText(SAMPLE)} className="chip" style={{ fontSize: 12 }}>
                  <Icon name="sparkle" size={13} /> Điền mẫu
                </button>
                <span className="chip" style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>{words} từ</span>
              </div>
            </div>

            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Bắt đầu viết ở đây... Cứ thoải mái, AI sẽ giúp bạn chỉnh sau."
              className="scroll"
              style={{ flex: 1, border: 'none', outline: 'none', resize: 'none', background: 'rgba(255,255,255,0.35)', padding: '22px 24px', fontSize: 16, lineHeight: 1.7, color: 'var(--ink)', fontFamily: 'var(--font)' }}
            />

            <div style={{ padding: 18, borderTop: '1px solid var(--glass-edge)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>Tự động lưu nháp · vừa xong</span>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-soft btn-sm">Lưu nháp</button>
                <button
                  onClick={() => navigate('/writing/feedback')}
                  className="btn btn-primary btn-sm"
                  disabled={words < 5}
                  style={{ opacity: words < 5 ? 0.5 : 1 }}
                >
                  <Icon name="sparkle" size={16} /> Nộp & chấm bài
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
