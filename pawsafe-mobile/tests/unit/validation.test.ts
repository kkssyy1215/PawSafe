import type { Place } from '@/src/api/contracts';
import { isSamePlace, toApiPlace, validateWalkForm } from '@/src/features/walk/utils/validation';

const origin: Place = { id: 'home', name: '우리집', address: '서울', lat: 37.55, lng: 126.91 };
const destination: Place = { id: 'park', name: '공원', address: '서울', lat: 37.555, lng: 126.9 };
const now = new Date('2026-08-12T09:00:00.000Z');

describe('walk form validation', () => {
  it('requires search-result selections', () => {
    expect(validateWalkForm({ origin: null, destination, departureAt: new Date(now.getTime() + 60_000), walkMode: 'cool' }, now))
      .toBe('검색 결과에서 출발지를 선택해 주세요.');
    expect(validateWalkForm({ origin, destination: null, departureAt: new Date(now.getTime() + 60_000), walkMode: 'cool' }, now))
      .toBe('검색 결과에서 목적지를 선택해 주세요.');
  });

  it('rejects identical places by id or coordinate', () => {
    expect(isSamePlace(origin, { ...destination, id: origin.id })).toBe(true);
    expect(isSamePlace(origin, { ...destination, lat: origin.lat, lng: origin.lng })).toBe(true);
    expect(validateWalkForm({ origin, destination: { ...destination, id: origin.id }, departureAt: new Date(now.getTime() + 60_000), walkMode: 'cool' }, now))
      .toBe('출발지와 목적지를 다르게 선택해 주세요.');
  });

  it('accepts a valid future walk', () => {
    expect(validateWalkForm({ origin, destination, departureAt: new Date(now.getTime() + 60_000), walkMode: 'fast' }, now)).toBeNull();
  });

  it('rejects a selected place that is outside the reported MVP coverage', () => {
    expect(validateWalkForm({
      origin: { ...origin, is_in_coverage: false } as Place & { is_in_coverage: boolean },
      destination,
      departureAt: new Date(now.getTime() + 60_000),
      walkMode: 'cool',
    }, now)).toBe('MVP 분석 범위 안의 출발지와 목적지를 선택해 주세요.');
  });

  it('removes client-only coverage metadata from API locations', () => {
    expect(toApiPlace({ ...origin, is_in_coverage: true } as Place & { is_in_coverage: boolean })).toEqual(origin);
  });
});
