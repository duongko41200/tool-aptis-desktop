import { useState } from 'react';
import { createVideoSession, importSubtitles, saveRecording } from '../../services/tauriCommands';
import { useRecording } from '../../hooks/useRecording';
import VideoPlayer from './VideoPlayer';
import SubtitleEditor from './SubtitleEditor';
import RepeatRangeControl from './RepeatRangeControl';
import RecordingControls from './RecordingControls';
import AccuracyScore from './AccuracyScore';
import LoadingSpinner from '../shared/LoadingSpinner';
import type { SubtitleEntry, Recording } from '../../types';

export default function ShadowingTab() {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [subtitles, setSubtitles] = useState<SubtitleEntry[]>([]);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [repeatRange, setRepeatRange] = useState<{ startMs: number; endMs: number; loopMode: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Recording | null>(null);
  const { isRecording, durationMs, audioLevel, startRecording, stopRecording } = useRecording();

  const handleLoadVideo = async () => {
    if (!youtubeUrl.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const session = await createVideoSession(youtubeUrl);
      setSessionId(session.id);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleSrtImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !sessionId) return;
    const text = await file.text();
    try {
      const entries = await importSubtitles(sessionId, text);
      setSubtitles(entries);
    } catch (err) {
      setError(String(err));
    }
  };

  const handleRecordStop = async () => {
    if (!sessionId) return;
    try {
      const { audioData, durationMs: dur } = await stopRecording();
      setLoading(true);
      const recording = await saveRecording({
        sessionType: 'shadowing',
        sessionId,
        audioData,
        durationMs: dur,
      });
      setResult(recording);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 h-full flex flex-col gap-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
          placeholder="Paste YouTube URL..."
          className="flex-1 border rounded px-3 py-2 text-sm"
          onKeyDown={(e) => e.key === 'Enter' && handleLoadVideo()}
        />
        <button onClick={handleLoadVideo} disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-300">
          {loading ? 'Loading...' : 'Load'}
        </button>
        {sessionId && (
          <label className="border px-4 py-2 rounded cursor-pointer hover:bg-gray-50 text-sm">
            Import SRT
            <input type="file" accept=".srt" className="hidden" onChange={handleSrtImport} />
          </label>
        )}
      </div>

      {error && <div className="bg-red-50 text-red-600 p-3 rounded text-sm">{error}</div>}

      {sessionId && (
        <>
          <div className="flex gap-4 flex-1 min-h-0">
            <div className="flex-1 flex flex-col gap-3">
              <VideoPlayer
                url={youtubeUrl}
                onTimeUpdate={setCurrentTimeMs}
                repeatRange={repeatRange}
              />
              <RepeatRangeControl
                onRangeChange={(s, e, l) => setRepeatRange({ startMs: s, endMs: e, loopMode: l })}
              />
            </div>
            <div className="w-80 flex flex-col">
              <SubtitleEditor
                subtitles={subtitles}
                currentTimeMs={currentTimeMs}
                onSubtitleChange={(id, text) =>
                  setSubtitles((prev) => prev.map((s) => s.id === id ? { ...s, text } : s))
                }
              />
            </div>
          </div>

          <RecordingControls
            isRecording={isRecording}
            durationMs={durationMs}
            audioLevel={audioLevel}
            onStart={startRecording}
            onStop={handleRecordStop}
            disabled={loading}
          />

          {loading && <LoadingSpinner label="Processing recording..." />}

          {result && result.accuracy_score !== null && (
            <AccuracyScore
              accuracyScore={result.accuracy_score ?? 0}
              missedWordPct={result.missed_word_pct ?? 0}
              mispronounced={result.mispronounced_words ?? []}
              transcription={result.transcription ?? ''}
            />
          )}
        </>
      )}
    </div>
  );
}
