import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { searchCapturedContent, saveCapturedContent, processContentWithAi } from '../services/tauriCommands';
import type { SearchContentParams } from '../types';

export function useSearchContent(filters: SearchContentParams) {
  return useQuery({
    queryKey: ['captured-content', filters],
    queryFn: () => searchCapturedContent(filters),
  });
}

export function useSaveContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveCapturedContent,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['captured-content'] }),
  });
}

export function useProcessWithAI() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: processContentWithAi,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['captured-content'] }),
  });
}
