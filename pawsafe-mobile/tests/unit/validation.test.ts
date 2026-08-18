import type { Place } from '@/src/api/contracts';
import { isSamePlace, toApiPlace, validateWalkForm } from '@/src/features/walk/utils/validation';

const origin: Place = { id: 'home', name: '우리집', address: '서울', lat: 37.55, lng: 126.91 };
const destination: Place = { id: 'park', name: '공원', address: '서울', lat: 37.555, lng: 126.9 };
describe('walk form validation', () => {
  it('requires registered-place selections', () => {
    expect(validateWalkForm({ origin: null, destination, walkMode: 'cool' }))
      .toBe('등록된 출발지를 선택해 주세요.');
    expect(validateWalkForm({ origin, destination: null, walkMode: 'cool' }))
      .toBe('등록된 목적지를 선택해 주세요.');
  });

  it('rejects identical places by id or coordinate', () => {
    expect(isSamePlace(origin, { ...destination, id: origin.id })).toBe(true);
    expect(isSamePlace(origin, { ...destination, lat: origin.lat, lng: origin.lng })).toBe(true);
    expect(validateWalkForm({ origin, destination: { ...destination, id: origin.id }, walkMode: 'cool' }))
      .toBe('출발지와 목적지를 다르게 선택해 주세요.');
  });

  it('accepts a valid current-time walk', () => {
    expect(validateWalkForm({ origin, destination, walkMode: 'fast' })).toBeNull();
  });

  it('rejects a selected place that is outside the reported MVP coverage', () => {
    expect(validateWalkForm({
      origin: { ...origin, is_in_coverage: false } as Place & { is_in_coverage: boolean },
      destination,
      walkMode: 'cool',
    })).toBe('온:길 분석 범위 안의 출발지와 목적지를 선택해 주세요.');
  });

  it('removes client-only coverage metadata from API locations', () => {
    expect(toApiPlace({ ...origin, is_in_coverage: true } as Place & { is_in_coverage: boolean })).toEqual(origin);
  });

  it('sends the fixed graph coordinate behind the visible Wirye address', () => {
    const mapped = {
      id: 'place_001',
      name: '위례광장로 185',
      address: '서울특별시 송파구 위례광장로 185',
      lat: 37.4811743,
      lng: 127.1405973,
      is_in_coverage: true,
    };
    expect(toApiPlace(mapped)).toEqual({
      id: 'place_001',
      name: '위례광장로 185',
      address: '서울특별시 송파구 위례광장로 185',
      lat: 37.4811743,
      lng: 127.1405973,
    });
  });
});
