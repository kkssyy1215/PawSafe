import type { WalkMode } from '@/src/api/contracts';

export function getWalkSearchButtonLabel(mode: WalkMode): string {
  return mode === 'fast' ? '빠른 산책길 찾기' : '안전한 산책길 찾기';
}
