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
}

const initialState: AppState = {
  activeTab: 'shadowing',
  isOnline: navigator.onLine,
  pendingVocabWord: null,
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
  },
});

export const { setActiveTab, setOnlineStatus, setPendingVocabWord } = appSlice.actions;
export default appSlice.reducer;
