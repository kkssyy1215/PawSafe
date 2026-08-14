import { requestJson } from '@/src/api/client';
import { placeSearchResponseSchema, placeSearchResultSchema } from '@/src/api/schemas';
import type { PlaceSearchOptions, PlaceSearchProvider } from './PlaceSearchProvider';

export class HttpPlaceSearchProvider implements PlaceSearchProvider {
  constructor(private readonly baseUrl: string) {}
  searchPlaces(query: string, signal?: AbortSignal, options?: PlaceSearchOptions) {
    const nearbyParams = options?.near
      ? `&lat=${encodeURIComponent(options.near.lat)}&lng=${encodeURIComponent(options.near.lng)}`
      : '';
    return requestJson({
      baseUrl: this.baseUrl,
      path: `/v1/places/search?q=${encodeURIComponent(query)}${nearbyParams}`,
      signal,
      schema: placeSearchResponseSchema,
      timeoutMs: 5_000,
    });
  }
  reverseGeocode(lat: number, lng: number, signal?: AbortSignal) {
    return requestJson({
      baseUrl: this.baseUrl,
      path: '/v1/places/reverse-geocode',
      method: 'POST',
      body: { lat, lng },
      signal,
      schema: placeSearchResultSchema,
      timeoutMs: 5_000,
    });
  }
}
