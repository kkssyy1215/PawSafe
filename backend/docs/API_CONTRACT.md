# API Contract

Base prefix는 `/v1`입니다. 모든 JSON 키는 snake_case입니다. GeoJSON 좌표는 예외 없이 `[longitude, latitude]`, 즉 `[lng, lat]` 순서입니다.

## 공통 enum과 null

- `walk_mode`: `fast | cool`
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
  "analysis_provider": "graph",
  "heat_cost_provider": "file",
  "place_provider": "mock",
  "graph_version": "walk_graph",
  "heat_data_version": "live-20260815T1400+0900"
}
```

준비되지 않은 Graph 설정은 `status=degraded`로 진단할 수 있습니다.

## `GET /v1/capabilities`

```json
{
  "analysis_mode": "graph",
  "place_search": "mock",
  "map_graph": "configured",
  "data_pipeline": "configured",
  "heat_model": "not_ready",
  "heat_cost_source": "file",
  "route_optimizer": "internal_graph",
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
  "walk_mode": "cool"
}
```

`departure_at`은 선택 필드입니다. 앱의 기본 시나리오처럼 생략하면 백엔드가 요청을 받은 시점의 한국 표준시를 사용합니다. 미래 시각 분석이 필요할 때만 timezone offset을 포함하는 ISO 8601 값을 전달합니다. 위치 문자열과 좌표에 길이/범위 검증을 적용하며 extra key는 허용하지 않습니다.

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
    "navigation_url": null,
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

### Kakao 최단 보행 경로 MVP 모드

공유 설정인 `ANALYSIS_PROVIDER=graph`에서 `KAKAO_REST_API_KEY`가 있으면 요청 모드에 따라 공급자를 분리합니다. `walk_mode=fast`는 Kakao맵 도보 경로 API의 `route_mode=SHORTEST` 응답을 사용하고, `walk_mode=cool`은 데이터팀 보행 그래프와 Edge × Time Heat Cost를 사용합니다. 입력·출력 좌표계는 WGS84이며 Kakao의 `[x, y]`는 GeoJSON `[lng, lat]`로 유지합니다.

fast 응답에는 `analysis_source=kakao_walk+mock_heat_fixture`와 `KAKAO_SHORTEST_WITH_DEMO_HEAT` warning이 포함됩니다. 경로 geometry·distance·duration은 실제 Kakao 응답이며, Kakao가 `landingUrl`을 제공하면 `navigation_url`로 전달해 앱의 길안내 버튼에 사용합니다. 빠른 산책 화면에서는 열환경 수치를 표시하지 않습니다. cool 응답은 `analysis_source=graph`이며 최신 Heat Cost 스냅샷을 사용합니다.

### Graph 모드

공유 기본 설정은 `ANALYSIS_PROVIDER=graph`, `HEAT_COST_PROVIDER=file`이며
`backend/data/exports/walk_graph.gpkg`와 `edge_heat_cost.json`을 읽습니다.
백엔드는 GeoPackage 선분의 정점쌍과 원본 `edge_id`를 유지하고, 요청 시각과
가장 가까운 Asia/Seoul Heat Cost 스냅샷으로 `cool` 경로를 계산합니다. Kakao
키가 없을 때는 `fast`도 그래프의 거리 최우선 가중치로 계산합니다.
export를 교체해도 API 계약은 바뀌지 않으며 파일 변경 시 Heat Cost Provider가
새 스냅샷을 다시 읽습니다.

이 모드의 응답은 `analysis_source=graph`, `is_demo=false`,
`validation_status=not_validated`이며 `PIPELINE_RELATIVE_HEAT` 경고를 포함합니다.
파이프라인의 Heat Cost는 상대 열노출 지표이지 실측 노면온도(℃)나 절대 안전
판정이 아닙니다. 승인된 앱 실행용 export만 저장소에 포함하며 원본 IoT 문서,
재배포 권한이 불명확한 원천 자료, 개인 API 키와 로컬 모델 산출물은 포함하지
않습니다.

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
