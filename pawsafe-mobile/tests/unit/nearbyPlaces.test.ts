import type { PlaceSearchResult } from '@/src/api/contracts';
import { distanceBetweenPlaces, formatNearbyDistance, sortNearbyWalkPlaces } from '@/src/features/walk/utils/nearbyPlaces';

const origin: PlaceSearchResult = { id: 'origin', name: '출발지', address: '서울', lat: 37.55, lng: 126.91, is_in_coverage: true };
const near: PlaceSearchResult = { id: 'near', name: '가까운 공원', address: '서울', lat: 37.551, lng: 126.91, is_in_coverage: true };
const far: PlaceSearchResult = { id: 'far', name: '먼 산책로', address: '서울', lat: 37.56, lng: 126.91, is_in_coverage: true };
const outside: PlaceSearchResult = { id: 'outside', name: '범위 밖 공원', address: '서울', lat: 37.7, lng: 127.1, is_in_coverage: false };
const scenario: PlaceSearchResult = { id: 'scenario_demo', name: '데모 산책로', address: '서울', lat: 37.5505, lng: 126.91, is_in_coverage: true };

describe('nearby walk place helpers', () => {
  it('sorts covered places from the selected origin and removes duplicates', () => {
    expect(sortNearbyWalkPlaces([far, outside, scenario, near, near], origin).map((place) => place.id)).toEqual(['near', 'far']);
  });

  it('calculates and formats a readable straight-line distance', () => {
    const distance = distanceBetweenPlaces(origin, near);
    expect(distance).toBeGreaterThan(100);
    expect(distance).toBeLessThan(120);
    expect(formatNearbyDistance(distance)).toBe('110m');
    expect(formatNearbyDistance(1_240)).toBe('1.2km');
  });
});
