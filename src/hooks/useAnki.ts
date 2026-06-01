import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getDecks, createDeck, deleteDeck,
  createNote, updateNote, deleteNote,
  getNotesForDeck, getDueCardsForDeck,
  submitCardRating, buryCard, suspendCard, flagCard,
  createNoteFromClipboard,
} from '../services/tauriCommands';

export function useDecks() {
  return useQuery({ queryKey: ['anki-decks'], queryFn: getDecks, staleTime: 5000 });
}

export function useNotesForDeck(deckId: number | null, opts?: { includeSubdecks?: boolean; tagFilter?: string; search?: string }) {
  return useQuery({
    queryKey: ['anki-notes', deckId, opts],
    queryFn: () => getNotesForDeck({ deckId: deckId!, includeSubdecks: opts?.includeSubdecks ?? true, tagFilter: opts?.tagFilter, search: opts?.search }),
    enabled: deckId !== null,
  });
}

export function useDueCards(deckId: number | null, includeSubdecks = true) {
  return useQuery({
    queryKey: ['anki-due', deckId, includeSubdecks],
    queryFn: () => getDueCardsForDeck({ deckId: deckId!, includeSubdecks }),
    enabled: deckId !== null,
    staleTime: 3000,
  });
}

export function useCreateDeck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, parentDeckId }: { name: string; parentDeckId?: number }) =>
      createDeck(name, parentDeckId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['anki-decks'] }),
  });
}

export function useDeleteDeck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteDeck(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['anki-decks'] }),
  });
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createNote,
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['anki-notes', vars.deckId] });
      qc.invalidateQueries({ queryKey: ['anki-due'] });
      qc.invalidateQueries({ queryKey: ['anki-decks'] });
    },
  });
}

export function useUpdateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateNote,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['anki-notes'] });
      qc.invalidateQueries({ queryKey: ['anki-due'] });
    },
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteNote(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['anki-notes'] });
      qc.invalidateQueries({ queryKey: ['anki-due'] });
      qc.invalidateQueries({ queryKey: ['anki-decks'] });
    },
  });
}

export function useSubmitRating() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cardId, rating }: { cardId: number; rating: string }) =>
      submitCardRating(cardId, rating),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['anki-decks'] });
    },
  });
}

export function useBuryCard() {
  return useMutation({ mutationFn: (cardId: number) => buryCard(cardId) });
}

export function useSuspendCard() {
  return useMutation({
    mutationFn: ({ cardId, suspended }: { cardId: number; suspended: boolean }) =>
      suspendCard(cardId, suspended),
  });
}

export function useFlagCard() {
  return useMutation({
    mutationFn: ({ cardId, color }: { cardId: number; color: string | null }) =>
      flagCard(cardId, color),
  });
}

export function useCreateNoteFromClipboard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createNoteFromClipboard,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['anki-notes'] });
      qc.invalidateQueries({ queryKey: ['anki-due'] });
      qc.invalidateQueries({ queryKey: ['anki-decks'] });
    },
  });
}
