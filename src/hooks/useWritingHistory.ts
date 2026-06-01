import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { evaluateWriting, getWritingSubmissions } from '../services/tauriCommands';
import type { EvaluationMode } from '../types';

export function useWritingHistory() {
  return useQuery({
    queryKey: ['writing-submissions'],
    queryFn: getWritingSubmissions,
  });
}

export function useEvaluateWriting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ content, mode }: { content: string; mode: EvaluationMode }) =>
      evaluateWriting(content, mode),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['writing-submissions'] }),
  });
}
