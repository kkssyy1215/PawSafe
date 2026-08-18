import type { RouteAnalysisResponse } from '@/src/api/contracts';

export function getResultHeadline(result: RouteAnalysisResponse): string {
  const comparison = result.comparison;
  if (comparison.same_route) return '현재 조건에서는 두 경로가 같아요.';
  const riskReduction = result.shortest.safety.score - result.pawsafe.safety.score;
  if (riskReduction <= 0) {
    return '현재 조건에서는 더 시원한 우회 경로가 없어요.';
  }
  if (riskReduction < 3) {
    return '두 경로의 열노출 차이가 크지 않아요.';
  }
  const distance = Math.round(comparison.distance_delta_m);
  if (distance > 0) return `${distance}m 더 걸어도,\n우리 강아지가 걷기 좋은 길이에요.`;
  return '더 걷지 않아도,\n우리 강아지가 걷기 좋은 길이에요.';
}
