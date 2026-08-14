import type { Place, PlaceSearchResult } from '@/src/api/contracts';

export interface PlaceSearchOptions {
  near?: Pick<Place, 'lat' | 'lng'>;
}

export interface PlaceSearchProvider {
  searchPlaces(query: string, signal?: AbortSignal, options?: PlaceSearchOptions): Promise<PlaceSearchResult[]>;
  reverseGeocode?(lat: number, lng: number, signal?: AbortSignal): Promise<PlaceSearchResult>;
}
