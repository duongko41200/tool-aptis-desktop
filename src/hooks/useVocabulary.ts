import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getDueCards,
  getVocabularyList,
  addVocabularyEntry,
  submitReviewRating,
  startReviewSession,
  endReviewSession,
} from '../services/tauriCommands';

export function useDueCards() {
  return useQuery({ queryKey: ['due-cards'], queryFn: getDueCards });
}

export function useVocabularyList() {
  return useQuery({ queryKey: ['vocabulary-list'], queryFn: getVocabularyList });
}

export function useAddWord() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: addVocabularyEntry,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vocabulary-list'] });
      qc.invalidateQueries({ queryKey: ['due-cards'] });
    },
  });
}

export function useSubmitRating() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: submitReviewRating,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['due-cards'] }),
  });
}

export function useReviewSession() {
  return {
    start: useMutation({ mutationFn: startReviewSession }),
    end: useMutation({ mutationFn: endReviewSession }),
  };
}
