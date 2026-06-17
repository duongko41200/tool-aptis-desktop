import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from './store';
import { useQueryClient } from '@tanstack/react-query';
import { listen } from '@tauri-apps/api/event';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import bgGif from './public/img/1_1IDOLADBDduPo-kjXpeGAA.gif';
import bgMusic from './public/mp3/lofi_hour-just-chill-114854.mp3';
import { setOnlineStatus } from './store/appSlice';
import { tick, timerComplete, setIsRinging } from './store/pomodoroSlice';
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
import ActivationPage        from './pages/ActivationPage';
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
  const isActivated = useSelector((state: RootState) => state.app.isActivated);
  
  // Pomodoro Global State & Timer
  const { running: pomoRunning, left: pomoLeft, mode: pomoMode, volume: pomoVolume, musicEnabled: pomoMusicEnabled, musicVolume: pomoMusicVolume } = useSelector((state: RootState) => state.pomodoro);
  const [toast, setToast] = useState<{title: string, body: string, visible: boolean} | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = pomoMusicVolume / 100;
    }
  }, [pomoMusicVolume]);

  const pomoMusicEnabledRef = useRef(pomoMusicEnabled);
  pomoMusicEnabledRef.current = pomoMusicEnabled;

  useEffect(() => {
    const playAudio = async () => {
      if (!audioRef.current) return;
      try {
        await audioRef.current.play();
      } catch (err: any) {
        if (err.name === 'NotAllowedError') {
          const onInteract = () => {
            if (pomoMusicEnabledRef.current) audioRef.current?.play().catch(()=>{});
            window.removeEventListener('click', onInteract);
            window.removeEventListener('keydown', onInteract);
          };
          window.addEventListener('click', onInteract);
          window.addEventListener('keydown', onInteract);
        }
      }
    };

    if (pomoMusicEnabled) {
      playAudio();
    } else {
      audioRef.current?.pause();
    }
  }, [pomoMusicEnabled]);

  useEffect(() => {
    if (!pomoRunning) return;
    const id = setInterval(() => {
      dispatch(tick());
    }, 1000);
    return () => clearInterval(id);
  }, [pomoRunning, dispatch]);

  const pomoVolumeRef = useRef(pomoVolume);
  pomoVolumeRef.current = pomoVolume;
  const pomoModeRef = useRef(pomoMode);
  pomoModeRef.current = pomoMode;

  useEffect(() => {
    if (pomoRunning && pomoLeft === 0) {
      dispatch(timerComplete());
      
      // Trigger ring animation
      dispatch(setIsRinging(true));
      setTimeout(() => dispatch(setIsRinging(false)), 3000);

      // Play Beep Alarm
      if (pomoVolumeRef.current > 0) {
        try {
          const vol = pomoVolumeRef.current / 100;
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          
          const playBeep = (time: number, duration: number) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'square';
            osc.frequency.setValueAtTime(880, time);
            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(vol, time + 0.01);
            gain.gain.setValueAtTime(vol, time + duration - 0.01);
            gain.gain.linearRampToValueAtTime(0, time + duration);
            osc.start(time);
            osc.stop(time + duration);
          };

          const now = audioCtx.currentTime;
          for (let i = 0; i < 3; i++) {
            const baseTime = now + i * 1.2;
            playBeep(baseTime + 0.0, 0.12);
            playBeep(baseTime + 0.2, 0.12);
            playBeep(baseTime + 0.4, 0.12);
            playBeep(baseTime + 0.6, 0.12);
          }
        } catch(e) {}
      }

      // App Toast
      const modeNames: Record<string, string> = { focus: 'Tập trung', short: 'Nghỉ ngắn', long: 'Nghỉ dài' };
      const modeName = modeNames[pomoModeRef.current] || 'Pomodoro';
      window.dispatchEvent(new CustomEvent('app-toast', { 
        detail: { title: 'Hết giờ!', body: `Đã hoàn thành phiên ${modeName}.` } 
      }));
    }
  }, [pomoLeft, pomoRunning, dispatch]);

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

  // Check for Auto-Updates
  useEffect(() => {
    async function checkForUpdates() {
      try {
        const update = await check();
        if (update) {
          console.log(`[Auto-Update] Tìm thấy bản cập nhật mới: ${update.version}`);
          setToast({
            title: 'Đang cập nhật ứng dụng...',
            body: `Đã tìm thấy bản cập nhật ${update.version}. Vui lòng không tắt máy, ứng dụng sẽ tự khởi động lại khi tải xong.`,
            visible: true
          });
          
          await update.downloadAndInstall();
          await relaunch();
        }
      } catch (err) {
        console.error('[Auto-Update] Lỗi khi kiểm tra cập nhật:', err);
        setToast({
          title: 'Lỗi cập nhật',
          body: 'Không thể cài đặt bản cập nhật. Vui lòng kiểm tra lại đường truyền hoặc link tải.',
          visible: true
        });
        setTimeout(() => setToast(null), 5000);
      }
    }
    checkForUpdates();
  }, []);

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
      {isActivated && <TweaksPanel />}
      <div className="lofi-app-root">
        <Routes>
          {!isActivated ? (
            <>
              <Route path="/activation" element={<ActivationPage />} />
              <Route path="*" element={<Navigate to="/activation" replace />} />
            </>
          ) : (
            <>
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
              <Route path="/activation"        element={<Navigate to="/" replace />} />
              <Route path="*"                  element={<Navigate to="/" replace />} />
            </>
          )}
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
      
      {/* Background Focus Music */}
      <audio 
        ref={audioRef} 
        src={bgMusic} 
        loop 
        preload="none"
      />
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
