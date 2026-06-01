import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setOnlineStatus } from './store/appSlice';
import type { RootState } from './store';
import TabBar from './components/shared/TabBar';
import ShadowingTab from './components/speaking/ShadowingTab';
import TeleprompterTab from './components/speaking/TeleprompterTab';
import WritingTab from './components/writing/WritingTab';
import VocabularyTab from './components/vocabulary/VocabularyTab';
import ClipboardTab from './components/clipboard/ClipboardTab';
import SettingsScreen from './components/shared/SettingsScreen';
import ErrorBoundary from './components/shared/ErrorBoundary';

function Particles() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const count = 30;
    const bubbles: HTMLDivElement[] = [];
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'bubble';
      const size = 6 + Math.floor(i * 0.47 * 14);
      el.style.cssText = `
        width:${size}px; height:${size}px;
        left:${(i * 37 + 11) % 100}%;
        bottom:${(i * 23 + 5) % 35}%;
        animation-duration:${5 + (i % 5)}s;
        animation-delay:${(i * 0.4) % 5}s;
      `;
      container.appendChild(el);
      bubbles.push(el);
    }
    return () => { bubbles.forEach(b => b.remove()); };
  }, []);

  return <div className="lofi-particles" ref={containerRef} />;
}

export default function App() {
  const dispatch = useDispatch();
  const activeTab = useSelector((state: RootState) => state.app.activeTab);

  useEffect(() => {
    const handleOnline = () => dispatch(setOnlineStatus(true));
    const handleOffline = () => dispatch(setOnlineStatus(false));
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [dispatch]);

  return (
    <div className="lofi-app">
      <div className="lofi-bg" />
      <Particles />
      <div className="lofi-content">
        <TabBar />
        <main className="flex-1 overflow-auto">
          <ErrorBoundary>
            {activeTab === 'shadowing' && <ShadowingTab />}
            {activeTab === 'teleprompter' && <TeleprompterTab />}
            {activeTab === 'writing' && <WritingTab />}
            {activeTab === 'vocabulary' && <VocabularyTab />}
            {activeTab === 'clipboard' && <ClipboardTab />}
            {activeTab === 'settings' && <SettingsScreen />}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
