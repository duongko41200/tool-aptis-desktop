import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type Tab = 'shadowing' | 'teleprompter' | 'writing' | 'vocabulary' | 'clipboard' | 'settings';

export interface PendingVocabWord {
  word: string;
  meaning: string;
  sourceContent?: string;
}

interface AppState {
  activeTab: Tab;
  isOnline: boolean;
  pendingVocabWord: PendingVocabWord | null;
  isActivated: boolean;
}

const initialState: AppState = {
  activeTab: 'shadowing',
  isOnline: navigator.onLine,
  pendingVocabWord: null,
  isActivated: localStorage.getItem('APTIS_ACTIVATED') === 'true',
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
  },
});

export const { setActiveTab, setOnlineStatus, setPendingVocabWord, setActivated } = appSlice.actions;
export default appSlice.reducer;
