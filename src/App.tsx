import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useQueryClient } from '@tanstack/react-query';
import { listen } from '@tauri-apps/api/event';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import bgGif from './public/img/1_1IDOLADBDduPo-kjXpeGAA.gif';
import { setOnlineStatus } from './store/appSlice';
import { initNotificationWatcher } from './services/notification-service';
import { enable, isEnabled } from '@tauri-apps/plugin-autostart';

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
import RagChatPage           from './pages/RagChatPage';
import CalendarPage          from './pages/CalendarPage';
import Icon from './components/common/Icon';

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
  const navigate = useNavigate();
  const [toast, setToast] = useState<{title: string, body: string, visible: boolean} | null>(null);

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

  // Init Notifications Watcher & Autostart
  useEffect(() => {
    initNotificationWatcher();

    // Enable auto-start with Windows
    isEnabled().then(enabled => {
      if (!enabled) {
        enable().catch(console.error);
      }
    }).catch(console.error);

    const handleNavigate = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        navigate(customEvent.detail);
      }
    };

    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent<{title: string, body: string}>;
      if (customEvent.detail) {
        setToast({ ...customEvent.detail, visible: true });
        try {
          const audio = new Audio('/src/public/sounds/notification.mp3');
          audio.volume = 0.5;
          audio.play().catch(() => {});
        } catch(e) {}
        setTimeout(() => {
          setToast(prev => prev ? { ...prev, visible: false } : null);
        }, 5000);
      }
    };

    window.addEventListener('calendar-navigate', handleNavigate);
    window.addEventListener('app-toast', handleToast);
    
    return () => {
      window.removeEventListener('calendar-navigate', handleNavigate);
      window.removeEventListener('app-toast', handleToast);
    };
  }, [navigate]);

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
          <Route path="/rag-chat"           element={<RagChatPage />} />
          <Route path="/calendar"           element={<CalendarPage />} />
          <Route path="/tools"             element={<Navigate to="/tools/vocabulary" replace />} />
          <Route path="/tools/:tab"        element={<ToolsPage />} />
          <Route path="*"                  element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      {/* IN-APP TOAST NOTIFICATION */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: 30,
          right: 30,
          background: 'var(--ink)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 'var(--r-lg)',
          padding: '16px 20px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
          zIndex: 99999,
          maxWidth: 350,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          transform: toast.visible ? 'translateY(0)' : 'translateY(20px)',
          opacity: toast.visible ? 1 : 0,
          transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          pointerEvents: toast.visible ? 'auto' : 'none'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#D9E89D', color: '#1D3325', display: 'grid', placeItems: 'center', boxShadow: '0 0 15px rgba(217, 232, 157, 0.4)' }}>
              <Icon name="bell" size={18} />
            </div>
            <strong style={{ fontSize: 16, color: '#ffffff', fontWeight: 700 }}>{toast.title}</strong>
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.5, marginLeft: 48, fontWeight: 500 }}>
            {toast.body}
          </div>
        </div>
      )}
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
