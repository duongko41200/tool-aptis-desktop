import { useState, useCallback } from 'react';
import type { SearchContentParams, ContentCategory } from '../../types';

interface Props {
  onChange: (params: SearchContentParams) => void;
}

const CATEGORIES: ContentCategory[] = ['vocabulary', 'speaking', 'writing', 'grammar', 'reading', 'general'];

export default function SearchBar({ onChange }: Props) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [folder, setFolder] = useState('');
  const [tag, setTag] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const debounceRef = { current: 0 };

  const emitChange = useCallback((params: SearchContentParams) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => onChange(params), 300);
  }, [onChange]);

  const update = (updates: Partial<SearchContentParams>) => {
    const params: SearchContentParams = {
      query: query || undefined,
      category: category as ContentCategory || undefined,
      folder: folder || undefined,
      tag: tag || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      ...updates,
    };
    emitChange(params);
  };

  return (
    <div className="flex flex-wrap gap-2 p-3 bg-white border-b">
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); update({ query: e.target.value || undefined }); }}
        placeholder="Search content..."
        className="flex-1 min-w-40 border rounded px-3 py-1.5 text-sm"
      />
      <select value={category} onChange={(e) => { setCategory(e.target.value); update({ category: e.target.value as ContentCategory || undefined }); }}
        className="border rounded px-2 py-1.5 text-sm">
        <option value="">All categories</option>
        {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <input value={folder} onChange={(e) => { setFolder(e.target.value); update({ folder: e.target.value || undefined }); }}
        placeholder="Folder" className="border rounded px-2 py-1.5 text-sm w-28" />
      <input value={tag} onChange={(e) => { setTag(e.target.value); update({ tag: e.target.value || undefined }); }}
        placeholder="Tag" className="border rounded px-2 py-1.5 text-sm w-24" />
      <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); update({ date_from: e.target.value || undefined }); }}
        className="border rounded px-2 py-1.5 text-sm" />
      <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); update({ date_to: e.target.value || undefined }); }}
        className="border rounded px-2 py-1.5 text-sm" />
    </div>
  );
}
