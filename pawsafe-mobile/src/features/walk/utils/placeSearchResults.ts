import type { PlaceSearchResult } from '@/src/api/contracts';

function addressKey(place: PlaceSearchResult): string {
  return place.address.trim().toLocaleLowerCase('ko-KR');
}

export function uniquePlacesByAddress(places: PlaceSearchResult[]): PlaceSearchResult[] {
  const seen = new Set<string>();

  return places.filter((place) => {
    const key = addressKey(place);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
