import { useRef, useEffect, useState } from 'react';
import { updateSubtitleEntry } from '../../services/tauriCommands';
import type { SubtitleEntry } from '../../types';

interface Props {
  subtitles: SubtitleEntry[];
  currentTimeMs: number;
  onSubtitleChange: (id: number, text: string) => void;
}

function msToTime(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  return `${String(h).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export default function SubtitleEditor({ subtitles, currentTimeMs, onSubtitleChange }: Props) {
  const [editing, setEditing] = useState<Record<number, string>>({});
  const activeRef = useRef<HTMLDivElement | null>(null);

  const activeIdx = subtitles.findIndex(
    (s) => currentTimeMs >= s.start_ms && currentTimeMs <= s.end_ms
  );

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeIdx]);

  const handleSave = async (sub: SubtitleEntry) => {
    const newText = editing[sub.id];
    if (newText === undefined) return;
    await updateSubtitleEntry(sub.id, newText);
    onSubtitleChange(sub.id, newText);
    setEditing((prev) => { const n = { ...prev }; delete n[sub.id]; return n; });
  };

  return (
    <div className="h-full overflow-y-auto border rounded-lg bg-white">
      {subtitles.map((sub, idx) => (
        <div
          key={sub.id}
          ref={idx === activeIdx ? activeRef : null}
          className={`p-2 border-b last:border-0 ${idx === activeIdx ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}
        >
          <div className="text-xs text-gray-400 mb-1">
            {msToTime(sub.start_ms)} → {msToTime(sub.end_ms)}
          </div>
          <div className="flex gap-2">
            <input
              value={editing[sub.id] ?? sub.text}
              onChange={(e) => setEditing((prev) => ({ ...prev, [sub.id]: e.target.value }))}
              className="flex-1 text-sm border rounded px-2 py-1"
            />
            {editing[sub.id] !== undefined && (
              <button onClick={() => handleSave(sub)} className="text-xs text-blue-600 hover:text-blue-800">
                Save
              </button>
            )}
          </div>
        </div>
      ))}
      {subtitles.length === 0 && (
        <div className="p-4 text-center text-gray-400 text-sm">No subtitles imported yet</div>
      )}
    </div>
  );
}
