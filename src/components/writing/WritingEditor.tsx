import type { EvaluationMode } from '../../types';

interface Props {
  value: string;
  mode: EvaluationMode;
  onValueChange: (v: string) => void;
  onModeChange: (m: EvaluationMode) => void;
  onEvaluate: () => void;
  isLoading: boolean;
  isOnline: boolean;
}

const MODES: { value: EvaluationMode; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'ielts', label: 'IELTS' },
  { value: 'toeic', label: 'TOEIC' },
  { value: 'aptis', label: 'Aptis' },
];

export default function WritingEditor({ value, mode, onValueChange, onModeChange, onEvaluate, isLoading, isOnline }: Props) {
  const wordCount = value.split(/\s+/).filter(Boolean).length;
  const isOverLimit = wordCount > 3000;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium">Evaluation Mode:</label>
        {MODES.map((m) => (
          <button
            key={m.value}
            onClick={() => onModeChange(m.value)}
            className={`px-3 py-1 rounded text-sm ${mode === m.value ? 'bg-blue-600 text-white' : 'border hover:bg-gray-50'}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder="Type or paste your writing here..."
          rows={12}
          className={`w-full border rounded px-3 py-2 text-sm resize-none ${isOverLimit ? 'border-red-400' : ''}`}
        />
        <div className={`absolute bottom-2 right-2 text-xs ${isOverLimit ? 'text-red-500' : 'text-gray-400'}`}>
          {wordCount} words {isOverLimit && '(limit: 3000)'}
        </div>
      </div>

      <button
        onClick={onEvaluate}
        disabled={!value.trim() || isLoading || isOverLimit || !isOnline}
        className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 flex items-center gap-2"
      >
        {isLoading ? (
          <>
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Evaluating...
          </>
        ) : 'Evaluate Writing'}
      </button>
      {!isOnline && <p className="text-xs text-orange-500">Requires internet connection</p>}
    </div>
  );
}
