import { useState, useRef, useEffect } from 'react';
import Icon from '../common/Icon';
import { saveAudio, getAudio, deleteAudio } from '../../services/audio-db';

interface AudioRecorderWidgetProps {
  recordKey: string;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
  timeLimit?: number;
}

export default function AudioRecorderWidget({ recordKey, onNext, onPrev, hasNext, hasPrev, timeLimit }: AudioRecorderWidgetProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const timerInterval = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load existing audio when recordKey changes
  useEffect(() => {
    let active = true;
    
    // Stop anything currently playing or recording
    if (isRecording) stopRecording();
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    
    setAudioUrl(null);
    setDuration(0);

    const loadData = async () => {
      try {
        const blob = await getAudio(recordKey);
        if (active && blob) {
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
        }
      } catch (err) {
        console.error("Failed to load audio for", recordKey, err);
      }
    };
    loadData();

    return () => {
      active = false;
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (timerInterval.current) window.clearInterval(timerInterval.current);
    };
  }, [recordKey]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        // Save to DB
        await saveAudio(recordKey, audioBlob);
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      setDuration(timeLimit || 0);
      setAudioUrl(null);

      timerInterval.current = window.setInterval(() => {
        setDuration(d => {
          if (timeLimit !== undefined) {
            if (d <= 1) {
              if (timerInterval.current) window.clearInterval(timerInterval.current);
              // Call stop recording asynchronously to avoid state update conflicts
              setTimeout(() => stopRecording(), 0);
              return 0;
            }
            return d - 1;
          }
          return d + 1;
        });
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Không thể truy cập microphone. Vui lòng kiểm tra quyền truy cập.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      if (timerInterval.current) window.clearInterval(timerInterval.current);
    }
  };

  const toggleRecording = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleDelete = async () => {
    if (!confirm("Bạn có chắc chắn muốn xóa bản thu âm này?")) return;
    await deleteAudio(recordKey);
    setAudioUrl(null);
    setDuration(0);
  };

  return (
    <div className="glass rise" style={{ padding: 24, borderRadius: 'var(--r-xl)', display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center', background: isRecording ? 'rgba(217,138,106,0.05)' : 'var(--glass)' }}>
      {audioUrl && <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} />}
      
      <div style={{ fontSize: 15, fontWeight: 600, color: isRecording ? 'var(--bad)' : 'var(--ink)' }}>
        {isRecording ? "Đang ghi âm..." : audioUrl ? "Đã ghi âm" : "Nhấn để bắt đầu ghi âm"}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        {onPrev !== undefined && (
          <button 
            onClick={onPrev} 
            disabled={!hasPrev || isRecording} 
            style={{ 
              background: 'rgba(40,55,30,0.07)', color: 'var(--ink)', 
              opacity: (!hasPrev || isRecording) ? 0.3 : 1, 
              cursor: (!hasPrev || isRecording) ? 'not-allowed' : 'pointer',
              border: '1px solid var(--glass-edge)', padding: '8px 16px', borderRadius: '100px', fontWeight: 600, fontSize: 13.5
            }}
          >
            Previous
          </button>
        )}

        {audioUrl && !isRecording && (
          <button onClick={handleDelete} className="iconbtn" style={{ background: 'rgba(255,0,0,0.05)', color: 'var(--bad)', border: '1px solid rgba(255,0,0,0.1)' }} title="Xóa">
            <Icon name="trash" size={18} />
          </button>
        )}

        <button 
          onClick={toggleRecording}
          className={isRecording ? 'pulse-soft' : ''}
          style={{ 
            position: 'relative', width: 80, height: 80, borderRadius: '50%', display: 'grid', placeItems: 'center', 
            background: isRecording ? 'var(--bad)' : 'var(--accent)', color: isRecording ? '#fff' : 'var(--accent-ink)', 
            boxShadow: isRecording ? '0 0 0 12px rgba(217,138,106,0.2)' : 'var(--sh-glow)', transition: 'all 200ms var(--ease)', border: 'none', cursor: 'pointer' 
          }}
        >
          <Icon name={isRecording ? 'pause' : 'mic'} size={32} fill={isRecording} />
        </button>

        {audioUrl && !isRecording && (
          <button onClick={togglePlayback} className="iconbtn" style={{ background: 'rgba(40,55,30,0.07)', color: 'var(--ink)', border: '1px solid var(--glass-edge)' }} title="Nghe lại">
            <Icon name={isPlaying ? "pause" : "play"} size={18} fill={isPlaying} />
          </button>
        )}

        {onNext !== undefined && (
          <button 
            onClick={onNext} 
            disabled={!hasNext || isRecording} 
            style={{ 
              background: 'rgba(40,55,30,0.07)', color: 'var(--ink)', 
              opacity: (!hasNext || isRecording) ? 0.3 : 1, 
              cursor: (!hasNext || isRecording) ? 'not-allowed' : 'pointer',
              border: '1px solid var(--glass-edge)', padding: '8px 16px', borderRadius: '100px', fontWeight: 600, fontSize: 13.5
            }}
          >
            Next
          </button>
        )}
      </div>

      {isRecording && (
        <div className="chip" style={{ fontSize: 16, padding: '8px 16px', background: 'rgba(217,138,106,0.1)', color: 'var(--bad)', border: '1px solid rgba(217,138,106,0.3)' }}>
          {formatTime(duration)}
        </div>
      )}
    </div>
  );
}
