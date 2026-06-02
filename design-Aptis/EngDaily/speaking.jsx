/* global React, Icon, TopBar */
const { useState: useStateS, useRef: useRefS, useEffect: useEffectS } = React;

const SEED = [
  { from: 'ai', text: "Hi! Let's chat about your weekend. What did you do?" },
  { from: 'me', text: "I go to a coffee shop and read book all afternoon.", corr: { wrong: 'I go to a coffee shop and read book', right: 'I went to a coffee shop and read a book', note: 'Quá khứ "went" + mạo từ "a book".' } },
  { from: 'ai', text: "That sounds lovely and serene. Which book were you reading?" },
];
const REPLIES = [
  { text: "Nice! Tell me more — how did it make you feel?", },
  { text: "Great pronunciation on that one. Can you use it in a longer sentence?" },
  { text: "I see. What would you change about it next time?" },
];
const USER_LINES = [
  { text: "It make me feel very relax and happy.", corr: { wrong: 'It make me feel very relax', right: 'It made me feel very relaxed', note: '"made" (quá khứ) + tính từ "relaxed".' } },
  { text: "I want to improve my speaking everyday.", corr: { wrong: 'improve my speaking everyday', right: 'improve my speaking every day', note: '"every day" (trạng từ) viết tách, khác "everyday" (tính từ).' } },
  { text: "Yesterday I watched a movie with my friends.", corr: null },
];

function Bubble({ m }) {
  const me = m.from === 'me';
  return (
    <div style={{ display: 'flex', justifyContent: me ? 'flex-end' : 'flex-start', gap: 10 }} className="rise">
      {!me && <span style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--accent)', color: 'var(--accent-ink)', display: 'grid', placeItems: 'center', flexShrink: 0, boxShadow: 'var(--sh-glow)' }}><Icon name="sparkle" size={17} /></span>}
      <div style={{ maxWidth: '76%' }}>
        <div style={{
          padding: '12px 16px', borderRadius: me ? '18px 18px 6px 18px' : '18px 18px 18px 6px',
          background: me ? 'var(--accent)' : '#fff', color: me ? 'var(--accent-ink)' : 'var(--ink)',
          border: me ? 'none' : '1px solid var(--glass-edge)', boxShadow: 'var(--sh-sm)',
          fontSize: 14.5, fontWeight: 500, lineHeight: 1.5,
        }}>{m.text}</div>
        {m.corr && (
          <div style={{ marginTop: 7, padding: '10px 13px', borderRadius: 'var(--r-sm)', background: 'rgba(224,169,59,0.12)', border: '1px solid rgba(224,169,59,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 800, color: '#b5811f', textTransform: 'uppercase', letterSpacing: '0.06em' }}><Icon name="sparkle" size={13} /> Gợi ý sửa</div>
            <div style={{ fontSize: 13.5, marginTop: 5, color: 'var(--ink-2)' }}><s style={{ color: 'var(--bad)' }}>{m.corr.wrong}</s></div>
            <div style={{ fontSize: 13.5, color: 'var(--ink)', fontWeight: 700 }}>{m.corr.right}</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 4 }}>{m.corr.note}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function SpeakingScreen({ go, t }) {
  const [msgs, setMsgs] = useStateS(SEED);
  const [rec, setRec] = useStateS(false);
  const [turn, setTurn] = useStateS(0);
  const [topic, setTopic] = useStateS('weekend');
  const endRef = useRefS(null);
  useEffectS(() => { if (endRef.current) endRef.current.scrollTop = endRef.current.scrollHeight; }, [msgs]);

  const speak = () => {
    if (rec) { // stop -> add user line + ai reply
      const u = USER_LINES[turn % USER_LINES.length];
      setMsgs(m => [...m, { from: 'me', ...u }]);
      setRec(false);
      setTimeout(() => setMsgs(m => [...m, { from: 'ai', text: REPLIES[turn % REPLIES.length].text }]), 700);
      setTurn(x => x + 1);
    } else setRec(true);
  };

  const corrections = msgs.filter(m => m.corr).map(m => m.corr);

  return (
    <div className="screen">
      <TopBar go={go} current="speaking" />
      <div style={{ position: 'absolute', inset: 0, paddingTop: 92, display: 'grid', placeItems: 'center' }}>
        <div style={{ width: 'min(1080px, 95vw)', height: 'min(78vh, 720px)', display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>

          {/* chat panel */}
          <div className="glass" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 'var(--r-xl)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--glass-edge)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <span style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--accent)', color: 'var(--accent-ink)', display: 'grid', placeItems: 'center', boxShadow: 'var(--sh-glow)' }}><Icon name="sparkle" size={19} /></span>
                <div>
                  <div style={{ fontSize: 15.5, fontWeight: 800, color: 'var(--ink)' }}>Trợ lý AI · Luyện nói</div>
                  <div style={{ fontSize: 12, color: 'var(--good)', display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--good)' }}></span> Đang lắng nghe</div>
                </div>
              </div>
              <button className="chip"><Icon name="clock" size={14} /> 04:12</button>
            </div>

            <div ref={endRef} className="scroll" style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {msgs.map((m, i) => <Bubble key={i} m={m} />)}
              {rec && <div style={{ display: 'flex', justifyContent: 'flex-end' }}><div className="chip chip-accent" style={{ gap: 8 }}><span className="pulse-soft" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--bad)' }}></span> Đang ghi âm…</div></div>}
            </div>

            {/* composer */}
            <div style={{ padding: 18, borderTop: '1px solid var(--glass-edge)', display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'center' }}>
              <button className="iconbtn" style={{ background: 'rgba(40,55,30,0.07)', color: 'var(--ink)', border: '1px solid var(--glass-edge)' }} title="Bàn phím"><Icon name="chat" size={18} /></button>
              <button onClick={speak} className={rec ? '' : 'pulse-soft'} style={{
                width: 72, height: 72, borderRadius: '50%', display: 'grid', placeItems: 'center',
                background: rec ? 'var(--bad)' : 'var(--accent)', color: rec ? '#fff' : 'var(--accent-ink)',
                boxShadow: rec ? '0 0 0 8px rgba(217,138,106,0.25)' : 'var(--sh-glow)', transition: 'all 200ms var(--ease)',
              }}><Icon name={rec ? 'pause' : 'mic'} size={28} fill={rec} /></button>
              <button className="iconbtn" style={{ background: 'rgba(40,55,30,0.07)', color: 'var(--ink)', border: '1px solid var(--glass-edge)' }} title="Nghe lại"><Icon name="volume" size={18} /></button>
            </div>
          </div>

          {/* side panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0 }}>
            <div className="glass" style={{ padding: 18 }}>
              <div className="label-cap" style={{ color: 'var(--accent-deep)', marginBottom: 10 }}>Chủ đề hôm nay</div>
              {[['weekend', 'Kể về cuối tuần', 'Hằng ngày'], ['hobby', 'Sở thích của bạn', 'Hằng ngày'], ['travel', 'Chuyến đi đáng nhớ', 'Deep talk']].map(([k, label, cat]) => (
                <button key={k} onClick={() => setTopic(k)} style={{
                  width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  borderRadius: 'var(--r-sm)', marginBottom: 6, transition: 'all 140ms var(--ease)',
                  background: topic === k ? 'rgba(217,232,157,0.5)' : 'transparent',
                  border: topic === k ? '1px solid var(--accent-strong)' : '1px solid transparent',
                }}>
                  <Icon name="chat" size={16} style={{ color: topic === k ? 'var(--accent-deep)' : 'var(--ink-3)' }} />
                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>{label}</span>
                  <span style={{ fontSize: 10.5, color: 'var(--ink-3)', fontWeight: 600 }}>{cat}</span>
                </button>
              ))}
            </div>

            <div className="glass scroll" style={{ padding: 18, flex: 1, overflowY: 'auto', minHeight: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div className="label-cap">Sửa lỗi trực tiếp</div>
                <span className="chip chip-accent" style={{ fontSize: 11 }}>{corrections.length}</span>
              </div>
              {corrections.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--ink-3)', fontSize: 13 }}><Icon name="checkCircle" size={28} style={{ color: 'var(--good)', marginBottom: 8 }} /><div>Chưa có lỗi nào. Tốt lắm!</div></div>
              ) : corrections.map((c, i) => (
                <div key={i} style={{ padding: '11px 13px', borderRadius: 'var(--r-sm)', background: 'rgba(255,255,255,0.6)', border: '1px solid var(--glass-edge)', marginBottom: 8 }}>
                  <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 700 }}>{c.right}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>{c.note}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { SpeakingScreen });
