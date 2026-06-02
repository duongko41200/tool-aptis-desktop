/* global React, Icon, TopBar, Ring */
const { useState: useStateWr } = React;

const PROMPT = {
  title: "My favourite place to relax",
  desc: "Mô tả một nơi bạn thường đến để thư giãn. Vì sao nơi đó đặc biệt với bạn?",
  reqs: [
    { t: 'Tối thiểu 80 từ', test: (n) => n >= 80 },
    { t: 'Dùng ít nhất 2 tính từ miêu tả', test: (n) => n >= 30 },
    { t: 'Có câu mở đầu & kết luận', test: (n) => n >= 50 },
  ],
};
const SAMPLE = `My favourite place to relax is a small café near my house. It is very cozy and quiet, with warm lights and soft lofi music playing all day. I usually go there in the afternoon to read a book or study English. The serene atmosphere helps me feel calm and focused.`;

function WritingScreen({ go, t }) {
  const [text, setText] = useStateWr('');
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const done = PROMPT.reqs.filter(r => r.test(words)).length;

  return (
    <div className="screen">
      <TopBar go={go} current="writing" />
      <div style={{ position: 'absolute', inset: 0, paddingTop: 92, display: 'grid', placeItems: 'center' }}>
        <div style={{ width: 'min(1080px, 95vw)', height: 'min(80vh, 740px)', display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16 }}>

          {/* left: prompt + reqs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0 }}>
            <div className="glass" style={{ padding: 20 }}>
              <div className="chip chip-accent" style={{ marginBottom: 12 }}><Icon name="calendar" size={14} /> Đề hôm nay</div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em', margin: '0 0 8px', lineHeight: 1.2 }}>{PROMPT.title}</h2>
              <p style={{ fontSize: 13.5, color: 'var(--ink-2)', margin: 0, lineHeight: 1.55 }}>{PROMPT.desc}</p>
            </div>
            <div className="glass" style={{ padding: 20, flex: 1 }}>
              <div className="label-cap" style={{ marginBottom: 12 }}>Yêu cầu bài viết</div>
              {PROMPT.reqs.map((r, i) => {
                const ok = r.test(words);
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0' }}>
                    <span style={{ width: 24, height: 24, borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0,
                      background: ok ? 'var(--accent)' : 'rgba(40,55,30,0.08)', color: ok ? 'var(--accent-ink)' : 'var(--ink-3)', transition: 'all 200ms var(--ease)' }}>
                      <Icon name={ok ? 'check' : 'close'} size={14} />
                    </span>
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: ok ? 'var(--ink)' : 'var(--ink-3)', textDecoration: ok ? 'none' : 'none' }}>{r.t}</span>
                  </div>
                );
              })}
              <div className="divider" style={{ margin: '12px 0' }}></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Ring value={(done / PROMPT.reqs.length) * 100} size={56} label={`${done}/${PROMPT.reqs.length}`} />
                <span style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 600 }}>Hoàn thành yêu cầu</span>
              </div>
            </div>
          </div>

          {/* right: editor */}
          <div className="glass" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 'var(--r-xl)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px', borderBottom: '1px solid var(--glass-edge)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Icon name="pencil" size={19} style={{ color: 'var(--accent-deep)' }} />
                <span style={{ fontSize: 15.5, fontWeight: 800, color: 'var(--ink)' }}>Phòng viết</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button onClick={() => setText(SAMPLE)} className="chip" style={{ fontSize: 12 }}><Icon name="sparkle" size={13} /> Điền mẫu</button>
                <span className="chip" style={{ fontSize: 12, fontFamily: 'var(--font-mono)' }}>{words} từ</span>
              </div>
            </div>
            <textarea value={text} onChange={(e) => setText(e.target.value)}
              placeholder="Bắt đầu viết ở đây... Cứ thoải mái, AI sẽ giúp bạn chỉnh sau."
              className="scroll"
              style={{ flex: 1, border: 'none', outline: 'none', resize: 'none', background: 'rgba(255,255,255,0.35)',
                padding: '22px 24px', fontSize: 16, lineHeight: 1.7, color: 'var(--ink)', fontFamily: 'var(--font)' }} />
            <div style={{ padding: 18, borderTop: '1px solid var(--glass-edge)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>Tự động lưu nháp · vừa xong</span>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-soft btn-sm">Lưu nháp</button>
                <button onClick={() => go('feedback')} className="btn btn-primary btn-sm" disabled={words < 5}
                  style={{ opacity: words < 5 ? 0.5 : 1 }}>
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

/* ---------------- Feedback ---------------- */
const FB = {
  overall: 82,
  scores: [{ k: 'Ngữ pháp', v: 78, ic: 'check' }, { k: 'Từ vựng', v: 85, ic: 'book' }, { k: 'Bố cục', v: 84, ic: 'list' }],
  grammar: [
    { wrong: 'It is very cozy and quiet, with warm lights', right: 'It is very cozy and quiet, with warm lighting', note: '"lighting" tự nhiên hơn khi nói về không khí.' },
    { wrong: 'I usually go there in the afternoon', right: 'I usually go there in the afternoons', note: 'Thói quen lặp lại → dùng số nhiều.' },
  ],
  vocab: [
    { from: 'quiet', to: 'tranquil', note: 'Nâng cấp sắc thái: "tranquil" trang trọng & gợi hình hơn.' },
    { from: 'feel calm', to: 'unwind', note: '"unwind" = thư giãn, gọn và tự nhiên.' },
  ],
  structure: ['Mở bài rõ ràng, đi thẳng vào nơi chốn — rất tốt.', 'Nên thêm một câu kể về cảm giác cụ thể (giác quan) để sinh động hơn.', 'Kết bài có thể mở rộng: vì sao nơi này quan trọng lâu dài với bạn.'],
};

function ScoreBar({ k, v, ic }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}><Icon name={ic} size={15} style={{ color: 'var(--accent-deep)' }} /> {k}</span>
        <span style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>{v}</span>
      </div>
      <div className="bar"><i style={{ width: v + '%' }}></i></div>
    </div>
  );
}

function FeedbackScreen({ go, t }) {
  const [tab, setTab] = useStateWr('grammar');
  return (
    <div className="screen scroll" style={{ overflowY: 'auto' }}>
      <TopBar go={go} current="writing" />
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '108px 28px 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, alignItems: 'start' }}>

          {/* left: scorecard */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'sticky', top: 108 }}>
            <div className="glass rise" style={{ padding: 24, textAlign: 'center' }}>
              <div className="label-cap" style={{ color: 'var(--accent-deep)' }}>Điểm tổng</div>
              <div style={{ margin: '14px auto' }}><Ring value={FB.overall} size={132} label={FB.overall} sub="/ 100" /></div>
              <div className="chip chip-accent" style={{ fontSize: 12 }}><Icon name="trophy" size={14} /> Khá tốt — tiến bộ rõ!</div>
            </div>
            <div className="glass rise" style={{ padding: 22, animationDelay: '80ms' }}>
              <div className="label-cap" style={{ marginBottom: 14 }}>Phân tích</div>
              {FB.scores.map(s => <ScoreBar key={s.k} {...s} />)}
            </div>
            <button onClick={() => go('writing')} className="btn btn-soft"><Icon name="pencil" size={16} /> Viết lại / cải thiện</button>
          </div>

          {/* right: detailed feedback */}
          <div className="glass rise" style={{ padding: 24, animationDelay: '120ms' }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-0.02em', margin: '0 0 4px' }}>Nhận xét chi tiết</h1>
            <p style={{ fontSize: 13.5, color: 'var(--ink-3)', margin: '0 0 18px' }}>Đề: {PROMPT.title}</p>

            <div className="glass-2" style={{ display: 'inline-flex', gap: 4, padding: 5, marginBottom: 20 }}>
              {[['grammar', 'Ngữ pháp'], ['vocab', 'Từ vựng'], ['structure', 'Bố cục'], ['model', 'Bài mẫu']].map(([k, label]) => (
                <button key={k} onClick={() => setTab(k)} style={{
                  padding: '8px 16px', borderRadius: 'var(--r-pill)', fontSize: 13.5, fontWeight: 700,
                  color: tab === k ? 'var(--accent-ink)' : 'var(--ink-2)', background: tab === k ? 'var(--accent)' : 'transparent',
                  transition: 'all 160ms var(--ease)',
                }}>{label}</button>
              ))}
            </div>

            {tab === 'grammar' && <div style={{ display: 'grid', gap: 12 }}>
              {FB.grammar.map((g, i) => (
                <div key={i} style={{ padding: 16, borderRadius: 'var(--r-md)', background: 'rgba(255,255,255,0.55)', border: '1px solid var(--glass-edge)' }}>
                  <div style={{ fontSize: 14, color: 'var(--ink-2)' }}><s style={{ color: 'var(--bad)' }}>{g.wrong}</s></div>
                  <div style={{ fontSize: 14.5, color: 'var(--ink)', fontWeight: 700, marginTop: 4, display: 'flex', alignItems: 'center', gap: 7 }}><Icon name="check" size={15} style={{ color: 'var(--good)' }} /> {g.right}</div>
                  <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 6 }}>{g.note}</div>
                </div>
              ))}
            </div>}

            {tab === 'vocab' && <div style={{ display: 'grid', gap: 12 }}>
              {FB.vocab.map((v, i) => (
                <div key={i} style={{ padding: 16, borderRadius: 'var(--r-md)', background: 'rgba(255,255,255,0.55)', border: '1px solid var(--glass-edge)', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ fontSize: 15, color: 'var(--ink-3)', textDecoration: 'line-through' }}>{v.from}</span>
                  <Icon name="arrowR" size={18} style={{ color: 'var(--accent-deep)' }} />
                  <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>{v.to}</span>
                  <span style={{ fontSize: 13, color: 'var(--ink-3)', flex: 1, textAlign: 'right' }}>{v.note}</span>
                </div>
              ))}
            </div>}

            {tab === 'structure' && <div style={{ display: 'grid', gap: 10 }}>
              {FB.structure.map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: 14, borderRadius: 'var(--r-md)', background: 'rgba(255,255,255,0.55)', border: '1px solid var(--glass-edge)' }}>
                  <Icon name="lightbulb" size={18} style={{ color: 'var(--warn)', flexShrink: 0, marginTop: 1 }} />
                  <span style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.55 }}>{s}</span>
                </div>
              ))}
            </div>}

            {tab === 'model' && <div style={{ padding: 20, borderRadius: 'var(--r-md)', background: 'rgba(217,232,157,0.32)', border: '1px solid rgba(170,203,79,0.4)' }}>
              <div className="label-cap" style={{ color: 'var(--accent-deep)', marginBottom: 10 }}><Icon name="star" size={13} fill /> Bài mẫu tham khảo</div>
              <p style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--ink)', margin: 0 }}>
                My favourite place to unwind is a small café tucked away near my house. It feels wonderfully <b>tranquil</b>, bathed in warm lighting with soft lofi music drifting through the air. Most afternoons, I settle in with a good book and a cup of coffee. The <b>serene</b> atmosphere clears my mind and lets me focus — it has quietly become my second home.
              </p>
            </div>}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { WritingScreen, FeedbackScreen });
