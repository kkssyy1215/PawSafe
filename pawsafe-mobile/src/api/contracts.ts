export type WalkMode = 'fast' | 'balanced' | 'cool';
export type HeatLevel = 'low' | 'medium' | 'high' | 'unknown';
export type ValidationStatus = 'not_validated' | 'validated' | 'partially_validated' | 'unknown';
export type GeoJsonCoordinate = [longitude: number, latitude: number];

export interface Place {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export interface PlaceSearchResult extends Place {
  is_in_coverage: boolean;
}

export interface LineStringGeometry {
  type: 'LineString';
  coordinates: GeoJsonCoordinate[];
}

export interface RouteAnalysisRequest {
  origin: Place;
  destination: Place;
  departure_at: string;
  walk_mode: WalkMode;
}

export interface RouteStats {
  route_id: string;
  label: string;
  route_source: string;
  geometry: LineStringGeometry;
  distance_m: number;
  duration_min: number;
  heat_cost: number;
  shade_ratio: number | null;
  direct_sun_minutes: number | null;
  edge_count: number;
}

export interface RouteComparison {
  same_route: boolean;
  distance_delta_m: number;
  duration_delta_min: number;
  heat_cost_delta: number;
  heat_reduction_percent: number | null;
  shade_ratio_delta_percentage_point: number | null;
  direct_sun_minutes_delta: number | null;
}

export interface HeatSegment {
  edge_id: string;
  display_name: string;
  level: HeatLevel;
  heat_cost: number | null;
  shade_ratio: number | null;
  direct_sun_minutes: number | null;
  surface_type: string | null;
  confidence: number | null;
  data_valid_at: string | null;
  validation_status: ValidationStatus;
  geometry: LineStringGeometry;
}

export interface RouteAnalysisResponse {
  analysis_id: string;
  status: 'completed';
  is_demo: boolean;
  analysis_source: string;
  validation_status: ValidationStatus;
  requested_departure_at: string;
  generated_at: string;
  data_valid_at: string | null;
  graph_version: string;
  heat_data_version: string | null;
  weight_profile: { id: string; is_demo: boolean };
  warnings: { code: string; message: string }[];
  shortest: RouteStats;
  pawsafe: RouteStats;
  comparison: RouteComparison;
  heat_segments: HeatSegment[];
}

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    retryable: boolean;
    details?: Record<string, unknown>;
    request_id?: string;
  };
}
