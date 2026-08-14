import type { GeoJsonCoordinate, HeatSegment, RouteAnalysisRequest, RouteAnalysisResponse, RouteStats } from '@/src/api/contracts';

const shortestCoordinates: GeoJsonCoordinate[] = [
  [126.91, 37.55], [126.907, 37.551], [126.904, 37.552], [126.901, 37.5535], [126.9, 37.555],
];
const coolCoordinates: GeoJsonCoordinate[] = [
  [126.91, 37.55], [126.909, 37.553], [126.906, 37.5555], [126.902, 37.5565], [126.9, 37.555],
];
const noImprovementCoordinates: GeoJsonCoordinate[] = [
  [126.91, 37.55], [126.908, 37.552], [126.905, 37.554], [126.902, 37.555], [126.9, 37.555],
];

const shortestBase: RouteStats = {
  route_id: 'shortest_001', label: '일반 경로', route_source: 'mock_fixture',
  geometry: { type: 'LineString', coordinates: shortestCoordinates },
  distance_m: 1200, duration_min: 17, heat_cost: 72, shade_ratio: 0.21,
  direct_sun_minutes: 13, edge_count: 10,
};

function coordinateDistanceM(a: GeoJsonCoordinate, b: GeoJsonCoordinate): number {
  const meanLatitude = ((a[1] + b[1]) / 2) * (Math.PI / 180);
  const eastWest = (b[0] - a[0]) * 111_320 * Math.cos(meanLatitude);
  const northSouth = (b[1] - a[1]) * 110_540;
  return Math.sqrt((eastWest * eastWest) + (northSouth * northSouth));
}

function adaptCoordinates(coordinates: GeoJsonCoordinate[], request: RouteAnalysisRequest): GeoJsonCoordinate[] {
  if (coordinates.length < 2) return [[request.origin.lng, request.origin.lat], [request.destination.lng, request.destination.lat]];
  const baseStart = coordinates[0];
  const baseEnd = coordinates[coordinates.length - 1];
  const baseVector: GeoJsonCoordinate = [baseEnd[0] - baseStart[0], baseEnd[1] - baseStart[1]];
  const baseLengthSquared = (baseVector[0] * baseVector[0]) + (baseVector[1] * baseVector[1]);
  if (baseLengthSquared === 0) return [[request.origin.lng, request.origin.lat], [request.destination.lng, request.destination.lat]];
  const targetVector: GeoJsonCoordinate = [request.destination.lng - request.origin.lng, request.destination.lat - request.origin.lat];
  const targetPerpendicular: GeoJsonCoordinate = [-targetVector[1], targetVector[0]];
  return coordinates.map((coordinate) => {
    const delta: GeoJsonCoordinate = [coordinate[0] - baseStart[0], coordinate[1] - baseStart[1]];
    const along = ((delta[0] * baseVector[0]) + (delta[1] * baseVector[1])) / baseLengthSquared;
    const perpendicular = ((baseVector[0] * delta[1]) - (baseVector[1] * delta[0])) / baseLengthSquared;
    return [
      request.origin.lng + (targetVector[0] * along) + (targetPerpendicular[0] * perpendicular),
      request.origin.lat + (targetVector[1] * along) + (targetPerpendicular[1] * perpendicular),
    ];
  });
}

function adaptRoute(routeStats: RouteStats, request: RouteAnalysisRequest): RouteStats {
  const coordinates = adaptCoordinates(routeStats.geometry.coordinates, request);
  const baseDistance = coordinateDistanceM(routeStats.geometry.coordinates[0], routeStats.geometry.coordinates[routeStats.geometry.coordinates.length - 1]);
  const targetDistance = coordinateDistanceM([request.origin.lng, request.origin.lat], [request.destination.lng, request.destination.lat]);
  const scale = baseDistance > 0 ? targetDistance / baseDistance : 1;
  return {
    ...routeStats,
    geometry: { type: 'LineString', coordinates },
    distance_m: Math.round(routeStats.distance_m * scale),
    duration_min: Math.max(1, Math.round(routeStats.duration_min * scale)),
  };
}

function route(
  routeId: string,
  coordinates: GeoJsonCoordinate[],
  distance: number,
  duration: number,
  heatCost: number,
  shadeRatio: number,
  directSun: number,
): RouteStats {
  return {
    route_id: routeId, label: 'PawSafe 예시 경로', route_source: 'mock_fixture',
    geometry: { type: 'LineString', coordinates }, distance_m: distance,
    duration_min: duration, heat_cost: heatCost, shade_ratio: shadeRatio,
    direct_sun_minutes: directSun, edge_count: coordinates.length + 8,
  };
}

function segments(coordinates: GeoJsonCoordinate[], request: RouteAnalysisRequest): HeatSegment[] {
  const names = [`${request.origin.name} 인근 보행 구간`, '그늘길 인근 보행 구간', `${request.destination.name} 진입 보행 구간`, `${request.destination.name} 연결 구간`];
  const levels: HeatSegment['level'][] = ['medium', 'low', 'unknown', 'low'];
  return coordinates.slice(0, -1).map((coordinate, index) => ({
    edge_id: `demo_edge_${String(index + 1).padStart(2, '0')}`,
    display_name: names[index] ?? `보행 구간 ${index + 1}`,
    level: levels[index] ?? 'unknown',
    heat_cost: [51, 32, 44, 28][index] ?? 40,
    shade_ratio: [0.38, 0.85, null, 0.72][index] ?? null,
    direct_sun_minutes: [2, 1, null, 1][index] ?? null,
    surface_type: index === 0 ? '아스팔트(예시)' : null,
    confidence: null,
    data_valid_at: null,
    validation_status: 'not_validated',
    geometry: { type: 'LineString', coordinates: [coordinate, coordinates[index + 1]] },
  }));
}

function buildResponse(
  request: RouteAnalysisRequest,
  scenario: string,
  pawsafe: RouteStats,
  sameRoute = false,
): RouteAnalysisResponse {
  const shortest = adaptRoute(shortestBase, request);
  const adaptedPawsafe = adaptRoute(pawsafe, request);
  const distanceDelta = adaptedPawsafe.distance_m - shortest.distance_m;
  const durationDelta = adaptedPawsafe.duration_min - shortest.duration_min;
  const heatDelta = adaptedPawsafe.heat_cost - shortest.heat_cost;
  const heatReduction = shortest.heat_cost === 0 ? 0 : (-heatDelta / shortest.heat_cost) * 100;
  return {
    analysis_id: `demo_analysis_${scenario}`,
    status: 'completed',
    is_demo: true,
    analysis_source: 'mock_fixture',
    validation_status: 'not_validated',
    requested_departure_at: request.departure_at,
    generated_at: '2026-08-12T18:29:10+09:00',
    data_valid_at: null,
    graph_version: 'demo-graph-v1',
    heat_data_version: null,
    weight_profile: { id: `demo-${request.walk_mode}-v1`, is_demo: true },
    warnings: [{ code: 'DEMO_RESULT', message: '현재 결과는 앱 흐름 검증을 위한 MVP 예시 데이터입니다.' }],
    shortest,
    pawsafe: adaptedPawsafe,
    comparison: {
      same_route: sameRoute,
      distance_delta_m: distanceDelta,
      duration_delta_min: durationDelta,
      heat_cost_delta: heatDelta,
      heat_reduction_percent: Math.round(heatReduction * 10) / 10,
      shade_ratio_delta_percentage_point: adaptedPawsafe.shade_ratio == null || shortest.shade_ratio == null
        ? null : Math.round((adaptedPawsafe.shade_ratio - shortest.shade_ratio) * 1000) / 10,
      direct_sun_minutes_delta: adaptedPawsafe.direct_sun_minutes == null || shortest.direct_sun_minutes == null
        ? null : adaptedPawsafe.direct_sun_minutes - shortest.direct_sun_minutes,
    },
    heat_segments: segments(adaptedPawsafe.geometry.coordinates, request),
  };
}

export type DemoSuccessScenario = 'cool-improvement' | 'fast-near-shortest' | 'same-route' | 'no-improvement';

export function getMockRouteScenario(request: RouteAnalysisRequest): RouteAnalysisResponse {
  if (request.destination.id === 'scenario_same_route') {
    return buildResponse(request, 'same-route', { ...shortestBase, route_id: 'pawsafe_same', label: 'PawSafe 예시 경로' }, true);
  }
  if (request.destination.id === 'scenario_no_improvement') {
    return buildResponse(request, 'no-improvement', route('pawsafe_no_change', noImprovementCoordinates, 1290, 18, 74, 0.25, 12));
  }
  if (request.walk_mode === 'fast') {
    return buildResponse(request, 'fast-near-shortest', route('pawsafe_fast', shortestCoordinates, 1220, 17, 68, 0.27, 12));
  }
  return buildResponse(request, 'cool-improvement', route('pawsafe_cool', coolCoordinates, 1400, 20, 41, 0.59, 4));
}
