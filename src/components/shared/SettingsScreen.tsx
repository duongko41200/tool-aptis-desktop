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

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="glass-card-dark" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h2>
      {children}
    </div>
  );

  const FieldLabel = ({ children }: { children: React.ReactNode }) => (
    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>{children}</label>
  );

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: 'var(--text-primary)' }}>Settings</h1>

      <Section title="AI Configuration">
        <div>
          <FieldLabel>Gemini API Key</FieldLabel>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your Gemini API key"
            className="lofi-input"
          />
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: '6px 0 0' }}>Stored securely, never in plaintext</p>
        </div>
      </Section>

      <Section title="Clipboard">
        <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
          <div className={`lofi-toggle ${clipboardEnabled ? 'on' : 'off'}`} onClick={() => setClipboardEnabled(v => !v)}>
            <div className="lofi-toggle-thumb" />
          </div>
          <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>Enable clipboard monitoring</span>
        </label>
      </Section>

      <Section title="Speaking">
        <div>
          <FieldLabel>TTS Voice</FieldLabel>
          <select value={ttsVoice} onChange={(e) => setTtsVoice(e.target.value)} className="lofi-select">
            <option value="">Default voice</option>
            {voices.map((v) => (
              <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
            ))}
          </select>
        </div>
      </Section>

      <Section title="Writing">
        <div>
          <FieldLabel>Default Evaluation Mode</FieldLabel>
          <select value={writingMode} onChange={(e) => setWritingMode(e.target.value as EvaluationMode)} className="lofi-select">
            <option value="general">General</option>
            <option value="ielts">IELTS</option>
            <option value="toeic">TOEIC</option>
            <option value="aptis">Aptis</option>
          </select>
        </div>
      </Section>

      <button onClick={handleSave} className="btn-primary" style={{ alignSelf: 'flex-start', padding: '11px 32px', fontSize: '0.9rem' }}>
        {saved ? '✓ Saved!' : 'Save Settings'}
      </button>
    </div>
  );
}
