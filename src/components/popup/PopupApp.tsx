import { useState, useEffect, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { showClipboardPopup, getClipboardStatus } from '../../services/tauriCommands';
import ClipboardPopup from './ClipboardPopup';
import '../../index.css';

interface ClipboardPayload {
  content: string;
  char_count: number;
}

export default function PopupApp() {
  const [content, setContent] = useState('');
  const [charCount, setCharCount] = useState(0);
  const [visible, setVisible] = useState(false);
  const lastContentRef = useRef('');

  useEffect(() => {
    // Check monitoring status on mount
    getClipboardStatus().catch(() => {});

    const unlisten = listen<ClipboardPayload>('clipboard:changed', async (event) => {
      const { content: newContent, char_count } = event.payload;

      // Dedup: skip if same content
      if (newContent === lastContentRef.current) return;
      lastContentRef.current = newContent;

      setContent(newContent);
      setCharCount(char_count);
      setVisible(true);
      await showClipboardPopup();
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const handleClose = () => {
    setVisible(false);
    lastContentRef.current = '';
  };

  if (!visible) return null;

  return (
    <ClipboardPopup
      content={content}
      charCount={charCount}
      onClose={handleClose}
    />
  );
}
