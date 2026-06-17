import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type Tab = 'shadowing' | 'teleprompter' | 'writing' | 'vocabulary' | 'clipboard' | 'settings';

export interface PendingVocabWord {
  word: string;
  meaning: string;
  sourceContent?: string;
}

export interface TweakValues {
  accent:     string;
  overlay:    number;
  glassAlpha: number;
  glassBlur:  number;
  rain:       boolean;
  font:       string;
}

export const DEFAULT_TWEAKS: TweakValues = {
  accent:     '#d9e89d',
  overlay:    0.34,
  glassAlpha: 0.74,
  glassBlur:  18,
  rain:       true,
  font:       'Plus Jakarta Sans',
};

const loadTweaks = (): TweakValues => {
  try {
    const saved = localStorage.getItem('TWEAKS');
    if (saved) return { ...DEFAULT_TWEAKS, ...JSON.parse(saved) };
  } catch (e) {}
  return DEFAULT_TWEAKS;
}

interface AppState {
  activeTab: Tab;
  isOnline: boolean;
  pendingVocabWord: PendingVocabWord | null;
  isActivated: boolean;
  dailyReminder: boolean;
  tweaks: TweakValues;
}

const initialState: AppState = {
  activeTab: 'shadowing',
  isOnline: navigator.onLine,
  pendingVocabWord: null,
  isActivated: localStorage.getItem('APTIS_ACTIVATED') === 'true',
  dailyReminder: localStorage.getItem('DAILY_REMINDER') !== 'false',
  tweaks: loadTweaks(),
};

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setActiveTab(state, action: PayloadAction<Tab>) {
      state.activeTab = action.payload;
    },
    setOnlineStatus(state, action: PayloadAction<boolean>) {
      state.isOnline = action.payload;
    },
    setPendingVocabWord(state, action: PayloadAction<PendingVocabWord | null>) {
      state.pendingVocabWord = action.payload;
    },
    setActivated(state, action: PayloadAction<boolean>) {
      state.isActivated = action.payload;
      if (action.payload) {
        localStorage.setItem('APTIS_ACTIVATED', 'true');
      } else {
        localStorage.removeItem('APTIS_ACTIVATED');
      }
    },
    setDailyReminder(state, action: PayloadAction<boolean>) {
      state.dailyReminder = action.payload;
      localStorage.setItem('DAILY_REMINDER', String(action.payload));
    },
    setTweak(state, action: PayloadAction<{ key: keyof TweakValues, value: any }>) {
      const { key, value } = action.payload;
      (state.tweaks as any)[key] = value;
      localStorage.setItem('TWEAKS', JSON.stringify(state.tweaks));
    },
    resetTweaks(state) {
      state.tweaks = DEFAULT_TWEAKS;
      localStorage.setItem('TWEAKS', JSON.stringify(DEFAULT_TWEAKS));
    },
  },
});

export const { setActiveTab, setOnlineStatus, setPendingVocabWord, setActivated, setDailyReminder, setTweak, resetTweaks } = appSlice.actions;
export default appSlice.reducer;
