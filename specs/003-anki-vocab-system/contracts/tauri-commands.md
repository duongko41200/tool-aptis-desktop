# Tauri IPC Contracts: Anki Vocab System

**Branch**: `003-anki-vocab-system` | **Date**: 2026-06-01

---

## Deck Commands

### `get_decks`
```typescript
invoke('get_decks'): Promise<Deck[]>
// Trả về toàn bộ cây deck, mỗi deck có full_name = "Parent::Child"
// và stats (new_count, learning_count, review_count)
```

### `create_deck`
```typescript
invoke('create_deck', {
  name: string,           // "Vocabulary"
  parentDeckId?: number   // ID của parent deck, nếu có
}): Promise<Deck>
// Lỗi nếu tên trùng trong cùng cấp
```

### `delete_deck`
```typescript
invoke('delete_deck', { id: number }): Promise<void>
// CASCADE xóa notes + cards bên trong
```

---

## Note Commands

### `create_note`
```typescript
invoke('create_note', {
  deckId: number,
  templateType: 'basic' | 'reverse' | 'basic_reverse' | 'cloze',
  front: string,
  back?: string,
  example?: string,
  tags?: string
}): Promise<{ note: Note; cards: Card[] }>
// Tự sinh cards từ template:
// basic → 1 card (forward)
// reverse → 1 card (reverse)  
// basic_reverse → 2 cards (forward + reverse)
// cloze → N cards (cloze_1, cloze_2, ... mỗi cloze group)
```

### `update_note`
```typescript
invoke('update_note', {
  id: number,
  front?: string,
  back?: string,
  example?: string,
  tags?: string
}): Promise<{ note: Note; cards: Card[] }>
// Re-generate cards nếu front thay đổi (với cloze)
```

### `delete_note`
```typescript
invoke('delete_note', { id: number }): Promise<void>
// CASCADE xóa tất cả cards
```

### `get_notes_for_deck`
```typescript
invoke('get_notes_for_deck', {
  deckId: number,
  includeSubdecks: boolean,  // true = dùng recursive CTE
  tagFilter?: string,
  search?: string
}): Promise<Note[]>
```

---

## Card / Review Commands

### `get_due_cards_for_deck`
```typescript
invoke('get_due_cards_for_deck', {
  deckId: number,
  includeSubdecks: boolean
}): Promise<{
  cards: Card[],
  new_count: number,
  learning_count: number,
  review_count: number
}>
// Chỉ trả về cards: state=new OR due_date<=now AND NOT suspended AND (buried_until IS NULL OR buried_until<=now)
// Limit: max 20 new cards/session (cài được)
```

### `submit_card_rating`
```typescript
invoke('submit_card_rating', {
  cardId: number,
  rating: 'again' | 'hard' | 'good' | 'easy'
}): Promise<ReviewRatingResult>
// Áp dụng state machine (new/learning/review)
// Ghi ReviewLog
```

### `bury_card`
```typescript
invoke('bury_card', { cardId: number }): Promise<void>
// buried_until = tomorrow 04:00
```

### `suspend_card`
```typescript
invoke('suspend_card', { cardId: number, suspended: boolean }): Promise<void>
```

### `flag_card`
```typescript
invoke('flag_card', {
  cardId: number,
  color: 'red' | 'yellow' | 'green' | null
}): Promise<void>
```

---

## Session Stats

### `end_review_session_v2`
```typescript
invoke('end_review_session_v2', {
  sessionId: number
}): Promise<{
  total_reviewed: number,
  again: number, hard: number, good: number, easy: number,
  new_graduated: number   // số thẻ new đã chuyển sang learning/review
}>
```

---

## Clipboard Integration

### `create_note_from_clipboard`
```typescript
invoke('create_note_from_clipboard', {
  deckId: number,
  templateType: 'basic' | 'cloze',
  front: string,
  back?: string,
  clozeText?: string,   // nếu template=cloze, đây là text đã có {{c1::...}}
  tags?: string,
  capturedContentId?: number  // link về captured_content nếu muốn
}): Promise<{ note: Note; cards: Card[] }>
```
