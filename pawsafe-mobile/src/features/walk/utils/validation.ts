import type { Place, WalkMode } from '@/src/api/contracts';

export interface WalkConditionFormState {
  origin: Place | null;
  destination: Place | null;
  walkMode: WalkMode;
}

export function isSamePlace(first: Place, second: Place): boolean {
  return first.id === second.id || (Math.abs(first.lat - second.lat) < 0.000001 && Math.abs(first.lng - second.lng) < 0.000001);
}

export function toApiPlace(place: Place): Place {
  const { id, name, address, lat, lng } = place;
  return { id, name, address, lat, lng };
}

export function validateWalkForm(form: WalkConditionFormState): string | null {
  if (!form.origin) return '등록된 출발지를 선택해 주세요.';
  if (!form.destination) return '등록된 목적지를 선택해 주세요.';
  if (isSamePlace(form.origin, form.destination)) return '출발지와 목적지를 다르게 선택해 주세요.';
  const originCoverage = 'is_in_coverage' in form.origin ? Boolean(form.origin.is_in_coverage) : true;
  const destinationCoverage = 'is_in_coverage' in form.destination ? Boolean(form.destination.is_in_coverage) : true;
  if (!originCoverage || !destinationCoverage) return 'MVP 분석 범위 안의 출발지와 목적지를 선택해 주세요.';
  return null;
}
