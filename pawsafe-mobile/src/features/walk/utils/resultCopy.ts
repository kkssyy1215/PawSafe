import type { RouteAnalysisResponse } from '@/src/api/contracts';

export function getResultHeadline(result: RouteAnalysisResponse): string {
  const comparison = result.comparison;
  if (comparison.same_route) return '현재 조건에서는 두 경로가 같습니다.';
  if (comparison.heat_cost_delta >= 0 || comparison.heat_reduction_percent == null || comparison.heat_reduction_percent <= 0) {
    return '현재 조건에서는 PawSafe 경로의 상대 열노출 개선이 확인되지 않았습니다.';
  }
  if (comparison.heat_reduction_percent < 5) {
    return '현재 조건에서는 상대 열노출 차이가 크지 않습니다.';
  }
  const distance = Math.round(comparison.distance_delta_m);
  const reduction = Math.round(comparison.heat_reduction_percent);
  if (distance > 0) return `${distance}m 더 걷고, Heat Cost는 ${reduction}% 낮은 예시 경로예요.`;
  return `Heat Cost가 ${reduction}% 낮은 예시 경로예요.`;
}

export function isDemoResult(result: RouteAnalysisResponse) {
  return result.is_demo && result.analysis_source === 'mock_fixture' && result.validation_status === 'not_validated';
}
