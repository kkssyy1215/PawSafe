import { useEffect, useRef, useState } from 'react';
import type { PlaceSearchResult } from '@/src/api/contracts';
import { AppError, normalizeError } from '@/src/api/errors';
import { PLACE_SEARCH_DEBOUNCE_MS, PLACE_SEARCH_MIN_LENGTH } from '@/src/config/constants';
import { getPlaceSearchProvider } from '@/src/providers/places/createPlaceSearchProvider';

export function usePlaceSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [resolvedQuery, setResolvedQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    const currentRequest = ++requestId.current;
    if (trimmed.length < PLACE_SEARCH_MIN_LENGTH) {
      setResults([]);
      setResolvedQuery('');
      setError(null);
      setIsLoading(false);
      return;
    }
    const controller = new AbortController();
    setResults([]);
    setResolvedQuery('');
    const timeout = setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      try {
        const places = await getPlaceSearchProvider().searchPlaces(trimmed, controller.signal);
        if (requestId.current === currentRequest) {
          setResults(places);
          setResolvedQuery(trimmed);
        }
      } catch (caught) {
        const normalized = normalizeError(caught);
        if (normalized.code !== 'CANCELLED' && requestId.current === currentRequest) setError(normalized);
      } finally {
        if (requestId.current === currentRequest) setIsLoading(false);
      }
    }, PLACE_SEARCH_DEBOUNCE_MS);
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [query]);

  return { query, setQuery, results, resolvedQuery, isLoading, error, minimumLength: PLACE_SEARCH_MIN_LENGTH };
}
