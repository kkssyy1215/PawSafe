import type { Place, PlaceSearchResult } from '@/src/api/contracts';

const EARTH_RADIUS_M = 6_371_000;
const toRadians = (value: number) => value * Math.PI / 180;

export function distanceBetweenPlaces(first: Pick<Place, 'lat' | 'lng'>, second: Pick<Place, 'lat' | 'lng'>): number {
  const latitudeDelta = toRadians(second.lat - first.lat);
  const longitudeDelta = toRadians(second.lng - first.lng);
  const firstLatitude = toRadians(first.lat);
  const secondLatitude = toRadians(second.lat);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(firstLatitude) * Math.cos(secondLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function sortNearbyWalkPlaces(places: PlaceSearchResult[], origin: Place | null): PlaceSearchResult[] {
  const unique = [...new Map(
    places
      .filter((place) => place.is_in_coverage && !place.id.startsWith('scenario_'))
      .map((place) => [place.id, place]),
  ).values()];
  if (!origin) return unique;
  return unique
    .filter((place) => place.id !== origin.id)
    .sort((first, second) => distanceBetweenPlaces(origin, first) - distanceBetweenPlaces(origin, second));
}

export function formatNearbyDistance(distanceM: number): string {
  if (distanceM < 1_000) return `${Math.max(10, Math.round(distanceM / 10) * 10)}m`;
  return `${(distanceM / 1_000).toFixed(1)}km`;
}
