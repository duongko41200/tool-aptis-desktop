import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type PomodoroMode = 'focus' | 'short' | 'long';

export interface PomodoroDurations {
  focus: number;
  short: number;
  long: number;
}

export interface PomodoroState {
  mode: PomodoroMode;
  running: boolean;
  sessions: number;
  mins: PomodoroDurations;
  volume: number;       // Alarm volume
  musicEnabled: boolean; // Background music switch
  musicVolume: number;   // Background music volume
  left: number; // In seconds
  isRinging: boolean;
}

const loadSettings = () => {
  try {
    const saved = localStorage.getItem('pomodoroSettings');
    if (saved) return JSON.parse(saved);
  } catch(e) {}
  return { mins: { focus: 25, short: 5, long: 15 }, volume: 50, musicEnabled: false, musicVolume: 30 };
};

const initialSettings = loadSettings();

const initialState: PomodoroState = {
  mode: 'focus',
  running: false,
  sessions: 0,
  mins: initialSettings.mins || { focus: 25, short: 5, long: 15 },
  volume: initialSettings.volume ?? 50,
  musicEnabled: initialSettings.musicEnabled ?? false,
  musicVolume: initialSettings.musicVolume ?? 30,
  left: (initialSettings.mins?.focus || 25) * 60,
  isRinging: false,
};

const pomodoroSlice = createSlice({
  name: 'pomodoro',
  initialState,
  reducers: {
    setMode: (state, action: PayloadAction<PomodoroMode>) => {
      state.mode = action.payload;
      state.running = false;
      state.left = state.mins[action.payload] * 60;
    },
    setRunning: (state, action: PayloadAction<boolean>) => {
      state.running = action.payload;
    },
    tick: (state) => {
      if (state.running && state.left > 0) {
        state.left -= 1;
      }
    },
    timerComplete: (state) => {
      state.running = false;
      if (state.mode === 'focus') {
        state.sessions = Math.min(state.sessions + 1, 4);
      }
      state.left = 0;
    },
    resetTimer: (state) => {
      state.running = false;
      state.left = state.mins[state.mode] * 60;
    },
    setMins: (state, action: PayloadAction<{ mode: PomodoroMode, val: number }>) => {
      state.mins[action.payload.mode] = action.payload.val;
      if (!state.running) {
        state.left = state.mins[state.mode] * 60;
      }
      localStorage.setItem('pomodoroSettings', JSON.stringify({ mins: state.mins, volume: state.volume, musicEnabled: state.musicEnabled, musicVolume: state.musicVolume }));
    },
    setVolume: (state, action: PayloadAction<number>) => {
      state.volume = action.payload;
      localStorage.setItem('pomodoroSettings', JSON.stringify({ mins: state.mins, volume: state.volume, musicEnabled: state.musicEnabled, musicVolume: state.musicVolume }));
    },
    setMusicEnabled: (state, action: PayloadAction<boolean>) => {
      state.musicEnabled = action.payload;
      localStorage.setItem('pomodoroSettings', JSON.stringify({ mins: state.mins, volume: state.volume, musicEnabled: state.musicEnabled, musicVolume: state.musicVolume }));
    },
    setMusicVolume: (state, action: PayloadAction<number>) => {
      state.musicVolume = action.payload;
      localStorage.setItem('pomodoroSettings', JSON.stringify({ mins: state.mins, volume: state.volume, musicEnabled: state.musicEnabled, musicVolume: state.musicVolume }));
    },
    setIsRinging: (state, action: PayloadAction<boolean>) => {
      state.isRinging = action.payload;
    }
  }
});

export const { 
  setMode, 
  setRunning, 
  tick, 
  timerComplete, 
  resetTimer, 
  setMins, 
  setVolume, 
  setMusicEnabled,
  setMusicVolume,
  setIsRinging 
} = pomodoroSlice.actions;

export default pomodoroSlice.reducer;
