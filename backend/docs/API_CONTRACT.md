# API Contract

Base prefix는 `/v1`입니다. 모든 JSON 키는 snake_case입니다. GeoJSON 좌표는 예외 없이 `[longitude, latitude]`, 즉 `[lng, lat]` 순서입니다.

## 공통 enum과 null

- `walk_mode`: `fast | balanced | cool`
- 분석 `status`: `completed`
- `validation_status`: `not_validated | validated | partially_validated | unknown`
- Heat Segment `level`: `low | medium | high | unknown`
- `data_valid_at`, `heat_data_version`, `confidence`는 `null` 가능
- `shade_ratio`, `direct_sun_minutes`, Segment의 `heat_cost`는 누락 데이터 정책 때문에 `null` 가능
- `heat_reduction_percent`는 일반 경로 Heat Cost가 0 이하면 `null`
- shade/direct-sun 비교값은 양쪽 값이 모두 있을 때만 숫자이며 그 외에는 `null`

## `GET /health`

```json
{
  "status": "ok",
  "graph_loaded": true,
  "heat_data_loaded": true,
  "analysis_provider": "mock",
  "heat_cost_provider": "mock",
  "place_provider": "mock",
  "graph_version": "demo-graph-v1",
  "heat_data_version": null
}
```

준비되지 않은 Graph 설정은 `status=degraded`로 진단할 수 있습니다.

## `GET /v1/capabilities`

```json
{
  "analysis_mode": "demo",
  "place_search": "mock",
  "map_graph": "demo",
  "data_pipeline": "not_ready",
  "heat_model": "not_ready",
  "heat_cost_source": "mock_fixture",
  "route_optimizer": "mock_fixture",
  "absolute_surface_temperature_prediction": false,
  "absolute_safety_classification": false
}
```

## `GET /v1/coverage`

`CoverageResponse`는 `coverage_id`, `name`, `is_demo`, GeoJSON `Polygon geometry`를 반환합니다.

## `GET /v1/places/search?q={query}&lat={originLat}&lng={originLng}`

응답 envelope는 반드시 `{ "items": Place[] }`입니다. `Place`는 `id`, `name`, `address`, `lat`, `lng`, `is_in_coverage`를 포함합니다. 빈 query는 `VALIDATION_ERROR`입니다.

`lat`과 `lng`는 기존 직접 검색과 호환되는 선택적 출발 위치 힌트입니다. 둘 다 생략하면 기존 `q`-only 검색과 결과 순서를 유지합니다. 하나만 전달하면 `VALIDATION_ERROR`이며, 둘 다 전달할 때 각각 위도 -90~90, 경도 -180~180 범위를 검증합니다.

- Mock Provider: query와 일치한 장소를 힌트 좌표와의 거리순으로 정렬합니다.
- Kakao Provider: 두 좌표가 모두 있을 때만 서버 측 요청에 `x`, `y`, `radius=5000`, `sort=distance`를 추가합니다.
- 이 좌표는 검색 결과 정렬에만 사용하며 DB에 저장하지 않습니다. 운영 환경에서는 프록시·액세스 로그에 query string을 남기지 않도록 설정해야 합니다.

예시:

```http
GET /v1/places/search?q=공원&lat=37.55&lng=126.91
```

## `POST /v1/places/reverse-geocode`

요청:

```json
{"lat": 37.55, "lng": 126.91}
```

응답은 하나의 `Place`입니다. 좌표 범위는 위도 -90~90, 경도 -180~180입니다.

## `POST /v1/route-analyses`

요청:

```json
{
  "origin": {
    "id": "place_home",
    "name": "우리집",
    "address": "서울특별시 마포구 독막로",
    "lat": 37.55,
    "lng": 126.91
  },
  "destination": {
    "id": "place_001",
    "name": "망원한강공원",
    "address": "서울특별시 마포구 마포나루길",
    "lat": 37.555,
    "lng": 126.9
  },
  "departure_at": "2026-08-12T18:30:00+09:00",
  "walk_mode": "cool"
}
```

`departure_at`은 offset을 포함하는 timezone-aware ISO 8601이어야 합니다. 위치 문자열과 좌표에 길이/범위 검증을 적용하며 extra key는 허용하지 않습니다.

응답의 핵심 구조:

```json
{
  "analysis_id": "demo_analysis_cool",
  "status": "completed",
  "is_demo": true,
  "analysis_source": "mock_fixture",
  "validation_status": "not_validated",
  "requested_departure_at": "2026-08-12T18:30:00+09:00",
  "generated_at": "2026-08-12T18:29:10+09:00",
  "data_valid_at": null,
  "graph_version": "demo-graph-v1",
  "heat_data_version": null,
  "weight_profile": {"id": "demo-cool-v1", "is_demo": true},
  "warnings": [{"code": "DEMO_RESULT", "message": "현재 결과는 앱 흐름 검증을 위한 MVP 예시 데이터입니다."}],
  "shortest": {
    "route_id": "shortest_001",
    "label": "일반 경로",
    "route_source": "mock_fixture",
    "geometry": {"type": "LineString", "coordinates": [[126.91, 37.55], [126.9, 37.555]]},
    "distance_m": 1200,
    "duration_min": 17,
    "heat_cost": 72,
    "shade_ratio": 0.21,
    "direct_sun_minutes": 13,
    "edge_count": 2
  },
  "pawsafe": {},
  "comparison": {
    "same_route": false,
    "distance_delta_m": 200,
    "duration_delta_min": 3,
    "heat_cost_delta": -31,
    "heat_reduction_percent": 43.1,
    "shade_ratio_delta_percentage_point": 38,
    "direct_sun_minutes_delta": -9
  },
  "heat_segments": []
}
```

`pawsafe`는 `shortest`와 같은 `RouteSummary` shape입니다. `heat_segments`의 각 항목은 edge id/name, level, nullable Heat Cost/statistics, surface/confidence/validation, LineString geometry를 가집니다. 정확한 JSON Schema는 `/openapi.json`을 기준으로 합니다.

## 표준 오류

모든 검증/도메인/외부/예상치 못한 오류는 다음 형태입니다.

```json
{
  "error": {
    "code": "OUT_OF_COVERAGE",
    "message": "현재 MVP 분석 범위를 벗어난 위치입니다.",
    "retryable": false,
    "details": {},
    "request_id": "req_123"
  }
}
```

지원 코드: `VALIDATION_ERROR`, `OUT_OF_COVERAGE`, `PLACE_NOT_FOUND`, `SAME_LOCATION`, `NO_WALKABLE_NODE`, `NO_ROUTE`, `HEAT_DATA_NOT_AVAILABLE`, `STALE_HEAT_DATA`, `ANALYSIS_TIMEOUT`, `NETWORK_ERROR`, `EXTERNAL_API_TIMEOUT`, `EXTERNAL_API_ERROR`, `MODEL_NOT_READY`, `PIPELINE_NOT_READY`, `INVALID_DATA_FILE`, `INVALID_RESPONSE`, `INTERNAL_ERROR`.

요청의 유효한 `X-Request-ID`는 그대로 응답합니다. 없거나 안전한 형식이 아니면 서버가 `req_` prefix ID를 생성합니다. validation `details`에는 field/type만 포함하며 입력값, 주소, 좌표, 내부 경로는 포함하지 않습니다.
