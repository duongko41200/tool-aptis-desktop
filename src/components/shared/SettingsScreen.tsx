import { useState, useEffect } from 'react';
import { getSettings, saveSettings } from '../../services/tauriCommands';
import type { EvaluationMode } from '../../types';

export default function SettingsScreen() {
  const [apiKey, setApiKey] = useState('');
  const [clipboardEnabled, setClipboardEnabled] = useState(false);
  const [ttsVoice, setTtsVoice] = useState('');
  const [writingMode, setWritingMode] = useState<EvaluationMode>('general');
  const [saved, setSaved] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    getSettings().then((s) => {
      if (s.gemini_api_key) setApiKey(s.gemini_api_key);
      setClipboardEnabled(s.clipboard_monitoring_enabled);
      setTtsVoice(s.tts_voice ?? '');
      setWritingMode(s.default_writing_mode ?? 'general');
    }).catch(() => {});

    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  const handleSave = async () => {
    await saveSettings({
      gemini_api_key: apiKey,
      clipboard_monitoring_enabled: clipboardEnabled,
      tts_voice: ttsVoice,
      default_writing_mode: writingMode,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="bg-white rounded-lg border p-4 space-y-4">
        <h2 className="font-semibold text-lg">AI Configuration</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Gemini API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your Gemini API key"
            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Stored securely, never in plaintext</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-4 space-y-4">
        <h2 className="font-semibold text-lg">Clipboard</h2>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={clipboardEnabled}
            onChange={(e) => setClipboardEnabled(e.target.checked)}
            className="w-4 h-4"
          />
          <span className="text-sm">Enable clipboard monitoring</span>
        </label>
      </div>

      <div className="bg-white rounded-lg border p-4 space-y-4">
        <h2 className="font-semibold text-lg">Speaking</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">TTS Voice</label>
          <select
            value={ttsVoice}
            onChange={(e) => setTtsVoice(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
          >
            <option value="">Default voice</option>
            {voices.map((v) => (
              <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-4 space-y-4">
        <h2 className="font-semibold text-lg">Writing</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Default Evaluation Mode</label>
          <select
            value={writingMode}
            onChange={(e) => setWritingMode(e.target.value as EvaluationMode)}
            className="w-full border rounded px-3 py-2 text-sm"
          >
            <option value="general">General</option>
            <option value="ielts">IELTS</option>
            <option value="toeic">TOEIC</option>
            <option value="aptis">Aptis</option>
          </select>
        </div>
      </div>

      <button
        onClick={handleSave}
        className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
      >
        {saved ? '✓ Saved!' : 'Save Settings'}
      </button>
    </div>
  );
}
