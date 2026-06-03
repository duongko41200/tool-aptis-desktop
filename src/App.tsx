import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useQueryClient } from '@tanstack/react-query';
import { listen } from '@tauri-apps/api/event';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import bgGif from './public/img/1_1IDOLADBDduPo-kjXpeGAA.gif';
import { setOnlineStatus } from './store/appSlice';

import { TweaksProvider, useTweaks } from './contexts/TweaksContext';
import TweaksPanel                   from './components/shared/TweaksPanel';
import WelcomePage           from './pages/WelcomePage';
import DashboardPage         from './pages/DashboardPage';
import SpeakingPage          from './pages/SpeakingPage';
import WritingPage           from './pages/WritingPage';
import WritingFeedbackPage   from './pages/WritingFeedbackPage';
import ToolsPage             from './pages/ToolsPage';
import VocabPage             from './pages/VocabPage';
import ListeningPage         from './pages/ListeningPage';

/* ── Rain particle effect ───────────────────────────── */
function Rain() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const count = 46;
    type Drop = { el: HTMLDivElement; x: number; y: number; vy: number; vx: number };
    let drops: Drop[] = [];

    const init = () => {
      drops.forEach(d => d.el.remove());
      drops = Array.from({ length: count }, () => {
        const el = document.createElement('div');
        const w = 1.2 + Math.random() * 0.8;
        const h = 6 + Math.random() * 12;
        el.className = 'particle';
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        el.style.cssText = `width:${w}px;height:${h}px;left:${x}%;top:${y}%;opacity:${0.15 + Math.random() * 0.35};`;
        c.appendChild(el);
        return { el, x, y, vy: 1.4 + Math.random() * 2.4, vx: 0.15 + Math.random() * 0.3 };
      });
    };
    init();

    let raf: number;
    const tick = () => {
      drops.forEach(d => {
        d.x += d.vx * 0.12;
        d.y += d.vy * 0.22;
        if (d.y > 102) { d.y = -4; d.x = Math.random() * 100; }
        if (d.x > 102)   d.x = -2;
        d.el.style.left = d.x + '%';
        d.el.style.top  = d.y + '%';
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      drops.forEach(d => d.el.remove());
    };
  }, []);
  return <div id="rain-layer" ref={ref} />;
}

/* ── App shell with routing ─────────────────────────── */
function AppShell() {
  const dispatch = useDispatch();
  const qc = useQueryClient();
  const { tweaks } = useTweaks();

  useEffect(() => {
    const up   = () => dispatch(setOnlineStatus(true));
    const down = () => dispatch(setOnlineStatus(false));
    window.addEventListener('online',  up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online',  up);
      window.removeEventListener('offline', down);
    };
  }, [dispatch]);

  // Sync cache when popup creates decks or notes
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen('anki:data-changed', () => {
      qc.invalidateQueries({ queryKey: ['anki-decks'] });
      qc.invalidateQueries({ queryKey: ['anki-notes'] });
      qc.invalidateQueries({ queryKey: ['anki-due'] });
    }).then(fn => { unlisten = fn; });
    return () => { unlisten?.(); };
  }, [qc]);

  return (
    <div className="lofi-stage">
      {/* Background layers */}
      <div className="lofi-bg" style={{ backgroundImage: `url(${bgGif})` }} />
      <div className="lofi-overlay" />
      {tweaks.rain && <Rain />}

      {/* Routed screens */}
      <TweaksPanel />
      <div className="lofi-app-root">
        <Routes>
          <Route path="/"                  element={<WelcomePage />} />
          <Route path="/dashboard"         element={<DashboardPage />} />
          <Route path="/speaking"          element={<SpeakingPage />} />
          <Route path="/writing"           element={<WritingPage />} />
          <Route path="/writing/feedback"  element={<WritingFeedbackPage />} />
          <Route path="/vocab"             element={<VocabPage />} />
          <Route path="/listening"        element={<ListeningPage />} />
          <Route path="/tools"             element={<Navigate to="/tools/vocabulary" replace />} />
          <Route path="/tools/:tab"        element={<ToolsPage />} />
          <Route path="*"                  element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <TweaksProvider>
        <AppShell />
      </TweaksProvider>
    </BrowserRouter>
  );
}
