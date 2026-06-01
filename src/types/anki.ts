export interface Deck {
  id: number;
  name: string;
  parent_deck_id: number | null;
  full_name: string;
  created_at: string;
  new_count: number;
  learning_count: number;
  review_count: number;
}

export interface Note {
  id: number;
  deck_id: number;
  template_type: 'basic' | 'reverse' | 'basic_reverse' | 'cloze';
  front: string;
  back: string | null;
  example: string | null;
  personal_notes: string | null;
  tags: string | null;
  created_at: string;
  updated_at: string;
}

export interface Card {
  id: number;
  note_id: number;
  card_type: string;
  state: 'new' | 'learning' | 'review';
  current_step: number;
  due_date: string;
  interval_days: number;
  ease_factor: number;
  review_count: number;
  suspended: number;
  buried_until: string | null;
  flag_color: 'red' | 'yellow' | 'green' | null;
  created_at: string;
  // joined
  front?: string | null;
  back?: string | null;
  example?: string | null;
  template_type?: string | null;
  deck_id?: number | null;
}

export interface DueCardsResult {
  cards: Card[];
  new_count: number;
  learning_count: number;
  review_count: number;
}

export interface RatingResult {
  next_due_date: string;
  new_interval_days: number;
  new_state: 'new' | 'learning' | 'review';
}

export type CardRating = 'again' | 'hard' | 'good' | 'easy';
export type FlagColor = 'red' | 'yellow' | 'green' | null;
export type TemplateType = 'basic' | 'reverse' | 'basic_reverse' | 'cloze';
