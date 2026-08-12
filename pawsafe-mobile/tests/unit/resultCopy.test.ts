import type { RouteAnalysisRequest } from '@/src/api/contracts';
import { getResultHeadline, isDemoResult } from '@/src/features/walk/utils/resultCopy';
import { getMockRouteScenario } from '@/src/mocks/routeScenarios';

const request: RouteAnalysisRequest = {
  origin: { id: 'place_home', name: '우리집', address: '서울특별시 마포구 독막로 12', lat: 37.55, lng: 126.91 },
  destination: { id: 'place_mangwon_park', name: '망원한강공원', address: '서울특별시 마포구 마포나루길 467', lat: 37.555, lng: 126.9 },
  departure_at: '2026-08-12T18:30:00+09:00',
  walk_mode: 'cool',
};

describe('comparison copy', () => {
  it('describes the deterministic cool improvement without an absolute safety claim', () => {
    const result = getMockRouteScenario(request);
    expect(getResultHeadline(result)).toBe('200m 더 걷고, Heat Cost는 43% 낮은 예시 경로예요.');
    expect(isDemoResult(result)).toBe(true);
  });

  it('handles a same-route result', () => {
    const result = getMockRouteScenario({
      ...request,
      destination: { ...request.destination, id: 'scenario_same_route' },
    });
    expect(getResultHeadline(result)).toBe('현재 조건에서는 두 경로가 같습니다.');
  });

  it('does not always claim improvement', () => {
    const result = getMockRouteScenario({
      ...request,
      destination: { ...request.destination, id: 'scenario_no_improvement' },
    });
    expect(getResultHeadline(result)).toBe('현재 조건에서는 PawSafe 경로의 상대 열노출 개선이 확인되지 않았습니다.');
  });
});
