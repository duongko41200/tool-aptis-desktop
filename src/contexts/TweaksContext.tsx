import { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface TweakValues {
  accent:     string;
  overlay:    number;
  glassAlpha: number;
  glassBlur:  number;
  rain:       boolean;
  font:       string;
}

interface TweaksContextType {
  tweaks:      TweakValues;
  setTweak:    <K extends keyof TweakValues>(k: K, v: TweakValues[K]) => void;
  resetTweaks: () => void;
  isOpen:      boolean;
  openTweaks:  () => void;
  closeTweaks: () => void;
}

const DEFAULTS: TweakValues = {
  accent:     '#d9e89d',
  overlay:    0.34,
  glassAlpha: 0.74,
  glassBlur:  18,
  rain:       true,
  font:       'Plus Jakarta Sans',
};

const ACCENTS = ['#d9e89d', '#bef264', '#a7e8c4', '#f6c177', '#c7b8f0'];

// Darken/lighten a hex by percent (negative = darker)
function shade(hex: string, pct: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = pct / 100;
  const adj = (c: number) => Math.max(0, Math.min(255, Math.round(c + (f < 0 ? c * f : (255 - c) * f))));
  return '#' + [adj(r), adj(g), adj(b)].map((c) => c.toString(16).padStart(2, '0')).join('');
}

const TweaksContext = createContext<TweaksContextType | null>(null);

export function TweaksProvider({ children }: { children: React.ReactNode }) {
  const [tweaks, setTweaks] = useState<TweakValues>(DEFAULTS);
  const [isOpen, setIsOpen] = useState(false);

  const setTweak = useCallback(<K extends keyof TweakValues>(k: K, v: TweakValues[K]) => {
    setTweaks((prev) => ({ ...prev, [k]: v }));
  }, []);

  const resetTweaks = useCallback(() => setTweaks(DEFAULTS), []);

  // Apply CSS variables whenever tweaks change
  useEffect(() => {
    const r = document.documentElement.style;
    r.setProperty('--accent',       tweaks.accent);
    r.setProperty('--accent-strong', shade(tweaks.accent, -8));
    r.setProperty('--accent-deep',   shade(tweaks.accent, -20));
    r.setProperty('--overlay',       String(tweaks.overlay));
    r.setProperty('--glass-alpha',   String(tweaks.glassAlpha));
    r.setProperty('--glass-blur',    tweaks.glassBlur + 'px');
    r.setProperty('--glass',  `rgba(255,255,255,${tweaks.glassAlpha})`);
    r.setProperty('--glass-2', `rgba(255,255,255,${Math.max(0.32, tweaks.glassAlpha - 0.16)})`);
    r.setProperty('--font', `'${tweaks.font}', ui-sans-serif, system-ui, sans-serif`);
  }, [tweaks]);

  return (
    <TweaksContext.Provider value={{
      tweaks, setTweak, resetTweaks,
      isOpen,
      openTweaks:  () => setIsOpen(true),
      closeTweaks: () => setIsOpen(false),
    }}>
      {children}
    </TweaksContext.Provider>
  );
}

export function useTweaks() {
  const ctx = useContext(TweaksContext);
  if (!ctx) throw new Error('useTweaks must be used inside TweaksProvider');
  return ctx;
}

export { ACCENTS, DEFAULTS };
