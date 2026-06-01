import { useState } from 'react';
import { toggleClipboardMonitoring, getClipboardStatus } from '../../services/tauriCommands';
import { useSearchContent } from '../../hooks/useCapturedContent';
import SearchBar from './SearchBar';
import ContentLibrary from './ContentLibrary';
import type { SearchContentParams } from '../../types';
import { useEffect } from 'react';

export default function ClipboardTab() {
  const [filters, setFilters] = useState<SearchContentParams>({});
  const [monitoringEnabled, setMonitoringEnabled] = useState(false);
  const { data, isLoading } = useSearchContent(filters);

  useEffect(() => {
    getClipboardStatus().then((s) => setMonitoringEnabled(s.enabled)).catch(() => {});
  }, []);

  const handleToggleMonitoring = async () => {
    const newState = !monitoringEnabled;
    await toggleClipboardMonitoring(newState);
    setMonitoringEnabled(newState);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-2 border-b bg-white">
        <label className="flex items-center gap-2 cursor-pointer">
          <div
            onClick={handleToggleMonitoring}
            className={`w-10 h-6 rounded-full transition-colors ${monitoringEnabled ? 'bg-green-500' : 'bg-gray-300'} relative`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${monitoringEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
          </div>
          <span className="text-sm font-medium">
            {monitoringEnabled ? 'Clipboard monitoring ON' : 'Clipboard monitoring OFF'}
          </span>
        </label>
      </div>
      <SearchBar onChange={setFilters} />
      <div className="flex-1 overflow-y-auto">
        <ContentLibrary
          items={data?.items ?? []}
          total={data?.total ?? 0}
          loading={isLoading}
        />
      </div>
    </div>
  );
}
