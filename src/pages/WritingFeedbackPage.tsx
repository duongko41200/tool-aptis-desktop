import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../components/layout/TopBar';
import Icon from '../components/common/Icon';

function Ring({ value = 68, size = 92, label, sub }: { value?: number; size?: number; label?: string | number; sub?: string }) {
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;
  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'grid', placeItems: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(40,55,30,0.13)" strokeWidth="9" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent-deep)" strokeWidth="9"
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

function ScoreBar({ k, v, ic }: { k: string; v: number; ic: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>
          <Icon name={ic} size={15} style={{ color: 'var(--accent-deep)' }} /> {k}
        </span>
        <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>{v}</span>
      </div>
      <div className="bar"><i style={{ width: v + '%' }} /></div>
    </div>
  );
}

const FB = {
  overall: 82,
  prompt:  "My favourite place to relax",
  scores:  [
    { k: 'Ngữ pháp', v: 78, ic: 'check' },
    { k: 'Từ vựng',  v: 85, ic: 'book'  },
    { k: 'Bố cục',   v: 84, ic: 'list'  },
  ],
  grammar: [
    { wrong: 'It is very cozy and quiet, with warm lights',    right: 'It is very cozy and quiet, with warm lighting',  note: '"lighting" tự nhiên hơn khi nói về không khí.' },
    { wrong: 'I usually go there in the afternoon',            right: 'I usually go there in the afternoons',          note: 'Thói quen lặp lại → dùng số nhiều.' },
  ],
  vocab: [
    { from: 'quiet',    to: 'tranquil', note: 'Nâng cấp sắc thái: "tranquil" trang trọng & gợi hình hơn.' },
    { from: 'feel calm', to: 'unwind',  note: '"unwind" = thư giãn, gọn và tự nhiên.' },
  ],
  structure: [
    'Mở bài rõ ràng, đi thẳng vào nơi chốn — rất tốt.',
    'Nên thêm một câu kể về cảm giác cụ thể (giác quan) để sinh động hơn.',
    'Kết bài có thể mở rộng: vì sao nơi này quan trọng lâu dài với bạn.',
  ],
};

type Tab = 'grammar' | 'vocab' | 'structure' | 'model';

export default function WritingFeedbackPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('grammar');

  return (
    <div className="screen scroll" style={{ overflowY: 'auto' }}>
      <TopBar />
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '108px 28px 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, alignItems: 'start' }}>

          {/* Left: scorecard */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 108 }}>
            <div className="glass rise" style={{ padding: 24, textAlign: 'center' }}>
              <div className="label-cap" style={{ color: 'var(--accent-deep)' }}>Điểm tổng</div>
              <div style={{ margin: '14px auto' }}>
                <Ring value={FB.overall} size={132} label={FB.overall} sub="/ 100" />
              </div>
              <div className="chip chip-accent" style={{ fontSize: 12 }}>
                <Icon name="trophy" size={14} /> Khá tốt — tiến bộ rõ!
              </div>
            </div>

            <div className="glass rise" style={{ padding: 22, animationDelay: '80ms' }}>
              <div className="label-cap" style={{ marginBottom: 14 }}>Phân tích</div>
              {FB.scores.map(s => <ScoreBar key={s.k} {...s} />)}
            </div>

            <button onClick={() => navigate('/writing')} className="btn btn-soft">
              <Icon name="pencil" size={16} /> Viết lại / cải thiện
            </button>
          </div>

          {/* Right: detailed feedback */}
          <div className="glass rise" style={{ padding: 24, animationDelay: '120ms' }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em', margin: '0 0 4px' }}>Nhận xét chi tiết</h1>
            <p style={{ fontSize: 13.5, color: 'var(--ink-3)', margin: '0 0 18px' }}>Đề: {FB.prompt}</p>

            {/* Tab selector */}
            <div className="glass-2" style={{ display: 'inline-flex', gap: 4, padding: 5, marginBottom: 20 }}>
              {([['grammar', 'Ngữ pháp'], ['vocab', 'Từ vựng'], ['structure', 'Bố cục'], ['model', 'Bài mẫu']] as [Tab, string][]).map(([k, label]) => (
                <button key={k} onClick={() => setTab(k)}
                  style={{ padding: '8px 16px', borderRadius: 'var(--r-pill)', fontSize: 13.5, fontWeight: 700, color: tab === k ? 'var(--accent-ink)' : 'var(--ink-2)', background: tab === k ? 'var(--accent)' : 'transparent', transition: 'all 160ms var(--ease)' }}>
                  {label}
                </button>
              ))}
            </div>

            {tab === 'grammar' && (
              <div style={{ display: 'grid', gap: 12 }}>
                {FB.grammar.map((g, i) => (
                  <div key={i} style={{ padding: 16, borderRadius: 'var(--r-md)', background: 'rgba(255,255,255,0.55)', border: '1px solid var(--glass-edge)' }}>
                    <div style={{ fontSize: 14, color: 'var(--ink-2)' }}><s style={{ color: 'var(--bad)' }}>{g.wrong}</s></div>
                    <div style={{ fontSize: 14.5, color: 'var(--ink)', fontWeight: 700, marginTop: 4, display: 'flex', alignItems: 'center', gap: 7 }}>
                      <Icon name="check" size={15} style={{ color: 'var(--good)' }} /> {g.right}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 6 }}>{g.note}</div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'vocab' && (
              <div style={{ display: 'grid', gap: 12 }}>
                {FB.vocab.map((v, i) => (
                  <div key={i} style={{ padding: 16, borderRadius: 'var(--r-md)', background: 'rgba(255,255,255,0.55)', border: '1px solid var(--glass-edge)', display: 'flex', alignItems: 'center', gap: 14 }}>
                    <span style={{ fontSize: 15, color: 'var(--ink-3)', textDecoration: 'line-through' }}>{v.from}</span>
                    <Icon name="arrowR" size={18} style={{ color: 'var(--accent-deep)' }} />
                    <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>{v.to}</span>
                    <span style={{ fontSize: 13, color: 'var(--ink-3)', flex: 1, textAlign: 'right' }}>{v.note}</span>
                  </div>
                ))}
              </div>
            )}

            {tab === 'structure' && (
              <div style={{ display: 'grid', gap: 10 }}>
                {FB.structure.map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, padding: 14, borderRadius: 'var(--r-md)', background: 'rgba(255,255,255,0.55)', border: '1px solid var(--glass-edge)' }}>
                    <Icon name="lightbulb" size={18} style={{ color: 'var(--warn)', flexShrink: 0, marginTop: 1 }} />
                    <span style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.55 }}>{s}</span>
                  </div>
                ))}
              </div>
            )}

            {tab === 'model' && (
              <div style={{ padding: 20, borderRadius: 'var(--r-md)', background: 'rgba(217,232,157,0.32)', border: '1px solid rgba(170,203,79,0.4)' }}>
                <div className="label-cap" style={{ color: 'var(--accent-deep)', marginBottom: 10 }}>
                  <Icon name="star" size={13} fill /> Bài mẫu tham khảo
                </div>
                <p style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--ink)', margin: 0 }}>
                  My favourite place to unwind is a small café tucked away near my house. It feels wonderfully <b>tranquil</b>, bathed in warm lighting with soft lofi music drifting through the air. Most afternoons, I settle in with a good book and a cup of coffee. The <b>serene</b> atmosphere clears my mind and lets me focus — it has quietly become my second home.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
