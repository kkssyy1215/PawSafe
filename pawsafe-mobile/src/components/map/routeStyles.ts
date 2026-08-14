import type { WalkMode } from '@/src/api/contracts';
import { colors } from '@/src/theme/theme';

export function getRecommendedRouteColor(walkMode: WalkMode = 'cool'): string {
  return walkMode === 'fast' ? colors.fastRoute : colors.coolRoute;
}
