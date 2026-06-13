import { configureStore } from '@reduxjs/toolkit';
import appReducer from './appSlice';
import clipboardReducer from './clipboardSlice';
import recordingReducer from './recordingSlice';
import writingHistoryReducer from './writingHistorySlice';

export const store = configureStore({
  reducer: {
    app: appReducer,
    clipboard: clipboardReducer,
    recording: recordingReducer,
    writingHistory: writingHistoryReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
