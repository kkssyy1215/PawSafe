# Data Team Handoff

온:길 앱 백엔드는 데이터팀이 산출한 상대 Heat Cost를 보행 그래프 edge에 결합하고 경로 탐색과 API 응답을 담당합니다. 모델 학습·군집 평가·열 모델·실측 검증은 데이터팀 범위입니다.

## 수신 관측자료 메모 (2026-08-12)

잠실 환경별 IoT 관측 종합 workbook을 수신했다. 이 사실은 MVP 데이터 인계를 위한 상태 기록일 뿐이며, 원본의 값·행·열을 공개 문서로 복제하거나 별도 샘플·정제·요약·파생 데이터를 만들지 않는다.

이 자료로 MVP 데이터 인계를 진행할 수 있으므로 별도 현장 실측을 반복할 필요는 없다. 원본은 작성자 메타데이터가 포함되어 있고 공개 재배포 허가가 확인되지 않아 공개 저장소에 포함하지 않는다. 데이터팀은 원본을 내부 보관한 상태에서 필요 시 `edge_id`, 위치/표면 매핑, timezone, `data_version`, `validation_status`, Heat Cost 변환 규칙을 내부적으로 확정한다. 공개 저장소의 `data/exports/`는 현재 `.gitkeep`만 추적한다.

## 필요한 산출물

1. 보행 그래프
2. Edge × Time Heat Cost export
3. `graph_version`과 `data_version`
4. edge별 `validation_status`
5. 누락 edge 처리 정책과 그 근거

## 합의해야 할 계약

- `edge_id`는 graph와 Heat Cost에서 동일하고 버전 내 유일해야 합니다.
- `from_node`, `to_node` 방향과 양방향 표현 방식을 명시합니다.
- 외부 좌표계는 WGS84(EPSG:4326), GeoJSON은 `[lng, lat]`입니다.
- 내부 거리 계산용 투영 좌표계를 데이터 메타데이터에 명시합니다.
- 시간대는 offset-aware ISO 8601로 전달하며 `valid_at`의 선택/보간 규칙을 합의합니다.
- Heat Cost 정의와 0~100 정규화 기준을 버전별 문서화합니다.
- `shade_ratio`는 0~1 또는 null입니다.
- `direct_sun_minutes`가 edge 통과 중 분 단위인지, 분석 구간 합산값인지 정의합니다.
- `surface_type`, `confidence` 의미와 허용 enum을 합의합니다.
- 실측 검증 전 데이터는 `not_validated`이며 검증을 가장하지 않습니다.
- 갱신 주기, 최대 데이터 age, 원자적 export 교체 방식을 합의합니다.
- 가중치 승인 담당자와 버전 관리 방식을 정합니다.

## Heat Cost 권장 Parquet 스키마

| 필드 | 타입/제약 |
|---|---|
| `edge_id` | string, 필수 |
| `from_node` | string, 필수 |
| `to_node` | string, 필수 |
| `valid_at` | timezone-aware datetime, 필수 |
| `heat_cost` | float 0~100, 필수 |
| `shade_ratio` | float 0~1 또는 null |
| `direct_sun_minutes` | 0 이상 또는 null |
| `surface_type` | string |
| `confidence` | float 0~1 또는 null |
| `validation_status` | 계약 enum |
| `data_version` | string, 필수 권장 |

동일 `(edge_id, valid_at)` 중복은 invalid file로 처리합니다. Graph에 없는 edge는 무시하면서 warning을 반환합니다. Heat가 없는 graph edge는 0으로 채우지 않습니다.

## 누락 정책

- `exclude`: 해당 edge를 온:길 탐색 후보에서 제외합니다. 기본값입니다.
- `conservative`: 명시적인 보수적 설정값(기본 100)을 사용합니다.
- `regional_median`: 현재 snapshot의 알려진 Heat Cost 중앙값을 사용합니다.

선택 정책과 누락 수는 응답 warnings에 포함됩니다. 일반 최단경로의 통계는 알려진 edge만 거리 가중 평균하며, 알려진 Heat edge가 하나도 없으면 `HEAT_DATA_NOT_AVAILABLE`입니다.

## Graph 형식

GeoJSON이 데모/교체에 가장 단순합니다. node는 `node_id`, 좌표를, edge는 `edge_id`, `from_node`, `to_node`, 양수 `distance_m`, `walkable`, `bidirectional`, LineString을 포함합니다. Geometry가 없는 GraphML/Parquet edge는 node 좌표로 생성할 수 있습니다.

지원 로더:

- GeoJSON FeatureCollection (`feature_type=node|edge`)
- GraphML (`lat`, `lng`, edge attributes)
- GeoPackage (`nodes`, `edges` layer)
- edge Parquet (`from/to` node 좌표 포함)

현재 repository는 WGS84 `STRtree`로 최대 허용 거리의 후보를 좁힌 뒤 haversine 거리로 최근접 Node를 확정합니다. 대규모 운영 그래프에서는 데이터팀과 합의한 projected CRS 기반 공간 index로 교체하고 경계·성능을 재검증해야 합니다.

## 책임 흐름

```text
데이터팀: 원천/feature/모델/검증 -> 상대 Heat Cost export
앱 백엔드: export 검증 -> graph 결합 -> Dijkstra -> 통계/GeoJSON API
React Native 앱: 위치/시각/모드 입력 -> API 호출 -> 지도/비교 표시
```

## 연결 절차

1. export를 `data/exports/`에 배치합니다.
2. fixture와 별도로 샘플/계약 검증 테스트를 추가합니다.
3. `.env`에서 `ANALYSIS_PROVIDER=graph`, `HEAT_COST_PROVIDER=file`과 경로를 지정합니다.
4. `/health`의 loaded/version을 확인합니다.
5. 세 모드와 missing/stale/no-route 케이스를 staging에서 검사합니다.
6. 앱에 전달되는 문구가 상대 지표·검증 상태를 정확히 표현하는지 함께 검수합니다.
