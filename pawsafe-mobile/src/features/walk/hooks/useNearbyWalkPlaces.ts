import { useEffect, useState } from 'react';
import type { Place, PlaceSearchResult } from '@/src/api/contracts';
import { getPlaceSearchProvider } from '@/src/providers/places/createPlaceSearchProvider';

const NEARBY_SEARCH_QUERIES = ['공원', '산책로', '숲길'] as const;

interface NearbyWalkPlacesState {
  places: PlaceSearchResult[];
  isLoading: boolean;
  hasError: boolean;
}

export function useNearbyWalkPlaces(origin: Place | null): NearbyWalkPlacesState {
  const [state, setState] = useState<NearbyWalkPlacesState>({
    places: [],
    isLoading: false,
    hasError: false,
  });

  useEffect(() => {
    if (!origin) {
      setState({ places: [], isLoading: false, hasError: false });
      return;
    }

    const controller = new AbortController();
    const provider = getPlaceSearchProvider();

    setState({ places: [], isLoading: true, hasError: false });

    const loadNearbyPlaces = async () => {
      try {
        const responses = await Promise.all(
          NEARBY_SEARCH_QUERIES.map((query) => provider.searchPlaces(
            query,
            controller.signal,
            { near: origin },
          )),
        );

        if (!controller.signal.aborted) {
          setState({ places: responses.flat(), isLoading: false, hasError: false });
        }
      } catch {
        if (!controller.signal.aborted) {
          setState({ places: [], isLoading: false, hasError: true });
        }
      }
    };

    void loadNearbyPlaces();
    return () => controller.abort();
  }, [origin]);

  return state;
}
