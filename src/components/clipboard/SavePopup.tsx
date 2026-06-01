import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { listen } from '@tauri-apps/api/event';
import { showPopup, hidePopup } from '../../store/clipboardSlice';
import type { RootState } from '../../store';
import { saveCapturedContent } from '../../services/tauriCommands';
import type { ContentCategory } from '../../types';

const CATEGORIES: ContentCategory[] = ['vocabulary', 'speaking', 'writing', 'grammar', 'reading', 'general'];

export default function SavePopup() {
  const dispatch = useDispatch();
  const { popupVisible, pendingContent } = useSelector((state: RootState) => state.clipboard);
  const [category, setCategory] = useState<ContentCategory>('general');
  const [folder, setFolder] = useState('');
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    listen<{ content: string; char_count: number }>('clipboard:changed', (event) => {
      dispatch(showPopup(event.payload));
    }).then((fn) => { unlisten = fn; });
    return () => { unlisten?.(); };
  }, [dispatch]);

  if (!popupVisible || !pendingContent) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveCapturedContent({
        content: pendingContent,
        category,
        folder: folder || undefined,
        tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
        personalNotes: notes || undefined,
      });
      dispatch(hidePopup());
      setFolder('');
      setTags('');
      setNotes('');
      setCategory('general');
    } catch (e) {
      alert(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-start justify-end p-4">
      <div className="bg-white rounded-xl shadow-2xl w-96 p-5 space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">Save to Knowledge Library</h3>
          <button onClick={() => dispatch(hidePopup())} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div className="bg-gray-50 rounded p-3 text-sm text-gray-700 max-h-24 overflow-y-auto">
          {pendingContent.slice(0, 200)}{pendingContent.length > 200 && '...'}
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600">Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value as ContentCategory)}
            className="w-full border rounded px-2 py-1.5 text-sm mt-1">
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600">Folder</label>
          <input value={folder} onChange={(e) => setFolder(e.target.value)}
            placeholder="Optional folder" className="w-full border rounded px-2 py-1.5 text-sm mt-1" />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600">Tags (comma-separated)</label>
          <input value={tags} onChange={(e) => setTags(e.target.value)}
            placeholder="e.g. idiom, business" className="w-full border rounded px-2 py-1.5 text-sm mt-1" />
        </div>

        <div>
          <label className="text-xs font-medium text-gray-600">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            rows={2} className="w-full border rounded px-2 py-1.5 text-sm mt-1 resize-none" />
        </div>

        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm hover:bg-blue-700 disabled:bg-gray-300">
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button onClick={() => dispatch(hidePopup())}
            className="flex-1 border py-2 rounded-lg text-sm hover:bg-gray-50">
            Ignore
          </button>
        </div>
      </div>
    </div>
  );
}
