import { env } from '@/src/config/env';
import { HttpPlaceSearchProvider } from './HttpPlaceSearchProvider';
import { MockPlaceSearchProvider } from './MockPlaceSearchProvider';
import type { PlaceSearchProvider } from './PlaceSearchProvider';

let provider: PlaceSearchProvider | undefined;
export function createPlaceSearchProvider(config = env): PlaceSearchProvider {
  return config.placeSearchMode === 'api' ? new HttpPlaceSearchProvider(config.apiBaseUrl) : new MockPlaceSearchProvider();
}
export function getPlaceSearchProvider(): PlaceSearchProvider {
  provider ??= createPlaceSearchProvider();
  return provider;
}
