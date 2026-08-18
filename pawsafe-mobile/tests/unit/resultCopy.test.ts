import { getResultHeadline } from '@/src/features/walk/utils/resultCopy';
import { makeRouteAnalysisResponse } from '@/tests/fixtures/routeAnalysis';

describe('comparison copy', () => {
  it('describes the deterministic cool improvement without an absolute safety claim', () => {
    const result = makeRouteAnalysisResponse();
    expect(getResultHeadline(result)).toBe('200m 더 걸어도,\n우리 강아지가 걷기 좋은 길이에요.');
  });

  it('handles a same-route result', () => {
    const result = makeRouteAnalysisResponse({ sameRoute: true });
    expect(getResultHeadline(result)).toBe('현재 조건에서는 두 경로가 같아요.');
  });

  it('does not always claim improvement', () => {
    const result = makeRouteAnalysisResponse({ shortestScore: 20, recommendedScore: 20 });
    expect(getResultHeadline(result)).toBe('현재 조건에서는 더 시원한 우회 경로가 없어요.');
  });
});
