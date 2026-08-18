import { env } from '@/src/config/env';
import { HttpPlaceSearchProvider } from './HttpPlaceSearchProvider';
import type { PlaceSearchProvider } from './PlaceSearchProvider';

let provider: PlaceSearchProvider | undefined;
export function createPlaceSearchProvider(config = env): PlaceSearchProvider {
  return new HttpPlaceSearchProvider(config.apiBaseUrl);
}
export function getPlaceSearchProvider(): PlaceSearchProvider {
  provider ??= createPlaceSearchProvider();
  return provider;
}
