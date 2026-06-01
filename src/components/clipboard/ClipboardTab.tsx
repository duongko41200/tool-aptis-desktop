import { useState, useEffect } from 'react';
import { toggleClipboardMonitoring, getClipboardStatus } from '../../services/tauriCommands';
import { useSearchContent } from '../../hooks/useCapturedContent';
import SearchBar from './SearchBar';
import ContentLibrary from './ContentLibrary';
import type { SearchContentParams } from '../../types';

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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Monitor toggle bar */}
      <div className="glass-card-dark" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', margin: '12px 16px 0', borderRadius: 12 }}>
        <div
          className={`lofi-toggle ${monitoringEnabled ? 'on' : 'off'}`}
          onClick={handleToggleMonitoring}
        >
          <div className="lofi-toggle-thumb" />
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: monitoringEnabled ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
          {monitoringEnabled ? 'Clipboard monitoring ON' : 'Clipboard monitoring OFF'}
        </span>
      </div>

      <div style={{ padding: '0 16px' }}>
        <SearchBar onChange={setFilters} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
        <ContentLibrary
          items={data?.items ?? []}
          total={data?.total ?? 0}
          loading={isLoading}
        />
      </div>
    </div>
  );
}
