import type { RouteAnalysisResponse, RouteStats } from '@/src/api/contracts';

export function makeRoute(
  routeId: string,
  distanceM: number,
  heatCost: number,
  safetyScore: number,
): RouteStats {
  return {
    route_id: routeId,
    label: routeId.startsWith('shortest') ? '일반 최단경로' : '온:길 추천',
    route_source: 'ongil_gmm_graph',
    navigation_url: null,
    geometry: {
      type: 'LineString',
      coordinates: [[127.140597, 37.481174], [127.141071, 37.477295]],
    },
    distance_m: distanceM,
    duration_min: Math.max(1, Math.round(distanceM / 70)),
    heat_cost: heatCost,
    shade_ratio: 0.5,
    direct_sun_minutes: 6,
    edge_count: 3,
    safety: {
      route_id: routeId,
      target_time_kst: '2026-08-15T16:00:00+09:00',
      score: safetyScore,
      score_raw_0_100: safetyScore,
      unit_heat_cost_0_to_alpha: safetyScore / 200,
      route_distance_m: distanceM,
      air_temperature_c: 26.6,
      temperature_factor_0_1: 0.532,
      weighted_mean_p_high: Math.min(1, safetyScore / 53.2),
      high_heat_cluster_raw: 1,
      alert_alpha: 0.5,
      status: safetyScore >= 80 ? 'danger' : safetyScore >= 41 ? 'caution' : 'comfortable',
      color: safetyScore >= 80 ? 'red' : safetyScore >= 41 ? 'yellow' : 'green',
      should_warn: safetyScore >= 80,
      message: '경로 열위험 점수',
      thresholds: {
        comfortable_max: 40,
        caution_min: 41,
        caution_max: 79,
        warning_min: 80,
      },
      calibrated_safety_threshold: false,
      method_note: '실측 노면온도 또는 화상 확률이 아님',
    },
  };
}

export function makeRouteAnalysisResponse(options: {
  shortestScore?: number;
  recommendedScore?: number;
  shortestDistanceM?: number;
  recommendedDistanceM?: number;
  sameRoute?: boolean;
} = {}): RouteAnalysisResponse {
  const shortest = makeRoute(
    'shortest_001',
    options.shortestDistanceM ?? 875,
    1.5,
    options.shortestScore ?? 41,
  );
  const recommended = makeRoute(
    'ongil_001',
    options.recommendedDistanceM ?? 1075,
    0.2,
    options.recommendedScore ?? 6,
  );
  if (options.sameRoute) recommended.geometry = shortest.geometry;
  const distanceDelta = recommended.distance_m - shortest.distance_m;
  return {
    analysis_id: 'analysis_gmm_001',
    status: 'completed',
    analysis_source: 'ongil_gmm_0815_1600',
    validation_status: 'not_validated',
    requested_departure_at: '2026-08-19T12:00:00+09:00',
    generated_at: '2026-08-19T03:00:01Z',
    data_valid_at: '2026-08-15T16:00:00+09:00',
    graph_version: 'ongil-gmm-0815-1600-v1-edges-3797',
    heat_data_version: 'ongil-gmm-0815-1600-v1-snapshot-20260815-1600',
    weight_profile: { id: 'length_x_1_plus_heat_penalty_1.0' },
    warnings: [],
    shortest,
    pawsafe: recommended,
    comparison: {
      same_route: options.sameRoute ?? false,
      distance_delta_m: distanceDelta,
      duration_delta_min: recommended.duration_min - shortest.duration_min,
      heat_cost_delta: recommended.heat_cost - shortest.heat_cost,
      heat_reduction_percent: 86.7,
      shade_ratio_delta_percentage_point: 0,
      direct_sun_minutes_delta: 0,
    },
    heat_segments: [],
  };
}
