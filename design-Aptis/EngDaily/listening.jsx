/* global React, Icon, TopBar, PomodoroWidget */
const { useState: useStateL, useRef: useRefL } = React;

// Sample lesson transcript (replaceable). Timestamps in seconds.
const TRANSCRIPT = [
  { t: 2, en: "Good morning! Today I want to talk about my daily routine." },
  { t: 8, en: "I usually wake up around six thirty in the morning." },
  { t: 13, en: "The first thing I do is make a warm cup of coffee." },
  { t: 19, en: "Then I sit by the window and read for twenty minutes." },
  { t: 25, en: "It's a calm, serene way to start the day." },
  { t: 30, en: "After that, I go for a short walk in the park." },
  { t: 36, en: "The fresh air helps me feel focused and relaxed." },
  { t: 42, en: "When I get home, I'm ready to study English." },
  { t: 48, en: "I believe small habits make a big difference over time." }
];
const YT_ID = 'jfKfPfyJRdk'; // placeholder lofi stream — swap for your lesson video
const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9\s']/g, '').replace(/\s+/g, ' ').trim();

function AudioPlayer({ playing, onToggle, line }) {
  return (
    <div style={{ aspectRatio: '16 / 9', width: '100%', borderRadius: 'var(--r-lg)', overflow: 'hidden', position: 'relative',
      background: 'linear-gradient(150deg, #3a4a2c, #586b3f 55%, #6e6450)', display: 'grid', placeItems: 'center' }}>
      {/* soft bars */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, opacity: 0.5 }}>
        {Array.from({ length: 32 }).map((_, i) =>
        <span key={i} style={{ width: 5, height: (12 + Math.abs(Math.sin(i * 0.7)) * 64) + 'px', borderRadius: 9999, background: 'rgba(217,232,157,0.7)', animation: playing ? `eq 1.${i % 6}s ease-in-out ${i * 40}ms infinite alternate` : 'none' }} />
        )}
      </div>
      <style>{`@keyframes eq{from{transform:scaleY(0.4)}to{transform:scaleY(1)}}`}</style>
      <div style={{ position: 'relative', textAlign: 'center', color: '#fff' }}>
        <button onClick={onToggle} className="pulse-soft" style={{ width: 76, height: 76, borderRadius: '50%', background: 'var(--accent)', color: 'var(--accent-ink)', display: 'grid', placeItems: 'center', boxShadow: 'var(--sh-glow)', margin: '0 auto' }}>
          <Icon name={playing ? 'pause' : 'play'} size={32} fill={!playing} />
        </button>
        <div className="text-shadow" style={{ marginTop: 14, fontSize: 14, fontWeight: 700 }}>Audio · Daily routine</div>
        <div className="text-shadow" style={{ fontSize: 12, opacity: 0.8 }}>Chỉ âm thanh — không có hình</div>
      </div>
    </div>);

}

function ListeningScreen({ go, t }) {
  const [showT, setShowT] = useStateL(true);
  const [media, setMedia] = useStateL('video'); // 'video' | 'audio'
  const [active, setActive] = useStateL(0);
  const [pinned, setPinned] = useStateL([4]);
  const [dict, setDict] = useStateL('');
  const [checked, setChecked] = useStateL(false);
  const [playing, setPlaying] = useStateL(false);

  const target = TRANSCRIPT[active];
  const togglePin = (i) => setPinned((p) => p.includes(i) ? p.filter((x) => x !== i) : [...p, i]);
  const pick = (i) => {setActive(i);setChecked(false);setDict('');};

  // dictation scoring
  const result = (() => {
    if (!checked) return null;
    const tw = norm(target.en).split(' ');
    const uw = norm(dict).split(' ').filter(Boolean);
    const correct = tw.filter((w, idx) => uw[idx] === w).length;
    return { correct, total: tw.length, words: tw.map((w, idx) => ({ w, ok: uw[idx] === w })) };
  })();

  return (
    <div className="screen">
      <TopBar go={go} current="listening" />
      <div style={{ position: 'absolute', inset: 0, paddingTop: 92, display: 'grid', placeItems: 'center' }}>
        <div style={{ width: 'min(1180px, 96vw)', height: 'min(82vh, 760px)', display: 'grid', gridTemplateColumns: showT ? '1fr 360px' : '1fr', gap: 16, transition: 'grid-template-columns 280ms var(--ease)' }}>

          {/* LEFT: media + dictation */}
          <div className="glass scroll" style={{ borderRadius: 'var(--r-xl)', overflow: 'hidden', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {/* header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--glass-edge)', position: 'sticky', top: 0, background: 'var(--glass)', zIndex: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <span style={{ width: 38, height: 38, borderRadius: 'var(--r-sm)', background: 'var(--accent)', color: 'var(--accent-ink)', display: 'grid', placeItems: 'center', boxShadow: 'var(--sh-glow)' }}><Icon name="headphones" size={20} /></span>
                <div>
                  <div style={{ fontSize: 15.5, fontWeight: 800, color: 'var(--ink)' }}>Luyện nghe</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>Bài 4 · Daily routine · ~5 phút</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="glass-2" style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 'var(--r-pill)' }}>
                  {[['video', 'video', 'Video'], ['audio', 'music', 'Audio']].map(([k, ic, label]) =>
                  <button key={k} onClick={() => setMedia(k)} style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 'var(--r-pill)', fontSize: 12.5, fontWeight: 700,
                    color: media === k ? 'var(--accent-ink)' : 'var(--ink-2)', background: media === k ? 'var(--accent)' : 'transparent', transition: 'all 160ms var(--ease)'
                  }}><Icon name={ic} size={14} /> {label}</button>
                  )}
                </div>
                <button onClick={() => setShowT((s) => !s)} className="chip" style={{ fontSize: 12.5 }} title="Ẩn/hiện lời thoại">
                  <Icon name="list" size={14} /> {showT ? 'Ẩn lời thoại' : 'Hiện lời thoại'}
                </button>
              </div>
            </div>

            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* media */}
              {media === 'video' ?
              <div style={{ aspectRatio: '16 / 9', width: '100%', borderRadius: 'var(--r-lg)', overflow: 'hidden', background: '#000', boxShadow: 'var(--sh-md)' }}>
                  <iframe width="100%" height="100%" src={`https://www.youtube-nocookie.com/embed/${YT_ID}?rel=0&modestbranding=1`}
                  title="Listening video" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ display: 'block', border: 0 }}></iframe>
                </div> :

              <AudioPlayer playing={playing} onToggle={() => setPlaying((p) => !p)} line={target} />
              }

              {/* dictation */}
              <div className="glass-2" style={{ padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div className="label-cap" style={{ color: 'var(--accent-deep)', whiteSpace: 'nowrap' }}><Icon name="pencil" size={13} /> Chép chính tả</div>
                  <span className="chip" style={{ fontSize: 11.5, fontFamily: 'var(--font-mono)' }}>Câu {active + 1}/{TRANSCRIPT.length} · {fmt(target.t)}</span>
                </div>
                <p style={{ fontSize: 12.5, color: 'var(--ink-3)', margin: '0 0 10px' }}>Nghe câu được chọn và gõ lại chính xác những gì bạn nghe được.</p>
                <textarea value={dict} onChange={(e) => {setDict(e.target.value);setChecked(false);}}
                placeholder="Gõ lại câu bạn nghe được…"
                style={{ width: '100%', minHeight: 70, resize: 'vertical', borderRadius: 'var(--r-sm)', border: '1px solid var(--glass-edge)', background: 'rgba(255,255,255,0.65)', padding: '11px 13px', fontSize: 15, lineHeight: 1.5, fontFamily: 'var(--font)', color: 'var(--ink)', outline: 'none', boxSizing: 'border-box' }} />

                {result &&
                <div style={{ marginTop: 10, padding: '11px 13px', borderRadius: 'var(--r-sm)', background: result.correct === result.total ? 'rgba(111,174,90,0.14)' : 'rgba(224,169,59,0.12)', border: `1px solid ${result.correct === result.total ? 'rgba(111,174,90,0.4)' : 'rgba(224,169,59,0.35)'}` }}>
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: result.correct === result.total ? '#4e8a3c' : '#b5811f', marginBottom: 6 }}>
                      {result.correct === result.total ? 'Chính xác! 🌿' : `Đúng ${result.correct}/${result.total} từ`}
                    </div>
                    <div style={{ fontSize: 14.5, lineHeight: 1.6 }}>
                      {result.words.map((x, i) =>
                    <span key={i} style={{ color: x.ok ? 'var(--good)' : 'var(--bad)', fontWeight: x.ok ? 600 : 700, textDecoration: x.ok ? 'none' : 'underline' }}>{x.w}{' '}</span>
                    )}
                    </div>
                  </div>
                }

                <div style={{ display: 'flex', gap: 9, marginTop: 12 }}>
                  <button onClick={() => {setPlaying(true);}} className="btn btn-soft btn-sm"><Icon name="volume" size={15} /> Nghe lại câu</button>
                  <button onClick={() => togglePin(active)} className="btn btn-soft btn-sm"><Icon name="bookmark" size={15} fill={pinned.includes(active)} /> {pinned.includes(active) ? 'Bỏ gim' : 'Gim câu'}</button>
                  <button onClick={() => setChecked(true)} className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} disabled={!dict.trim()}><Icon name="check" size={15} /> Kiểm tra</button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Pomodoro + transcript */}
          {showT &&
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
            <PomodoroWidget compact />
          <div className="glass rise" style={{ flex: 1, borderRadius: 'var(--r-xl)', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', borderBottom: '1px solid var(--glass-edge)' }}>
                <div className="label-cap" style={{ whiteSpace: 'nowrap' }}>Lời thoại</div>
                <span className="chip" style={{ fontSize: 11.5 }}>{TRANSCRIPT.length} câu</span>
              </div>

              <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
                {pinned.length > 0 &&
              <div style={{ marginBottom: 12 }}>
                    <div className="label-cap" style={{ color: 'var(--accent-deep)', margin: '0 4px 8px' }}><Icon name="bookmark" size={12} fill /> Câu đã gim</div>
                    {pinned.slice().sort((a, b) => a - b).map((i) =>
                <button key={i} onClick={() => pick(i)} style={{ width: '100%', textAlign: 'left', display: 'flex', gap: 9, padding: '9px 11px', borderRadius: 'var(--r-sm)', background: 'rgba(217,232,157,0.4)', border: '1px solid rgba(170,203,79,0.4)', marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--accent-deep)', fontWeight: 700, paddingTop: 2 }}>{fmt(TRANSCRIPT[i].t)}</span>
                        <span style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.45, fontWeight: 600 }}>{TRANSCRIPT[i].en}</span>
                      </button>
                )}
                    <div className="divider" style={{ margin: '12px 4px 0' }}></div>
                  </div>
              }

                {TRANSCRIPT.map((line, i) => {
                const on = i === active;
                return (
                  <div key={i} onClick={() => pick(i)} style={{
                    display: 'flex', gap: 9, padding: '10px 11px', borderRadius: 'var(--r-sm)', cursor: 'pointer', marginBottom: 3,
                    background: on ? 'rgba(217,232,157,0.45)' : 'transparent', border: on ? '1px solid var(--accent-strong)' : '1px solid transparent',
                    transition: 'all 140ms var(--ease)'
                  }}
                  onMouseEnter={(e) => {if (!on) e.currentTarget.style.background = 'rgba(40,55,30,0.05)';}}
                  onMouseLeave={(e) => {if (!on) e.currentTarget.style.background = 'transparent';}}>
                      <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: on ? 'var(--accent-deep)' : 'var(--ink-3)', fontWeight: 700, paddingTop: 2, minWidth: 34 }}>{fmt(line.t)}</span>
                      <span style={{ flex: 1, fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.5, fontWeight: on ? 600 : 500 }}>{line.en}</span>
                      <button onClick={(e) => {e.stopPropagation();togglePin(i);}} title="Gim câu" style={{ color: pinned.includes(i) ? 'var(--accent-deep)' : 'var(--ink-3)', padding: 2, flexShrink: 0 }}>
                        <Icon name="bookmark" size={15} fill={pinned.includes(i)} />
                      </button>
                    </div>);

              })}
              </div>
            </div>
          </div>
          </div>}
        </div>
      </div>
    </div>);

}

Object.assign(window, { ListeningScreen });
