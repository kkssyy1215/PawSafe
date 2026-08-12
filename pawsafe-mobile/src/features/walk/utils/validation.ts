import type { Place, WalkMode } from '@/src/api/contracts';
import { MAX_DEPARTURE_DAYS } from '@/src/config/constants';

export interface WalkConditionFormState {
  origin: Place | null;
  destination: Place | null;
  departureAt: Date;
  walkMode: WalkMode;
}

export function isSamePlace(first: Place, second: Place): boolean {
  return first.id === second.id || (Math.abs(first.lat - second.lat) < 0.000001 && Math.abs(first.lng - second.lng) < 0.000001);
}

export function toApiPlace(place: Place): Place {
  const { id, name, address, lat, lng } = place;
  return { id, name, address, lat, lng };
}

export function validateWalkForm(form: WalkConditionFormState, now = new Date()): string | null {
  if (!form.origin) return '검색 결과에서 출발지를 선택해 주세요.';
  if (!form.destination) return '검색 결과에서 목적지를 선택해 주세요.';
  if (isSamePlace(form.origin, form.destination)) return '출발지와 목적지를 다르게 선택해 주세요.';
  const originCoverage = 'is_in_coverage' in form.origin ? Boolean(form.origin.is_in_coverage) : true;
  const destinationCoverage = 'is_in_coverage' in form.destination ? Boolean(form.destination.is_in_coverage) : true;
  if (!originCoverage || !destinationCoverage) return 'MVP 분석 범위 안의 출발지와 목적지를 선택해 주세요.';
  if (form.departureAt.getTime() < now.getTime() - 60_000) return '산책 시작 시각은 현재 이후로 선택해 주세요.';
  if (form.departureAt.getTime() > now.getTime() + MAX_DEPARTURE_DAYS * 24 * 60 * 60 * 1000) {
    return `${MAX_DEPARTURE_DAYS}일 이내의 시각을 선택해 주세요.`;
  }
  return null;
}
