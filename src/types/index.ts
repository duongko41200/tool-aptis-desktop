export interface VideoSession {
  id: number;
  youtube_url: string;
  title: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  repeat_start_ms: number | null;
  repeat_end_ms: number | null;
  loop_mode: number;
  created_at: string;
  updated_at: string;
}

export interface SubtitleEntry {
  id: number;
  video_session_id: number;
  start_ms: number;
  end_ms: number;
  text: string;
  original_text: string | null;
  sequence: number;
}

export interface TeleprompterSession {
  id: number;
  source_text: string;
  scroll_speed: number;
  font_size: number;
  background_color: string;
  text_color: string;
  created_at: string;
  updated_at: string;
}

export interface Recording {
  id: number;
  session_type: 'shadowing' | 'teleprompter';
  session_id: number;
  audio_path: string;
  duration_ms: number | null;
  transcription: string | null;
  accuracy_score: number | null;
  missed_word_pct: number | null;
  mispronounced_words: string[] | null;
  reading_speed_wpm: number | null;
  created_at: string;
}

export interface WritingSubmission {
  id: number;
  content: string;
  evaluation_mode: 'ielts' | 'toeic' | 'aptis' | 'general';
  overall_score: number | null;
  grammar_score: number | null;
  vocabulary_score: number | null;
  coherence_score: number | null;
  suggestions: string[] | null;
  grammar_corrections: Array<{ original: string; corrected: string }> | null;
  better_sentences: Array<{ original: string; improved: string }> | null;
  ai_raw_response: string | null;
  word_count: number | null;
  created_at: string;
}

export interface WritingEvaluationResult {
  id: number;
  overall_score: number;
  grammar_score: number;
  vocabulary_score: number;
  coherence_score: number;
  suggestions: string[];
  grammar_corrections: Array<{ original: string; corrected: string }>;
  better_sentences: Array<{ original: string; improved: string }>;
}

export interface VocabularyEntry {
  id: number;
  word: string;
  phonetics: string | null;
  meaning: string;
  example: string | null;
  personal_notes: string | null;
  image_path: string | null;
  tags: string | null;
  interval_days: number;
  ease_factor: number;
  due_date: string;
  review_count: number;
  created_at: string;
  updated_at: string;
}

export interface ReviewSession {
  id: number;
  started_at: string;
  ended_at: string | null;
  cards_reviewed: number;
  cards_again: number;
  cards_hard: number;
  cards_good: number;
  cards_easy: number;
}

export interface ReviewCard {
  id: number;
  review_session_id: number;
  vocabulary_entry_id: number;
  rating: 'again' | 'hard' | 'good' | 'easy';
  interval_before: number;
  interval_after: number;
  reviewed_at: string;
}

export interface CapturedContent {
  id: number;
  content: string;
  category: 'vocabulary' | 'speaking' | 'writing' | 'grammar' | 'reading' | 'general';
  folder: string | null;
  personal_notes: string | null;
  ai_summary: string | null;
  ai_vocabulary: string[] | null;
  ai_collocations: string[] | null;
  ai_idioms: string[] | null;
  ai_processed: number;
  embedding: null;
  created_at: string;
  tags?: string[];
}

export interface CapturedTag {
  id: number;
  captured_content_id: number;
  tag: string;
}

export type EvaluationMode = 'ielts' | 'toeic' | 'aptis' | 'general';
export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';
export type ContentCategory = 'vocabulary' | 'speaking' | 'writing' | 'grammar' | 'reading' | 'general';

export interface DueCardsResult {
  cards: VocabularyEntry[];
  total_due: number;
}

export interface ReviewRatingResult {
  next_due_date: string;
  new_interval_days: number;
}

export interface SaveContentResult {
  id: number;
  created_at: string;
}

export interface SearchContentParams {
  query?: string;
  category?: ContentCategory;
  folder?: string;
  date_from?: string;
  date_to?: string;
  tag?: string;
  limit?: number;
  offset?: number;
  [key: string]: unknown;
}

export interface SearchContentResult {
  items: CapturedContent[];
  total: number;
}

export interface AppSettings {
  gemini_api_key?: string;
  clipboard_monitoring_enabled: boolean;
  tts_voice: string;
  default_writing_mode: EvaluationMode;
}
