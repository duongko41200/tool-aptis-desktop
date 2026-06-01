import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type Tab = 'shadowing' | 'teleprompter' | 'writing' | 'vocabulary' | 'clipboard' | 'settings';

interface AppState {
  activeTab: Tab;
  isOnline: boolean;
}

const initialState: AppState = {
  activeTab: 'shadowing',
  isOnline: navigator.onLine,
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
  },
});

export const { setActiveTab, setOnlineStatus } = appSlice.actions;
export default appSlice.reducer;
