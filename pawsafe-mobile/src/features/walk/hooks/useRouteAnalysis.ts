import { useCallback, useRef, useState } from 'react';
import type { RouteAnalysisRequest, RouteAnalysisResponse } from '@/src/api/contracts';
import { normalizeError, type AppError } from '@/src/api/errors';
import { getAnalysisProvider } from '@/src/providers/analysis/createAnalysisProvider';

export function useRouteAnalysis() {
  const active = useRef<AbortController | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  const cancel = useCallback(() => active.current?.abort(), []);
  const analyze = useCallback(async (request: RouteAnalysisRequest): Promise<RouteAnalysisResponse> => {
    if (active.current) active.current.abort();
    const controller = new AbortController();
    active.current = controller;
    setIsLoading(true);
    setError(null);
    try {
      return await getAnalysisProvider().analyzeRoute(request, controller.signal);
    } catch (caught) {
      const normalized = normalizeError(caught);
      setError(normalized);
      throw normalized;
    } finally {
      if (active.current === controller) active.current = null;
      setIsLoading(false);
    }
  }, []);
  return { analyze, cancel, isLoading, error };
}
