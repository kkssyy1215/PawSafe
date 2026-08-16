import type { RouteAnalysisRequest } from '@/src/api/contracts';
import { AppError } from '@/src/api/errors';
import { routeAnalysisResponseSchema } from '@/src/api/schemas';
import { MockAnalysisProvider } from '@/src/providers/analysis/MockAnalysisProvider';
import { createInitialWalkFlowState, walkFlowReducer } from '@/src/state/walkFlowReducer';

const request: RouteAnalysisRequest = {
  origin: { id: 'place_home', name: '우리집', address: '서울특별시 마포구 독막로 12', lat: 37.55, lng: 126.91 },
  destination: { id: 'place_mangwon_park', name: '망원한강공원', address: '서울특별시 마포구 마포나루길 467', lat: 37.555, lng: 126.9 },
  departure_at: '2026-08-12T18:30:00+09:00',
  walk_mode: 'cool',
};

describe('deterministic mock walk flow', () => {
  it('moves from input directly to comparison with the preferred route selected', async () => {
    const provider = new MockAnalysisProvider();
    const submitting = walkFlowReducer(createInitialWalkFlowState(), { type: 'BEGIN_SUBMIT', request });
    expect(submitting.status).toBe('submitting');

    const result = routeAnalysisResponseSchema.parse(await provider.analyzeRoute(request));
    const comparison = walkFlowReducer(submitting, { type: 'SUBMIT_SUCCESS', result });
    expect(comparison).toMatchObject({ status: 'comparison', selectedRoute: 'pawsafe' });

    const firstSegmentId = result.heat_segments[0].edge_id;
    const segmentReview = walkFlowReducer(comparison, { type: 'SHOW_SEGMENTS' });
    const selected = walkFlowReducer(segmentReview, { type: 'SELECT_SEGMENT', id: firstSegmentId });
    expect(selected).toMatchObject({ status: 'segmentReview', selectedSegmentId: firstSegmentId });

    const comparisonAgain = walkFlowReducer(selected, { type: 'SHOW_COMPARISON' });
    expect(comparisonAgain).toMatchObject({ status: 'comparison', selectedRoute: 'pawsafe' });
    expect(result).toMatchObject({ is_demo: true, validation_status: 'not_validated', analysis_source: 'mock_fixture' });
    expect(result.shortest.geometry.coordinates[0]).toEqual([request.origin.lng, request.origin.lat]);
    expect(result.shortest.geometry.coordinates.at(-1)).toEqual([request.destination.lng, request.destination.lat]);
    expect(result.pawsafe.geometry.coordinates[0]).toEqual([request.origin.lng, request.origin.lat]);
    expect(result.pawsafe.geometry.coordinates.at(-1)).toEqual([request.destination.lng, request.destination.lat]);
  });

  it.each([
    ['scenario_out_of_coverage', 'OUT_OF_COVERAGE'],
    ['scenario_no_route', 'NO_ROUTE'],
    ['scenario_timeout', 'ANALYSIS_TIMEOUT'],
  ] as const)('returns the %s demo error as %s', async (destinationId, expectedCode) => {
    const provider = new MockAnalysisProvider();
    await expect(provider.analyzeRoute({ ...request, destination: { ...request.destination, id: destinationId } }))
      .rejects.toEqual(expect.objectContaining({ code: expectedCode } satisfies Partial<AppError>));
  });

  it('honours AbortSignal cancellation', async () => {
    const provider = new MockAnalysisProvider();
    const controller = new AbortController();
    const analysis = provider.analyzeRoute(request, controller.signal);
    controller.abort();
    await expect(analysis).rejects.toMatchObject({ code: 'CANCELLED' });
  });
});
