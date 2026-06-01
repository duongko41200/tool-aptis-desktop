import { useState } from 'react';
import { useAddWord } from '../../hooks/useVocabulary';

interface Props {
  onClose: () => void;
}

export default function AddWordForm({ onClose }: Props) {
  const [word, setWord] = useState('');
  const [phonetics, setPhonetics] = useState('');
  const [meaning, setMeaning] = useState('');
  const [example, setExample] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');
  const [duplicate, setDuplicate] = useState(false);
  const { mutateAsync: addWord, isPending } = useAddWord();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setDuplicate(false);
    try {
      await addWord({ word, phonetics: phonetics || undefined, meaning, example: example || undefined, personal_notes: notes || undefined, tags: tags || undefined });
      onClose();
    } catch (err) {
      if (String(err).includes('already exists')) setDuplicate(true);
      else alert(String(err));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h3 className="font-semibold text-lg">Add New Word</h3>
      <div>
        <label className="block text-sm font-medium mb-1">Word *</label>
        <input required value={word} onChange={(e) => setWord(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm" />
        {duplicate && (
          <p className="text-red-500 text-xs mt-1">Word already exists in your vocabulary.</p>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Phonetics (IPA)</label>
        <input value={phonetics} onChange={(e) => setPhonetics(e.target.value)}
          placeholder="/wɜːrd/" className="w-full border rounded px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Meaning *</label>
        <textarea required value={meaning} onChange={(e) => setMeaning(e.target.value)}
          rows={2} className="w-full border rounded px-3 py-2 text-sm resize-none" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Example Sentence</label>
        <input value={example} onChange={(e) => setExample(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Tags (comma-separated)</label>
        <input value={tags} onChange={(e) => setTags(e.target.value)}
          placeholder="e.g. business, phrasal-verb" className="w-full border rounded px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Personal Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
          rows={2} className="w-full border rounded px-3 py-2 text-sm resize-none" />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={isPending}
          className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300">
          {isPending ? 'Adding...' : 'Add Word'}
        </button>
        <button type="button" onClick={onClose} className="border px-5 py-2 rounded-lg hover:bg-gray-50">
          Cancel
        </button>
      </div>
    </form>
  );
}
