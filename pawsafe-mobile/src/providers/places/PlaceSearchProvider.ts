import type { PlaceSearchResult } from '@/src/api/contracts';
export interface PlaceSearchProvider {
  searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceSearchResult[]>;
  reverseGeocode?(lat: number, lng: number, signal?: AbortSignal): Promise<PlaceSearchResult>;
}
