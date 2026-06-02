import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { setActiveTab } from '../store/appSlice';
import type { RootState } from '../store';
import ShadowingTab from '../components/speaking/ShadowingTab';
import TeleprompterTab from '../components/speaking/TeleprompterTab';
import WritingTab from '../components/writing/WritingTab';
import VocabularyTab from '../components/vocabulary/VocabularyTab';
import ClipboardTab from '../components/clipboard/ClipboardTab';
import SettingsScreen from '../components/shared/SettingsScreen';
import ErrorBoundary from '../components/shared/ErrorBoundary';
import Icon from '../components/common/Icon';

const TABS = [
  { id: 'shadowing',   icon: 'headphones', label: 'Shadowing'  },
  { id: 'teleprompter',icon: 'mic',        label: 'Teleprompter'},
  { id: 'writing',     icon: 'pencil',     label: 'Viết'       },
  { id: 'vocabulary',  icon: 'cards',      label: 'Từ vựng'    },
  { id: 'clipboard',   icon: 'clipboard',  label: 'Clipboard'  },
  { id: 'settings',    icon: 'settings',   label: 'Cài đặt'    },
] as const;

type TabId = typeof TABS[number]['id'];

export default function ToolsPage() {
  const navigate = useNavigate();
  const params = useParams<{ tab?: string }>();
  const dispatch = useDispatch();
  const reduxTab = useSelector((s: RootState) => s.app.activeTab);

  const activeTab = (params.tab as TabId) ?? reduxTab ?? 'vocabulary';

  const setTab = (id: TabId) => {
    dispatch(setActiveTab(id));
    navigate(`/tools/${id}`);
  };

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      {/* Compact topbar for tools */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 18px', background: 'rgba(28,36,24,0.72)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.1)', flexShrink: 0, zIndex: 10 }}>
        <button
          onClick={() => navigate('/dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.7)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
        >
          <Icon name="chevL" size={16} /> Dashboard
        </button>
        <nav style={{ display: 'flex', gap: 2 }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 'var(--r-pill)',
                fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 150ms var(--ease)',
                color: activeTab === t.id ? 'var(--accent-ink)' : 'rgba(255,255,255,0.7)',
                background: activeTab === t.id ? 'var(--accent)' : 'transparent',
              }}
            >
              <Icon name={t.icon} size={15} />
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
        <div style={{ width: 100 }} />
      </div>

      <main style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        <ErrorBoundary>
          {activeTab === 'shadowing'    && <ShadowingTab />}
          {activeTab === 'teleprompter' && <TeleprompterTab />}
          {activeTab === 'writing'      && <WritingTab />}
          {activeTab === 'vocabulary'   && <VocabularyTab />}
          {activeTab === 'clipboard'    && <ClipboardTab />}
          {activeTab === 'settings'     && <SettingsScreen />}
        </ErrorBoundary>
      </main>
    </div>
  );
}
