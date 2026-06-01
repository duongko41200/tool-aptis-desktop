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
    <div style={{ padding: 16, height: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* URL Input row */}
      <div className="glass-card" style={{ display: 'flex', gap: 8, padding: '10px 14px', alignItems: 'center' }}>
        <input
          type="text"
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
          placeholder="Paste YouTube URL..."
          className="lofi-input"
          style={{ flex: 1 }}
          onKeyDown={(e) => e.key === 'Enter' && handleLoadVideo()}
        />
        <button onClick={handleLoadVideo} disabled={loading} className="btn-primary" style={{ flexShrink: 0 }}>
          {loading ? 'Loading…' : 'Load'}
        </button>
        {sessionId && (
          <label className="btn-ghost" style={{ flexShrink: 0, cursor: 'pointer', fontSize: '0.875rem' }}>
            Import SRT
            <input type="file" accept=".srt" style={{ display: 'none' }} onChange={handleSrtImport} />
          </label>
        )}
      </div>

      {error && (
        <div style={{ background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.3)', color: '#f87171', padding: '10px 14px', borderRadius: 12, fontSize: 13 }}>{error}</div>
      )}

      {sessionId && (
        <>
          <div style={{ display: 'flex', gap: 12, flex: 1, minHeight: 0 }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <VideoPlayer url={youtubeUrl} onTimeUpdate={setCurrentTimeMs} repeatRange={repeatRange} />
              </div>
              <div className="glass-card" style={{ padding: '10px 14px' }}>
                <RepeatRangeControl onRangeChange={(s, e, l) => setRepeatRange({ startMs: s, endMs: e, loopMode: l })} />
              </div>
            </div>
            <div style={{ width: 300, flexShrink: 0 }}>
              <div className="glass-card-dark" style={{ height: '100%' }}>
                <SubtitleEditor
                  subtitles={subtitles}
                  currentTimeMs={currentTimeMs}
                  onSubtitleChange={(id, text) =>
                    setSubtitles((prev) => prev.map((s) => s.id === id ? { ...s, text } : s))
                  }
                />
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '10px 14px' }}>
            <RecordingControls
              isRecording={isRecording}
              durationMs={durationMs}
              audioLevel={audioLevel}
              onStart={startRecording}
              onStop={handleRecordStop}
              disabled={loading}
            />
          </div>

          {loading && <LoadingSpinner label="Processing recording..." />}

          {result && result.accuracy_score !== null && (
            <div className="glass-card" style={{ padding: 16 }}>
              <AccuracyScore
                accuracyScore={result.accuracy_score ?? 0}
                missedWordPct={result.missed_word_pct ?? 0}
                mispronounced={result.mispronounced_words ?? []}
                transcription={result.transcription ?? ''}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
