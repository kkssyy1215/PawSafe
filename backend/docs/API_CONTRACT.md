# 온:길 API 계약

Base prefix는 `/v1`입니다. JSON 키는 snake_case, GeoJSON 좌표는
`[longitude, latitude]` 순서입니다. 실제 스키마의 최종 기준은 실행 중인
`/openapi.json`입니다.

## 상태 확인

### `GET /health`

최종 GMM 자산과 장소 카탈로그가 준비되면 `status=ok`입니다.

```json
{
  "status": "ok",
  "graph_loaded": true,
  "heat_data_loaded": true,
  "analysis_provider": "ongil_gmm",
  "heat_cost_provider": "file",
  "place_provider": "catalog",
  "graph_version": "ongil-gmm-0815-1600-v1-edges-3797",
  "heat_data_version": "ongil-gmm-0815-1600-v1-snapshot-20260815-1600"
}
```

### `GET /v1/capabilities`

```json
{
  "analysis_mode": "ongil_gmm",
  "place_search": "catalog",
  "map_graph": "configured",
  "data_pipeline": "configured",
  "heat_model": "ongil_gmm",
  "heat_cost_source": "gmm_snapshot_20260815_1600",
  "route_optimizer": "dijkstra_length_and_relative_heat",
  "absolute_surface_temperature_prediction": false,
  "absolute_safety_classification": false
}
```

## 분석 범위와 장소

### `GET /v1/coverage`

`coverage_id`, `name`, GeoJSON `Polygon geometry`를 반환합니다.

### `GET /v1/places/search?q={query}`

지원 주소 카탈로그에서 주소·장소명이 일치하는 항목을 검색합니다. 응답은
`{"items": Place[]}`이며 각 `Place`는 `id`, `name`, `address`, `lat`, `lng`,
`is_in_coverage`를 포함합니다. 선택적 `lat`과 `lng`를 함께 보내면 가까운 결과를
먼저 정렬합니다.

### `POST /v1/places/reverse-geocode`

```json
{"lat": 37.4811743, "lng": 127.1405973}
```

카탈로그에서 가장 가까운 지원 장소 하나를 반환합니다.

## 경로 분석

### `POST /v1/route-analyses`

요청 예시:

```json
{
  "origin": {
    "id": "songpa_01",
    "name": "위례광장로 185",
    "address": "서울특별시 송파구 위례광장로 185",
    "lat": 37.4811743,
    "lng": 127.1405973
  },
  "destination": {
    "id": "songpa_02",
    "name": "장지동 900-2",
    "address": "서울특별시 송파구 장지동 900-2",
    "lat": 37.4772949,
    "lng": 127.1410705
  },
  "walk_mode": "cool"
}
```

`walk_mode`는 `fast | cool`입니다. `departure_at`은 생략할 수 있지만 최종 모델은
미래 또는 실시간 재예측 모델이 아니므로 요청 시각이 경로의 Edge Heat Cost를
바꾸지 않습니다. 모든 결과는 `2026-08-15 16:00 KST` 스냅샷을 사용합니다.

백엔드는 모드와 관계없이 같은 3,797개 Edge 그래프에서 두 경로를 계산합니다.

- `shortest`: `length_m`만 최소화한 일반 최단경로
- `pawsafe`: `length_m × (1 + 1.0 × edge_heat_cost)`를 최소화한 온:길 추천

앱은 `fast`에서 `shortest`만, `cool`에서 두 경로 비교를 표시합니다. `balanced`
경로는 계산하거나 반환하지 않습니다.

응답 핵심 구조:

```json
{
  "analysis_id": "analysis_...",
  "status": "completed",
  "analysis_source": "ongil_gmm_0815_1600",
  "validation_status": "not_validated",
  "requested_departure_at": "2026-08-19T12:00:00+09:00",
  "generated_at": "2026-08-19T03:00:01Z",
  "data_valid_at": "2026-08-15T16:00:00+09:00",
  "graph_version": "ongil-gmm-0815-1600-v1-edges-3797",
  "heat_data_version": "ongil-gmm-0815-1600-v1-snapshot-20260815-1600",
  "weight_profile": {"id": "length_x_1_plus_heat_penalty_1.0"},
  "warnings": [],
  "shortest": {
    "route_id": "shortest_...",
    "label": "일반 최단경로",
    "route_source": "ongil_gmm_graph",
    "geometry": {"type": "LineString", "coordinates": []},
    "distance_m": 874,
    "duration_min": 12,
    "heat_cost": 1.536,
    "shade_ratio": 0.31,
    "direct_sun_minutes": 8.3,
    "edge_count": 24,
    "safety": {
      "score": 41,
      "status": "caution",
      "color": "yellow",
      "should_warn": false,
      "thresholds": {
        "comfortable_max": 40,
        "caution_min": 41,
        "caution_max": 79,
        "warning_min": 80
      }
    }
  },
  "pawsafe": {},
  "comparison": {},
  "heat_segments": []
}
```

`shortest.safety`와 `pawsafe.safety`에는 점수 계산에 사용한 기준 기온,
온도 보정값, 길이 가중 `P(High)`, 상태·색상·문구가 함께 들어갑니다.

## 두 Heat 지표의 의미

- `route.heat_cost`: 포함 Edge의 길이 가중 상대 비용, 범위 `0~2`
- `heat_segments[].heat_cost`: Edge별 GMM 상대 등급 `0·1·2`
- `route.safety.score`: 경로 확정 후 계산한 화면용 열위험 점수, 범위 `1~100`

두 지표 모두 실측 노면온도(℃), 화상 확률 또는 의학·수의학적으로 검증된 절대
안전 판정이 아닙니다. `score >= 80` 경고 기준도 현장 보정 전 초기 운영 기준입니다.

## 표준 오류

```json
{
  "error": {
    "code": "OUT_OF_COVERAGE",
    "message": "현재 온:길 분석 범위를 벗어난 위치입니다.",
    "retryable": false,
    "details": {},
    "request_id": "req_123"
  }
}
```

주요 코드는 `VALIDATION_ERROR`, `OUT_OF_COVERAGE`, `PLACE_NOT_FOUND`,
`SAME_LOCATION`, `NO_WALKABLE_NODE`, `NO_ROUTE`, `ANALYSIS_TIMEOUT`,
`NETWORK_ERROR`, `EXTERNAL_API_TIMEOUT`, `EXTERNAL_API_ERROR`,
`PIPELINE_NOT_READY`, `INVALID_DATA_FILE`, `INVALID_RESPONSE`, `INTERNAL_ERROR`입니다.
