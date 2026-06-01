interface Props {
  isRecording: boolean;
  durationMs: number;
  audioLevel: number;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
}

function formatTime(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export default function RecordingControls({ isRecording, durationMs, audioLevel, onStart, onStop, disabled }: Props) {
  return (
    <div className="flex items-center gap-4 p-4 bg-white border rounded-lg">
      {isRecording ? (
        <button
          onClick={onStop}
          className="bg-red-500 hover:bg-red-600 text-white px-5 py-2 rounded-full font-medium flex items-center gap-2"
        >
          <span className="w-3 h-3 bg-white rounded-sm" />
          Stop Recording
        </button>
      ) : (
        <button
          onClick={onStart}
          disabled={disabled}
          className="bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white px-5 py-2 rounded-full font-medium flex items-center gap-2"
        >
          <span className="w-3 h-3 bg-white rounded-full" />
          Start Recording
        </button>
      )}

      {isRecording && (
        <>
          <span className="font-mono text-lg">{formatTime(durationMs)}</span>
          <div className="flex items-end gap-0.5 h-8">
            {Array.from({ length: 12 }, (_, i) => (
              <div
                key={i}
                className="w-1.5 bg-red-400 rounded-t transition-all duration-75"
                style={{ height: `${Math.max(4, audioLevel * 32 * (0.5 + Math.random() * 0.5))}px` }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
