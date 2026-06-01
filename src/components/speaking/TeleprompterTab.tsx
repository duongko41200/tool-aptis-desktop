import { useState } from 'react';
import { createTeleprompterSession, saveRecording } from '../../services/tauriCommands';
import { useRecording } from '../../hooks/useRecording';
import TeleprompterDisplay from './TeleprompterDisplay';
import RecordingControls from './RecordingControls';
import AccuracyScore from './AccuracyScore';
import LoadingSpinner from '../shared/LoadingSpinner';
import type { Recording } from '../../types';

export default function TeleprompterTab() {
  const [text, setText] = useState('');
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [scrollSpeed, setScrollSpeed] = useState(1.0);
  const [fontSize, setFontSize] = useState(32);
  const [bgColor, setBgColor] = useState('#000000');
  const [textColor, setTextColor] = useState('#ffffff');
  const [fullscreen, setFullscreen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Recording | null>(null);
  const { isRecording, durationMs, audioLevel, startRecording, stopRecording } = useRecording();

  const handleStartRecording = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const session = await createTeleprompterSession(text);
      setSessionId(session.id);
      setFullscreen(true);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
    await startRecording();
  };

  const handleStopRecording = async () => {
    if (!sessionId) return;
    try {
      const { audioData, durationMs: dur } = await stopRecording();
      setFullscreen(false);
      setLoading(true);
      const recording = await saveRecording({
        sessionType: 'teleprompter',
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
      {!fullscreen ? (
        <>
          <div style={{ display: 'flex', gap: 12 }}>
            {/* Text area */}
            <div style={{ flex: 1 }}>
              <label className="label-upper" style={{ display: 'block', marginBottom: 6 }}>Text to read</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste or type the text you want to practice reading..."
                rows={8}
                className="lofi-input"
                style={{ resize: 'none' }}
              />
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                {text.split(/\s+/).filter(Boolean).length} words
              </p>
            </div>

            {/* Settings panel */}
            <div className="glass-card-dark" style={{ width: 240, padding: 16, display: 'flex', flexDirection: 'column', gap: 14, flexShrink: 0 }}>
              <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Display Settings</h3>
              <div>
                <label className="label-upper" style={{ display: 'block', marginBottom: 4 }}>Scroll Speed: {scrollSpeed.toFixed(1)}x</label>
                <input type="range" min="0.5" max="3" step="0.1" value={scrollSpeed}
                  onChange={(e) => setScrollSpeed(parseFloat(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent-primary)' }} />
              </div>
              <div>
                <label className="label-upper" style={{ display: 'block', marginBottom: 4 }}>Font Size: {fontSize}px</label>
                <input type="range" min="20" max="80" step="2" value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent-primary)' }} />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div>
                  <label className="label-upper" style={{ display: 'block', marginBottom: 4 }}>Background</label>
                  <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)}
                    style={{ display: 'block', width: 44, height: 32, borderRadius: 8, border: '1px solid var(--border-glass)', cursor: 'pointer' }} />
                </div>
                <div>
                  <label className="label-upper" style={{ display: 'block', marginBottom: 4 }}>Text</label>
                  <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)}
                    style={{ display: 'block', width: 44, height: 32, borderRadius: 8, border: '1px solid var(--border-glass)', cursor: 'pointer' }} />
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div style={{ background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.3)', color: '#f87171', padding: '10px 14px', borderRadius: 12, fontSize: 13 }}>{error}</div>
          )}

          <div className="glass-card" style={{ padding: '10px 14px' }}>
            <RecordingControls
              isRecording={isRecording}
              durationMs={durationMs}
              audioLevel={audioLevel}
              onStart={handleStartRecording}
              onStop={handleStopRecording}
              disabled={!text.trim() || loading}
            />
          </div>

          {loading && <LoadingSpinner label="Processing..." />}

          {result && result.accuracy_score !== null && (
            <div className="glass-card" style={{ padding: 16 }}>
              <AccuracyScore
                accuracyScore={result.accuracy_score ?? 0}
                missedWordPct={result.missed_word_pct ?? 0}
                mispronounced={result.mispronounced_words ?? []}
                transcription={result.transcription ?? ''}
                readingSpeedWpm={result.reading_speed_wpm ?? undefined}
              />
            </div>
          )}
        </>
      ) : (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1 }}>
            <TeleprompterDisplay
              text={text}
              scrollSpeed={scrollSpeed}
              fontSize={fontSize}
              backgroundColor={bgColor}
              textColor={textColor}
              isScrolling={isRecording}
            />
          </div>
          <div style={{ background: 'rgba(0,0,0,0.92)', padding: 16, backdropFilter: 'blur(12px)' }}>
            <RecordingControls
              isRecording={isRecording}
              durationMs={durationMs}
              audioLevel={audioLevel}
              onStart={startRecording}
              onStop={handleStopRecording}
            />
          </div>
        </div>
      )}
    </div>
  );
}
