import { useDispatch, useSelector } from 'react-redux';
import { setActiveTab } from '../../store/appSlice';
import type { RootState } from '../../store';

const TABS = [
  { id: 'shadowing',    label: 'Shadowing',    icon: '🎬' },
  { id: 'teleprompter', label: 'Teleprompter', icon: '📺' },
  { id: 'writing',      label: 'Writing',      icon: '✍️' },
  { id: 'vocabulary',   label: 'Vocabulary',   icon: '📚' },
  { id: 'clipboard',    label: 'Clipboard',    icon: '📋' },
  { id: 'settings',     label: 'Settings',     icon: '⚙️' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function TabBar() {
  const dispatch = useDispatch();
  const activeTab = useSelector((state: RootState) => state.app.activeTab);

  return (
    <nav className="lofi-tabbar">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => dispatch(setActiveTab(tab.id as TabId))}
          className={`lofi-tab ${activeTab === tab.id ? 'active' : ''}`}
        >
          <span style={{ fontSize: '1rem' }}>{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
