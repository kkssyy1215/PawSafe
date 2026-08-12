# PawSafe API

PawSafe 모바일 앱이 출발지, 목적지, 출발 시각, 산책 모드를 보내면 일반 최단경로와 상대 Heat Cost를 반영한 경로를 비교해 주는 FastAPI 백엔드입니다. 기본 설정은 완전히 결정적인(deterministic) 데모 fixture를 사용합니다.

이 서버는 모델 학습 서버가 아닙니다. K-means/GMM 학습, 실시간 그림자·노면온도 추정, 군집 평가, 실측 검증은 구현하지 않습니다. Heat Cost는 절대 온도나 안전 판정이 아니라 같은 조건에서 경로를 비교하는 상대 지표입니다.

## 빠른 실행

Python 3.12 이상이 필요합니다.

```bash
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -e '.[dev]'
cp .env.example .env
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Python 3.12가 로컬에 없다면 Docker를 사용할 수 있습니다.

```bash
docker compose up --build api
docker compose --profile test run --build --rm test
```

서버 확인:

```bash
curl http://127.0.0.1:8000/health
```

Swagger UI는 `http://127.0.0.1:8000/docs`, OpenAPI JSON은 `/openapi.json`입니다.

## Expo 물리 기기 연결

서버는 `0.0.0.0`에 bind해야 합니다. 휴대폰의 Expo 앱은 개발 PC의 `localhost`에 접근할 수 없으므로 같은 네트워크에 있는 PC의 LAN IP를 사용합니다.

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.0.10:8000
```

모바일과 PC가 같은 네트워크인지, 방화벽이 8000 포트를 허용하는지 확인합니다. 발표 환경에서는 HTTP LAN 주소보다 HTTPS 스테이징 API나 HTTPS 터널을 권장합니다. 카카오 REST API 키는 Expo 환경 변수에 넣지 않고 이 백엔드의 `KAKAO_REST_API_KEY`에만 설정합니다.

## API

| Method | Path | 역할 |
|---|---|---|
| `GET` | `/health` | 데이터/Provider 로딩 상태 |
| `GET` | `/v1/capabilities` | 데모·파이프라인 기능 공개 |
| `GET` | `/v1/coverage` | 분석 영역 GeoJSON |
| `GET` | `/v1/places/search?q=망원` | 장소 검색 |
| `POST` | `/v1/places/reverse-geocode` | 좌표를 장소 이름으로 변환 |
| `POST` | `/v1/route-analyses` | 일반/PawSafe 경로 비교 |

전체 필드와 null/enum 규칙은 [API 계약](docs/API_CONTRACT.md)을 참고합니다.

## Provider 모드

### 기본 Mock 모드

```env
ANALYSIS_PROVIDER=mock
HEAT_COST_PROVIDER=mock
PLACE_PROVIDER=mock
```

`app/fixtures/demo_scenarios.json`의 고정 응답만 사용합니다. 모든 응답은 `is_demo=true`, `validation_status=not_validated`, `analysis_source=mock_fixture`이며 현재의 실제 환경처럼 위장하지 않습니다.

### Graph 모드

```env
ANALYSIS_PROVIDER=graph
HEAT_COST_PROVIDER=file
SHORTEST_ROUTE_PROVIDER=internal_graph
GRAPH_FILE_PATH=data/exports/walk_graph.geojson
HEAT_COST_FILE_PATH=data/exports/edge_heat_cost.parquet
```

Graph 또는 Heat Cost 파일이 잘못되었거나 없으면 서버는 분석 요청에 `INVALID_DATA_FILE` 또는 `PIPELINE_NOT_READY` 503을 반환합니다. Mock으로 조용히 대체하지 않습니다. 보행 그래프와 산책 모드 설정은 lifespan 시작 시 한 번만 로드합니다.

### External 모드

```env
ANALYSIS_PROVIDER=external
ANALYSIS_EXTERNAL_URL=https://analysis.example/v1/route-analyses
```

데이터팀 분석 서비스의 응답을 동일한 Pydantic 계약으로 검증합니다. timeout과 외부 오류는 표준 오류로 변환하고 원본 응답은 앱에 노출하지 않습니다.

장소 검색은 `PLACE_PROVIDER=kakao`와 `KAKAO_REST_API_KEY`로 전환합니다. 키가 없으면 준비되지 않은 구성으로 처리하며 키는 응답·로그에 포함하지 않습니다.

## 주요 환경 변수

`.env.example`이 전체 목록과 기본값입니다.

| 변수 | 기본값 | 설명 |
|---|---|---|
| `ANALYSIS_PROVIDER` | `mock` | `mock`, `graph`, `external` |
| `HEAT_COST_PROVIDER` | `mock` | `mock`, `file`, `external` |
| `PLACE_PROVIDER` | `mock` | `mock`, `kakao` |
| `SHORTEST_ROUTE_PROVIDER` | `internal_graph` | `internal_graph`, `external` |
| `ALLOWED_ORIGINS` | local Expo origins | Swagger/Expo Web CORS allowlist |
| `REQUEST_TIMEOUT_SECONDS` | `10` | 전체 분석 제한 시간 |
| `MAX_NODE_MATCH_DISTANCE_M` | `150` | 최근접 보행 Node 허용 거리 |
| `MAX_ROUTE_SEARCH_DISTANCE_M` | `10000` | 입력 좌표 직선거리 상한 |
| `HEAT_MISSING_POLICY` | `exclude` | `exclude`, `conservative`, `regional_median` |
| `LOG_PRECISE_LOCATIONS` | `false` | 정확한 위치 로깅은 구현상 항상 금지; opt-in 시에도 sanitizer는 소수 2자리만 허용 |

## 실제 데이터 교체

1. 데이터팀과 `edge_id`, 좌표계, 시간대, Heat Cost 단위를 먼저 확정합니다.
2. 보행 그래프와 Heat Cost export를 `data/exports/`에 둡니다.
3. Graph는 GeoJSON, GraphML, GeoPackage(`nodes`/`edges` layer), 또는 edge Parquet 형식을 사용합니다.
4. Heat Cost는 권장 Parquet 또는 JSON을 사용하고 필수 열을 포함합니다.
5. `.env`에서 파일 경로와 Provider를 전환한 뒤 `/health`, graph integration test, 샘플 분석을 확인합니다.
6. 실측 검증 상태를 각 edge의 `validation_status`로 전달합니다. 값이 없다고 0으로 채우지 않습니다.

상세 인계 계약은 [데이터팀 인계 문서](docs/DATA_TEAM_HANDOFF.md)에 있습니다.

## 테스트와 품질 검사

```bash
pytest
ruff check .
ruff format --check .
mypy app
```

테스트는 입력/timezone 검증, coverage, node matching, 모드 비용, null 통계, 비교, request ID, 모든 Mock 시나리오, NetworkX graph 경로, stale/invalid 파일, 개인정보 sanitizer와 OpenAPI를 포함합니다.

## 개인정보와 운영

- 요청 body를 로깅하지 않습니다.
- 주소와 검색어를 로깅하지 않습니다.
- 좌표를 기본 로그에 포함하지 않습니다.
- DB가 없으며 정확한 위치를 저장하지 않습니다.
- 표준 오류에 stack trace, 파일 경로, 키, 원본 외부 응답을 포함하지 않습니다.
- 운영에서도 FastAPI `debug=False`입니다.
- 요청마다 `X-Request-ID` 응답 헤더와 오류 envelope의 `request_id`를 제공합니다.
- CORS는 `*`가 아닌 설정 allowlist만 사용합니다.

## 배포

이미지는 Python 3.12 slim을 사용합니다.

```bash
docker build -t pawsafe-api .
docker run --env-file .env -p 8000:8000 pawsafe-api
```

운영에서는 HTTPS reverse proxy/managed container를 사용하고 health check를 `/health`로 지정합니다. 실제 export는 이미지에 넣기보다 read-only volume 또는 검증된 object storage 배포 단계에서 제공합니다.

## 현재 한계

실제 Heat Cost, 실제 보행 그래프, 실측 검증, 검증된 가중치, 운영용 Kakao/외부 분석 연결, rate limiter, 지속 저장소, 실제 데이터 갱신 파이프라인은 아직 준비되지 않았습니다. 현재 fixture는 해커톤 사용자 흐름 검증용 예시입니다. 자세한 상태는 [구현 상태](docs/IMPLEMENTATION_STATUS.md)를 참고합니다.

