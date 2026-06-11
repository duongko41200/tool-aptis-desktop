import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

// Breakpoints aligned with Tailwind but in desktop-app context
// "md"  = cửa sổ nhỏ hơn 1100px — TopBar bị ẩn, FloatingNav thay thế
// "2xl" = cửa sổ nhỏ hơn 1440px — dùng layout compact (giống md) trên writing/listening
// "3xl" = cửa sổ rộng hơn 1440px — layout 2 cột, TopBar hiển thị
export const MD_BREAKPOINT    = '(max-width: 1100px)';
export const TWO_XL_BREAKPOINT = '(max-width: 1440px)';
