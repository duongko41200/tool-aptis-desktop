import { useState, useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { hideClipboardPopup } from '../../services/tauriCommands';
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

    listen<ClipboardPayload>('clipboard:changed', (event) => {
      const { content: text, char_count } = event.payload;
      if (text === lastRef.current) return;
      lastRef.current = text;
      setContent(text);
      setCharCount(char_count);
      setVisible(true);
      // Window is shown by Rust after this event, no need to call showClipboardPopup here
    }).then(fn => { unlisten = fn; });

    return () => { unlisten?.(); };
  }, []);

  const handleClose = async () => {
    setVisible(false);
    lastRef.current = '';
    await hideClipboardPopup();
  };

  // Always render the popup but use CSS visibility to avoid white flash
  return (
    <div style={{
      width: '100%',
      height: '100%',
      visibility: visible ? 'visible' : 'hidden',
    }}>
      <ClipboardPopup
        content={content || ' '}
        charCount={charCount}
        onClose={handleClose}
      />
    </div>
  );
}
