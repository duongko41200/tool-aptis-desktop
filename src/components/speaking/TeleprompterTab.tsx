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
    <div className="p-4 h-full flex flex-col gap-4">
      {!fullscreen ? (
        <>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Text to read</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste or type the text you want to practice reading..."
                rows={8}
                className="w-full border rounded px-3 py-2 text-sm resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">{text.split(/\s+/).filter(Boolean).length} words</p>
            </div>
            <div className="w-64 space-y-3 bg-white border rounded-lg p-4">
              <h3 className="font-medium">Display Settings</h3>
              <div>
                <label className="text-xs text-gray-600">Scroll Speed: {scrollSpeed.toFixed(1)}x</label>
                <input type="range" min="0.5" max="3" step="0.1" value={scrollSpeed}
                  onChange={(e) => setScrollSpeed(parseFloat(e.target.value))}
                  className="w-full" />
              </div>
              <div>
                <label className="text-xs text-gray-600">Font Size: {fontSize}px</label>
                <input type="range" min="20" max="80" step="2" value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value))}
                  className="w-full" />
              </div>
              <div className="flex gap-2">
                <div>
                  <label className="text-xs text-gray-600">Background</label>
                  <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)}
                    className="block w-12 h-8 rounded border" />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Text</label>
                  <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)}
                    className="block w-12 h-8 rounded border" />
                </div>
              </div>
            </div>
          </div>

          {error && <div className="bg-red-50 text-red-600 p-3 rounded text-sm">{error}</div>}

          <RecordingControls
            isRecording={isRecording}
            durationMs={durationMs}
            audioLevel={audioLevel}
            onStart={handleStartRecording}
            onStop={handleStopRecording}
            disabled={!text.trim() || loading}
          />

          {loading && <LoadingSpinner label="Processing..." />}

          {result && result.accuracy_score !== null && (
            <AccuracyScore
              accuracyScore={result.accuracy_score ?? 0}
              missedWordPct={result.missed_word_pct ?? 0}
              mispronounced={result.mispronounced_words ?? []}
              transcription={result.transcription ?? ''}
              readingSpeedWpm={result.reading_speed_wpm ?? undefined}
            />
          )}
        </>
      ) : (
        <div className="fixed inset-0 z-50 flex flex-col">
          <div className="flex-1">
            <TeleprompterDisplay
              text={text}
              scrollSpeed={scrollSpeed}
              fontSize={fontSize}
              backgroundColor={bgColor}
              textColor={textColor}
              isScrolling={isRecording}
            />
          </div>
          <div className="bg-black bg-opacity-90 p-4">
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
