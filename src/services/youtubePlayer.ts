type YTPlayer = {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  loadVideoById(videoId: string): void;
  destroy(): void;
};

declare global {
  interface Window {
    YT: {
      Player: new (elementId: string, config: object) => YTPlayer;
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

let apiReady = false;
let readyCallbacks: Array<() => void> = [];

function loadYTApi() {
  if (document.getElementById('yt-iframe-api')) return;
  const script = document.createElement('script');
  script.id = 'yt-iframe-api';
  script.src = 'https://www.youtube.com/iframe_api';
  document.head.appendChild(script);
}

function onApiReady(cb: () => void) {
  if (apiReady) { cb(); return; }
  readyCallbacks.push(cb);
  loadYTApi();
}

window.onYouTubeIframeAPIReady = () => {
  apiReady = true;
  readyCallbacks.forEach((cb) => cb());
  readyCallbacks = [];
};

export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export class YouTubePlayer {
  private player: YTPlayer | null = null;
  private containerId: string;
  private timeCallbacks: Array<(ms: number) => void> = [];
  private pollInterval: number | null = null;

  constructor(containerId: string) {
    this.containerId = containerId;
  }

  loadVideo(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const videoId = extractVideoId(url);
      if (!videoId) { reject(new Error('Invalid YouTube URL')); return; }
      onApiReady(() => {
        this.player = new window.YT.Player(this.containerId, {
          videoId,
          events: {
            onReady: () => {
              this.startPolling();
              resolve();
            },
            onError: (e: { data: number }) => reject(new Error(`YT error: ${e.data}`)),
          },
          playerVars: { autoplay: 0, controls: 1, rel: 0 },
        });
      });
    });
  }

  private startPolling() {
    this.pollInterval = window.setInterval(() => {
      if (this.player) {
        const ms = this.player.getCurrentTime() * 1000;
        this.timeCallbacks.forEach((cb) => cb(ms));
      }
    }, 250);
  }

  onTimeUpdate(callback: (ms: number) => void) {
    this.timeCallbacks.push(callback);
  }

  play() { this.player?.playVideo(); }
  pause() { this.player?.pauseVideo(); }
  seekTo(ms: number) { this.player?.seekTo(ms / 1000, true); }
  getCurrentTime() { return (this.player?.getCurrentTime() ?? 0) * 1000; }

  destroy() {
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.player?.destroy();
    this.player = null;
    this.timeCallbacks = [];
  }
}
