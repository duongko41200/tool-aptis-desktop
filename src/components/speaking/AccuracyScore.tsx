interface Props {
  accuracyScore: number;
  missedWordPct: number;
  mispronounced: string[];
  transcription: string;
  readingSpeedWpm?: number;
}

export default function AccuracyScore({ accuracyScore, missedWordPct, mispronounced, transcription, readingSpeedWpm }: Props) {
  const color = accuracyScore >= 80 ? 'text-green-600' : accuracyScore >= 60 ? 'text-yellow-600' : 'text-red-600';
  return (
    <div className="bg-white border rounded-lg p-4 space-y-3">
      <h3 className="font-semibold text-lg">Accuracy Results</h3>
      <div className="flex gap-6">
        <div className="text-center">
          <div className={`text-4xl font-bold ${color}`}>{accuracyScore.toFixed(1)}%</div>
          <div className="text-xs text-gray-500">Accuracy</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-semibold text-orange-500">{missedWordPct.toFixed(1)}%</div>
          <div className="text-xs text-gray-500">Missed Words</div>
        </div>
        {readingSpeedWpm !== undefined && (
          <div className="text-center">
            <div className="text-2xl font-semibold text-blue-600">{readingSpeedWpm.toFixed(0)}</div>
            <div className="text-xs text-gray-500">WPM</div>
          </div>
        )}
      </div>
      {mispronounced.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">Mispronounced words:</p>
          <div className="flex flex-wrap gap-1">
            {mispronounced.map((w, i) => (
              <span key={i} className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-sm">{w}</span>
            ))}
          </div>
        </div>
      )}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-1">Your transcription:</p>
        <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{transcription}</p>
      </div>
    </div>
  );
}
