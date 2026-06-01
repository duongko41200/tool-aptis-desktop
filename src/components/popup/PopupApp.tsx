import { useState, useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { showClipboardPopup } from '../../services/tauriCommands';
import ClipboardPopup from './ClipboardPopup';

interface ClipboardPayload {
  content: string;
  char_count: number;
}

export default function PopupApp() {
  const [content, setContent]     = useState('');
  const [charCount, setCharCount] = useState(0);
  const [visible, setVisible]     = useState(false);
  const lastRef = useRef('');

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    listen<ClipboardPayload>('clipboard:changed', async (event) => {
      const { content: text, char_count } = event.payload;
      if (text === lastRef.current) return;   // dedup
      lastRef.current = text;
      setContent(text);
      setCharCount(char_count);
      setVisible(true);
      await showClipboardPopup();
    }).then(fn => { unlisten = fn; });

    return () => { unlisten?.(); };
  }, []);

  const handleClose = () => {
    setVisible(false);
    lastRef.current = '';
  };

  if (!visible) {
    return (
      <div className="w-full h-full flex items-center justify-center" style={{ background: 'transparent' }} />
    );
  }

  return (
    <div className="w-full h-full" style={{ background: 'transparent' }}>
      <ClipboardPopup content={content} charCount={charCount} onClose={handleClose} />
    </div>
  );
}
