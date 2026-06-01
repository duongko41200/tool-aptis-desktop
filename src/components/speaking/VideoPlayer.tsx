import { useEffect, useRef, useState } from 'react';
import { YouTubePlayer } from '../../services/youtubePlayer';

interface Props {
  url: string;
  onTimeUpdate?: (ms: number) => void;
  repeatRange?: { startMs: number; endMs: number; loopMode: boolean } | null;
}

export default function VideoPlayer({ url, onTimeUpdate, repeatRange }: Props) {
  const playerRef = useRef<YouTubePlayer | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;
    const player = new YouTubePlayer('yt-player-container');
    playerRef.current = player;

    player.loadVideo(url)
      .then(() => setLoaded(true))
      .catch((e) => setError(e.message));

    player.onTimeUpdate((ms) => {
      onTimeUpdate?.(ms);
      if (repeatRange) {
        const { startMs, endMs, loopMode } = repeatRange;
        if (ms >= endMs) {
          if (loopMode) player.seekTo(startMs);
          else player.pause();
        }
      }
    });

    return () => { player.destroy(); playerRef.current = null; };
  }, [url]);

  // Update repeat range handling when it changes
  useEffect(() => {
    if (!playerRef.current || !repeatRange) return;
  }, [repeatRange]);

  if (error) return <div className="bg-red-50 text-red-600 p-4 rounded">{error}</div>;

  return (
    <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
      <div id="yt-player-container" className="w-full h-full" />
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center text-white">Loading video...</div>
      )}
    </div>
  );
}
