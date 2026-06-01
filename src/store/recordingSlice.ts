import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface RecordingState {
  isRecording: boolean;
  sessionId: number | null;
  sessionType: 'shadowing' | 'teleprompter' | null;
  durationMs: number;
}

const initialState: RecordingState = {
  isRecording: false,
  sessionId: null,
  sessionType: null,
  durationMs: 0,
};

const recordingSlice = createSlice({
  name: 'recording',
  initialState,
  reducers: {
    startRecording(state, action: PayloadAction<{ sessionId: number; sessionType: 'shadowing' | 'teleprompter' }>) {
      state.isRecording = true;
      state.sessionId = action.payload.sessionId;
      state.sessionType = action.payload.sessionType;
      state.durationMs = 0;
    },
    updateDuration(state, action: PayloadAction<number>) {
      state.durationMs = action.payload;
    },
    stopRecording(state) {
      state.isRecording = false;
    },
    resetRecording(state) {
      state.isRecording = false;
      state.sessionId = null;
      state.sessionType = null;
      state.durationMs = 0;
    },
  },
});

export const { startRecording, updateDuration, stopRecording, resetRecording } = recordingSlice.actions;
export default recordingSlice.reducer;
