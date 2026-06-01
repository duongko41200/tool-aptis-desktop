import { invoke } from '@tauri-apps/api/core';
import type {
  VideoSession,
  SubtitleEntry,
  TeleprompterSession,
  Recording,
  WritingEvaluationResult,
  WritingSubmission,
  VocabularyEntry,
  ReviewSession,
  DueCardsResult,
  ReviewRatingResult,
  CapturedContent,
  SaveContentResult,
  SearchContentParams,
  SearchContentResult,
  AppSettings,
  EvaluationMode,
  ReviewRating,
} from '../types';

// Settings
export const saveSettings = (settings: Partial<AppSettings>) =>
  invoke<void>('save_settings', { settings });

export const getSettings = () =>
  invoke<AppSettings>('get_settings');

// Speaking — Shadowing
export const createVideoSession = (youtubeUrl: string) =>
  invoke<VideoSession>('create_video_session', { youtubeUrl });

export const importSubtitles = (sessionId: number, srtContent: string) =>
  invoke<SubtitleEntry[]>('import_subtitles', { sessionId, srtContent });

export const updateSubtitleEntry = (id: number, text: string) =>
  invoke<void>('update_subtitle_entry', { id, text });

export const getSubtitlesForSession = (sessionId: number) =>
  invoke<SubtitleEntry[]>('get_subtitles_for_session', { sessionId });

// Speaking — Teleprompter
export const createTeleprompterSession = (sourceText: string) =>
  invoke<TeleprompterSession>('create_teleprompter_session', { sourceText });

export const updateTeleprompterSession = (
  id: number,
  updates: Partial<TeleprompterSession>
) => invoke<void>('update_teleprompter_session', { id, updates });

// Speaking — Recording
export const saveRecording = (params: {
  sessionType: 'shadowing' | 'teleprompter';
  sessionId: number;
  audioData: number[];
  durationMs: number;
}) => invoke<Recording>('save_recording', params);

// Writing
export const evaluateWriting = (content: string, mode: EvaluationMode) =>
  invoke<WritingEvaluationResult>('evaluate_writing', { content, mode });

export const getWritingSubmissions = () =>
  invoke<WritingSubmission[]>('get_writing_submissions');

// Vocabulary
export const addVocabularyEntry = (entry: {
  word: string;
  phonetics?: string;
  meaning: string;
  example?: string;
  personal_notes?: string;
  tags?: string;
}) => invoke<VocabularyEntry>('add_vocabulary_entry', { entry });

export const getDueCards = () =>
  invoke<DueCardsResult>('get_due_cards');

export const submitReviewRating = (params: {
  reviewSessionId: number;
  vocabularyEntryId: number;
  rating: ReviewRating;
}) => invoke<ReviewRatingResult>('submit_review_rating', params);

export const startReviewSession = () =>
  invoke<ReviewSession>('start_review_session');

export const endReviewSession = (id: number) =>
  invoke<ReviewSession>('end_review_session', { id });

export const getVocabularyList = () =>
  invoke<VocabularyEntry[]>('get_vocabulary_list');

// Clipboard
export const saveCapturedContent = (params: {
  content: string;
  category: string;
  folder?: string;
  tags?: string[];
  personalNotes?: string;
}) => invoke<SaveContentResult>('save_captured_content', params);

export const searchCapturedContent = (params: SearchContentParams) =>
  invoke<SearchContentResult>('search_captured_content', params);

export const processContentWithAi = (id: number) =>
  invoke<CapturedContent>('process_content_with_ai', { id });

export const toggleClipboardMonitoring = (enabled: boolean) =>
  invoke<void>('toggle_clipboard_monitoring', { enabled });

export const getClipboardStatus = () =>
  invoke<{ enabled: boolean }>('get_clipboard_status');

export const showClipboardPopup = () =>
  invoke<void>('show_clipboard_popup');

export const hideClipboardPopup = () =>
  invoke<void>('hide_clipboard_popup');
