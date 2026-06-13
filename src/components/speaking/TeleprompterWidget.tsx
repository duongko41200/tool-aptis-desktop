import { useState, useEffect, useRef } from 'react';
import Icon from '../common/Icon';

export default function TeleprompterWidget() {
  const [text, setText] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(30); // pixels per second

  const scrollRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(undefined);
  const lastTimeRef = useRef<number | undefined>(undefined);

  const animate = (time: number) => {
    if (lastTimeRef.current != null && isPlaying && scrollRef.current) {
      const deltaTime = time - lastTimeRef.current;
      const scrollAmount = (speed * deltaTime) / 1000;
      scrollRef.current.scrollTop += scrollAmount;
    }
    lastTimeRef.current = time;
    if (isPlaying) {
      requestRef.current = requestAnimationFrame(animate);
    }
  };

  useEffect(() => {
    if (isPlaying) {
      requestRef.current = requestAnimationFrame(animate);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      lastTimeRef.current = undefined;
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isPlaying, speed]);

  const togglePlay = () => setIsPlaying(!isPlaying);

  const resetScroll = () => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setIsPlaying(false);
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: '#1A1C20', color: '#FFFFFF', borderRadius: 'var(--r-xl)',
      overflow: 'hidden', boxShadow: 'var(--sh-lg)', border: '1px solid rgba(255,255,255,0.1)'
    }}>
      {/* Header / Controls */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', background: '#25282E', borderBottom: '1px solid rgba(255,255,255,0.05)'
      }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#E0E2E8', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: 4, background: isPlaying ? '#FF3B30' : '#8E8E93', transition: 'background 0.3s' }} />
          TELEPROMPTER
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isEditing ? (
            <button 
              onClick={() => {
                if (text.trim()) setIsEditing(false);
              }}
              style={{
                background: '#0A84FF', color: '#FFF', padding: '6px 12px',
                borderRadius: '100px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                opacity: text.trim() ? 1 : 0.5
              }}
            >
              Start
            </button>
          ) : (
            <button 
              onClick={() => { setIsEditing(true); setIsPlaying(false); }}
              style={{
                background: 'rgba(255,255,255,0.1)', color: '#FFF', padding: '6px 12px',
                borderRadius: '100px', fontSize: 13, fontWeight: 600, cursor: 'pointer'
              }}
            >
              Edit Script
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
        {isEditing ? (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Dán kịch bản bài nói của bạn vào đây..."
            style={{
              flex: 1, width: '100%', height: '100%', padding: 20,
              background: 'transparent', color: '#FFFFFF', border: 'none',
              outline: 'none', resize: 'none', fontSize: 16, lineHeight: 1.6,
              fontFamily: 'inherit'
            }}
          />
        ) : (
          <div 
            ref={scrollRef}
            style={{
              flex: 1, overflowY: 'auto', padding: '100px 24px',
              scrollBehavior: 'auto'
            }}
          >
            <div style={{ 
              fontSize: 22, fontWeight: 600, lineHeight: 1.5, color: '#FFFFFF',
              whiteSpace: 'pre-wrap', paddingBottom: '50vh'
            }}>
              {text}
            </div>
          </div>
        )}
      </div>

      {/* Play Controls Footer (only shown in play mode) */}
      {!isEditing && (
        <div style={{
          padding: '16px', background: '#25282E', borderTop: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <button 
            onClick={resetScroll}
            style={{
              width: 36, height: 36, borderRadius: 18, background: 'rgba(255,255,255,0.1)',
              color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
            }}
            title="Cuộn lên đầu"
          >
            <Icon name="rotate-ccw" size={16} />
          </button>
          
          <button 
            onClick={togglePlay}
            style={{
              width: 48, height: 48, borderRadius: 24, background: isPlaying ? '#FF3B30' : '#0A84FF',
              color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
            }}
          >
            <Icon name={isPlaying ? "pause" : "play"} size={24} style={{ marginLeft: isPlaying ? 0 : 2 }} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.2)', padding: '6px 10px', borderRadius: 100 }}>
            <button 
              onClick={() => setSpeed(Math.max(10, speed - 10))}
              style={{ color: '#FFF', cursor: 'pointer', opacity: speed <= 10 ? 0.3 : 1, padding: 4 }}
            >
              <Icon name="minus" size={14} />
            </button>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#FFF', width: 24, textAlign: 'center' }}>
              {speed / 10}
            </div>
            <button 
              onClick={() => setSpeed(Math.min(100, speed + 10))}
              style={{ color: '#FFF', cursor: 'pointer', opacity: speed >= 100 ? 0.3 : 1, padding: 4 }}
            >
              <Icon name="plus" size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
