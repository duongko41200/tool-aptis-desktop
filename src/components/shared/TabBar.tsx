import { useDispatch, useSelector } from 'react-redux';
import { setActiveTab } from '../../store/appSlice';
import type { RootState } from '../../store';

const TABS = [
  { id: 'shadowing', label: 'Shadowing', icon: '🎬' },
  { id: 'teleprompter', label: 'Teleprompter', icon: '📺' },
  { id: 'writing', label: 'Writing', icon: '✍️' },
  { id: 'vocabulary', label: 'Vocabulary', icon: '📚' },
  { id: 'clipboard', label: 'Clipboard', icon: '📋' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function TabBar() {
  const dispatch = useDispatch();
  const activeTab = useSelector((state: RootState) => state.app.activeTab);

  return (
    <nav className="flex border-b border-gray-200 bg-white shadow-sm">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => dispatch(setActiveTab(tab.id as TabId))}
          className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium transition-colors relative
            ${activeTab === tab.id
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-800'
            }`}
        >
          <span>{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
