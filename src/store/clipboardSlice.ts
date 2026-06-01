import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ClipboardState {
  popupVisible: boolean;
  pendingContent: string | null;
  pendingCharCount: number;
}

const initialState: ClipboardState = {
  popupVisible: false,
  pendingContent: null,
  pendingCharCount: 0,
};

const clipboardSlice = createSlice({
  name: 'clipboard',
  initialState,
  reducers: {
    showPopup(state, action: PayloadAction<{ content: string; char_count: number }>) {
      state.popupVisible = true;
      state.pendingContent = action.payload.content;
      state.pendingCharCount = action.payload.char_count;
    },
    hidePopup(state) {
      state.popupVisible = false;
      state.pendingContent = null;
      state.pendingCharCount = 0;
    },
  },
});

export const { showPopup, hidePopup } = clipboardSlice.actions;
export default clipboardSlice.reducer;
