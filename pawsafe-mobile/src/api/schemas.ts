import { z } from 'zod';

const finiteNumber = z.number().finite();
export const placeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  address: z.string(),
  lat: finiteNumber.min(-90).max(90),
  lng: finiteNumber.min(-180).max(180),
});
export const placeSearchResultSchema = placeSchema.extend({ is_in_coverage: z.boolean() });
export const lineStringSchema = z.object({
  type: z.literal('LineString'),
  coordinates: z.array(z.tuple([finiteNumber, finiteNumber])),
});
export const routeAnalysisRequestSchema = z.object({
  origin: placeSchema,
  destination: placeSchema,
  departure_at: z.string().datetime({ offset: true }).optional(),
  walk_mode: z.enum(['fast', 'cool']),
});
const routeStatsSchema = z.object({
  route_id: z.string(),
  label: z.string(),
  route_source: z.string(),
  navigation_url: z.string().url().nullable().optional(),
  geometry: lineStringSchema,
  distance_m: finiteNumber.nonnegative(),
  duration_min: finiteNumber.nonnegative(),
  heat_cost: finiteNumber.nonnegative(),
  shade_ratio: finiteNumber.min(0).max(1).nullable(),
  direct_sun_minutes: finiteNumber.nonnegative().nullable(),
  edge_count: z.number().int().nonnegative(),
  safety: z.object({
    route_id: z.string(),
    target_time_kst: z.string().datetime({ offset: true }),
    score: z.number().int().min(1).max(100),
    score_raw_0_100: finiteNumber.min(0).max(100),
    unit_heat_cost_0_to_alpha: finiteNumber.nonnegative(),
    route_distance_m: finiteNumber.positive(),
    air_temperature_c: finiteNumber,
    temperature_factor_0_1: finiteNumber.min(0).max(1),
    weighted_mean_p_high: finiteNumber.min(0).max(1),
    high_heat_cluster_raw: z.number().int(),
    alert_alpha: finiteNumber.positive(),
    status: z.enum(['comfortable', 'caution', 'danger']),
    color: z.enum(['green', 'yellow', 'red']),
    should_warn: z.boolean(),
    message: z.string(),
    thresholds: z.object({
      comfortable_max: z.number().int().min(1).max(100),
      caution_min: z.number().int().min(1).max(100),
      caution_max: z.number().int().min(1).max(100),
      warning_min: z.number().int().min(1).max(100),
    }),
    calibrated_safety_threshold: z.boolean(),
    method_note: z.string(),
  }),
});
const validationStatus = z.enum(['not_validated', 'validated', 'partially_validated', 'unknown']);
export const routeAnalysisResponseSchema = z.object({
  analysis_id: z.string(),
  status: z.literal('completed'),
  analysis_source: z.string(),
  validation_status: validationStatus,
  requested_departure_at: z.string().datetime({ offset: true }),
  generated_at: z.string().datetime({ offset: true }),
  data_valid_at: z.string().datetime({ offset: true }).nullable(),
  graph_version: z.string(),
  heat_data_version: z.string().nullable(),
  weight_profile: z.object({ id: z.string() }),
  warnings: z.array(z.object({ code: z.string(), message: z.string() })),
  shortest: routeStatsSchema,
  pawsafe: routeStatsSchema,
  comparison: z.object({
    same_route: z.boolean(),
    distance_delta_m: finiteNumber,
    duration_delta_min: finiteNumber,
    heat_cost_delta: finiteNumber,
    heat_reduction_percent: finiteNumber.nullable(),
    shade_ratio_delta_percentage_point: finiteNumber.nullable(),
    direct_sun_minutes_delta: finiteNumber.nullable(),
  }),
  heat_segments: z.array(z.object({
    edge_id: z.string(),
    display_name: z.string(),
    level: z.enum(['low', 'medium', 'high', 'unknown']),
    heat_cost: finiteNumber.nonnegative().nullable(),
    shade_ratio: finiteNumber.min(0).max(1).nullable(),
    direct_sun_minutes: finiteNumber.nonnegative().nullable(),
    surface_type: z.string().nullable(),
    confidence: finiteNumber.min(0).max(1).nullable(),
    data_valid_at: z.string().datetime({ offset: true }).nullable(),
    validation_status: validationStatus,
    geometry: lineStringSchema,
  })),
});
export const apiErrorEnvelopeSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean(),
    details: z.record(z.string(), z.unknown()).optional(),
    request_id: z.string().optional(),
  }),
});
export const placeSearchResponseSchema = z.object({
  items: z.array(placeSearchResultSchema),
}).transform(({ items }) => items);
