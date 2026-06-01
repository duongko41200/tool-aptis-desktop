import { useEffect, useRef } from 'react';

interface Props {
  text: string;
  scrollSpeed: number;
  fontSize: number;
  backgroundColor: string;
  textColor: string;
  isScrolling: boolean;
}

export default function TeleprompterDisplay({
  text, scrollSpeed, fontSize, backgroundColor, textColor, isScrolling
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!isScrolling) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      return;
    }
    const pxPerMs = scrollSpeed * 0.05;
    let lastTime: number | null = null;
    const animate = (time: number) => {
      if (lastTime !== null) {
        container.scrollTop += pxPerMs * (time - lastTime);
      }
      lastTime = time;
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [isScrolling, scrollSpeed]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden p-8"
      style={{ backgroundColor, color: textColor, fontSize: `${fontSize}px`, lineHeight: 1.6 }}
    >
      <div className="whitespace-pre-wrap">{text}</div>
      <div className="h-screen" />
    </div>
  );
}
