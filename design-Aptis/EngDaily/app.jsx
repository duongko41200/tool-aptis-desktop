/* global React, ReactDOM, WelcomeScreen, DashboardScreen, SpeakingScreen, WritingScreen, FeedbackScreen, VocabModal, ListeningScreen,
   useTweaks, TweaksPanel, TweakSection, TweakSlider, TweakToggle, TweakRadio, TweakColor */
const { useState, useEffect, useRef } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#d9e89d",
  "overlay": 0.34,
  "glassAlpha": 0.74,
  "glassBlur": 18,
  "rain": true,
  "font": "Plus Jakarta Sans"
}/*EDITMODE-END*/;

const ACCENTS = ['#d9e89d', '#bef264', '#a7e8c4', '#f6c177', '#c7b8f0'];
const accentInk = (hex) => '#2c3a16'; // dark ink reads fine on all chosen pastels

/* ---- Rain / particle layer ---- */
function Rain({ on }) {
  if (!on) return null;
  const drops = React.useMemo(() => Array.from({ length: 46 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 6,
    dur: 3.5 + Math.random() * 4,
    size: 1.5 + Math.random() * 2,
    op: 0.18 + Math.random() * 0.4,
    len: 8 + Math.random() * 16,
  })), []);
  return (
    <div id="rain-layer" aria-hidden="true">
      <style>{`@keyframes ed-fall { 0%{transform:translateY(-12vh);opacity:0} 12%{opacity:1} 88%{opacity:1} 100%{transform:translateY(112vh);opacity:0} }`}</style>
      {drops.map(d => (
        <span key={d.id} style={{
          position: 'absolute', left: d.left + '%', top: 0, width: d.size, height: d.len,
          borderRadius: 9999, background: `linear-gradient(rgba(255,255,255,0), rgba(255,255,255,${d.op}))`,
          animation: `ed-fall ${d.dur}s linear ${d.delay}s infinite`,
        }} />
      ))}
    </div>
  );
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [screen, setScreen] = useState('welcome');
  const [vocab, setVocab] = useState(false);

  // apply tweaks -> CSS vars
  useEffect(() => {
    const r = document.documentElement.style;
    r.setProperty('--accent', t.accent);
    // derive hover/deep shades
    r.setProperty('--accent-strong', shade(t.accent, -8));
    r.setProperty('--accent-deep', shade(t.accent, -20));
    r.setProperty('--accent-ink', accentInk(t.accent));
    r.setProperty('--overlay', String(t.overlay));
    r.setProperty('--glass-alpha', String(t.glassAlpha));
    r.setProperty('--glass-blur', t.glassBlur + 'px');
    r.setProperty('--font', `'${t.font}', ui-sans-serif, system-ui, sans-serif`);
  }, [t]);

  const go = (s) => { if (s === 'vocab') { setVocab(true); return; } setScreen(s); window.scrollTo(0, 0); };

  const Screen = { welcome: WelcomeScreen, dashboard: DashboardScreen, speaking: SpeakingScreen, writing: WritingScreen, feedback: FeedbackScreen, listening: ListeningScreen }[screen] || WelcomeScreen;

  return (
    <div id="stage">
      <div id="bg-layer">
        <image-slot id="engdaily-bg" shape="rect" fit="cover" placeholder="Thả ảnh nền lofi của bạn vào đây (phòng học, quán cà phê, mưa…)"></image-slot>
      </div>
      <div id="bg-overlay"></div>
      <Rain on={t.rain} />
      <div id="app-root">
        <Screen go={go} t={t} />
        {vocab && <VocabModal onClose={() => setVocab(false)} />}
      </div>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Màu sắc" />
        <TweakColor label="Accent" value={t.accent} options={ACCENTS} onChange={(v) => setTweak('accent', v)} />
        <TweakSection label="Không khí" />
        <TweakSlider label="Độ tối nền" value={t.overlay} min={0} max={0.7} step={0.02} onChange={(v) => setTweak('overlay', v)} />
        <TweakToggle label="Hiệu ứng mưa/hạt" value={t.rain} onChange={(v) => setTweak('rain', v)} />
        <TweakSection label="Glass" />
        <TweakSlider label="Độ đậm kính" value={t.glassAlpha} min={0.4} max={0.92} step={0.02} onChange={(v) => setTweak('glassAlpha', v)} />
        <TweakSlider label="Độ mờ (blur)" value={t.glassBlur} min={4} max={30} step={1} unit="px" onChange={(v) => setTweak('glassBlur', v)} />
        <TweakSection label="Chữ" />
        <TweakRadio label="Font" value={t.font} options={["Plus Jakarta Sans", "Nunito", "Space Grotesk"]} onChange={(v) => setTweak('font', v)} />
      </TweaksPanel>
    </div>
  );
}

// lighten/darken a hex by pct (negative = darker)
function shade(hex, pct) {
  const n = parseInt(hex.replace('#', ''), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = pct / 100;
  const adj = (c) => Math.max(0, Math.min(255, Math.round(c + (f < 0 ? c * f : (255 - c) * f))));
  return '#' + [adj(r), adj(g), adj(b)].map(c => c.toString(16).padStart(2, '0')).join('');
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
