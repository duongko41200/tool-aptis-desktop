import { useEffect } from 'react';
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
// SavePopup replaced by standalone popup window (002-clipboard-copy-popup)
// import SavePopup from './components/clipboard/SavePopup';

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
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900">
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
      {/* Popup handled by standalone clipboard-popup window */}
    </div>
  );
}
