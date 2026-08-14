import { AppError } from '@/src/api/errors';
import { env } from '@/src/config/env';
import { isInMockCoverage, isInPipelineCoverage, mockPlaces, pipelinePlaces } from '@/src/mocks/places';
import type { PlaceSearchProvider } from './PlaceSearchProvider';

export class MockPlaceSearchProvider implements PlaceSearchProvider {
  async searchPlaces(query: string, signal?: AbortSignal) {
    await new Promise<void>((resolve, reject) => {
      const id = setTimeout(resolve, 220);
      signal?.addEventListener('abort', () => { clearTimeout(id); reject(new AppError('CANCELLED', 'Cancelled')); }, { once: true });
    });
    const needle = query.trim().toLocaleLowerCase('ko-KR');
    const places = env.placeDataset === 'pipeline' ? pipelinePlaces : mockPlaces;
    return places.filter((place) => `${place.name} ${place.address}`.toLocaleLowerCase('ko-KR').includes(needle));
  }
  async reverseGeocode(lat: number, lng: number): Promise<import('@/src/api/contracts').PlaceSearchResult> {
    return {
      id: `current_${lat.toFixed(5)}_${lng.toFixed(5)}`,
      name: '현재 위치',
      address: '현재 기기 위치(일시적 사용)',
      lat,
      lng,
      is_in_coverage: env.placeDataset === 'pipeline' ? isInPipelineCoverage(lat, lng) : isInMockCoverage(lat, lng),
    };
  }
}
