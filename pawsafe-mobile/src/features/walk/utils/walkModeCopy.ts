import type { WalkMode } from '@/src/api/contracts';

export function getWalkModeLabel(mode: WalkMode): string {
  return mode === 'fast' ? '빠른 산책길' : '시원한 산책길';
}

export function getWalkSearchButtonLabel(mode: WalkMode): string {
  return mode === 'fast' ? '빠른 산책길 찾기' : '시원한 산책길 찾기';
}
