# PawSafe API

PawSafe 모바일 앱이 고정 좌표로 선택한 출발지·목적지와 산책 모드를 보내면, Kakao 도보 API의 최단 경로와 MVP Heat Cost 비교 결과를 조합해 반환하는 FastAPI 백엔드입니다.

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
| `GET` | `/v1/places/search?q=망원&lat=37.55&lng=126.91` | 장소 검색; 좌표는 선택적 근접 검색 힌트 |
| `POST` | `/v1/places/reverse-geocode` | 좌표를 장소 이름으로 변환 |
| `POST` | `/v1/route-analyses` | 일반/PawSafe 경로 비교 |

전체 필드와 null/enum 규칙은 [API 계약](docs/API_CONTRACT.md)을 참고합니다.

## Provider 모드

### Kakao 최단 보행 경로와 좌표 Mock

```env
ANALYSIS_PROVIDER=kakao_walk
HEAT_COST_PROVIDER=mock
PLACE_PROVIDER=mock
KAKAO_REST_API_KEY=서버에만_보관할_Kakao_REST_API_키
```

`ANALYSIS_PROVIDER=kakao_walk`는 Kakao 도보 경로 API에 `route_mode=SHORTEST`를 요청해 최단 경로의 거리·시간·좌표를 가져옵니다. `PLACE_PROVIDER=mock`은 앱의 출발지·목적지·현재 위치·주변 추천을 고정 좌표 fixture로 제공합니다. PawSafe 대체 경로와 Heat Cost는 데이터팀의 그래프·Heat Cost 파일이 연결될 때까지 MVP fixture입니다.

### 데이터팀 파이프라인 연결(Graph 모드)

```env
ANALYSIS_PROVIDER=graph
HEAT_COST_PROVIDER=file
SHORTEST_ROUTE_PROVIDER=internal_graph
PIPELINE_GRAPH_FILE_PATH=/private/path/pipeline/data/processed/edges_static.gpkg
PIPELINE_HEAT_COST_FILE_PATH=/private/path/pipeline/data/processed/edge_time_features.parquet
PIPELINE_WALK_MODE_CONFIG_PATH=app/config_data/walk_modes.pipeline.yaml
COVERAGE_FILE_PATH=/private/path/pipeline/data/raw/songpa_boundary.gpkg
PIPELINE_DATA_VERSION=pipeline-2026-08-13
PIPELINE_TIMEZONE=Asia/Seoul
```

첨부된 `pawsafe_pipeline.zip`은 원본 관측자료와 파생 산출물이 함께 있는
내부용 패키지입니다. 압축을 프로젝트 폴더가 아닌 개인 보관 경로에 풀고,
위 두 파일만 읽기 전용으로 지정합니다. 원본 Excel/CSV, Parquet, GeoPackage,
GeoJSON, 모델 파일은 Git에 추가하거나 Docker 이미지에 복사하지 않습니다.

이 연결은 파이프라인이 계산한 `edge_time_features.parquet`의 상대 Heat Cost와
`edges_static.gpkg`의 보행 그래프를 백엔드 Graph Provider에 주입합니다. API는
요청 시각과 가장 가까운 시간 스냅샷을 고르고, `fast`는 거리 중심, `cool`은
열 비용을 크게 반영해 Dijkstra 경로를 계산합니다. 파이프라인 문서대로 이 값은
실측 노면온도(℃)나 절대 안전 판정이 아니므로 응답은
`validation_status=not_validated`로 표시됩니다. 기존 `kakao_walk` 모드는
파이프라인 파일이 없는 발표용 fallback으로 그대로 남아 있습니다.

로컬에서만 연결하려면 다음처럼 환경변수를 설정합니다.

```env
ANALYSIS_PROVIDER=graph
HEAT_COST_PROVIDER=file
PIPELINE_GRAPH_FILE_PATH=/Users/you/Private/PawSafePipeline/data/processed/edges_static.gpkg
PIPELINE_HEAT_COST_FILE_PATH=/Users/you/Private/PawSafePipeline/data/processed/edge_time_features.parquet
COVERAGE_FILE_PATH=/Users/you/Private/PawSafePipeline/data/raw/songpa_boundary.gpkg
```

서버 시작 후 `/health`에서 `graph_loaded=true`, `heat_data_loaded=true`,
`analysis_provider=graph`, `heat_data_version`을 확인하고, 앱에서 송파 권역의
고정 좌표를 선택해 `/v1/route-analyses`를 호출합니다. 파일이 없거나 형식이
다르면 임의의 Mock 데이터로 조용히 바꾸지 않고 503 준비 오류를 반환합니다.
첨부 export의 시간 범위는 현재 `2026-08-08 01:00`부터 `2026-08-09 00:00`
(Asia/Seoul)이므로 그 범위의 날짜·시간으로 테스트해야 합니다. 범위를 벗어나면
오래된 Heat 데이터로 판단해 `STALE_HEAT_DATA`를 반환합니다.

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
| `ANALYSIS_PROVIDER` | `mock` | `mock`, `kakao_walk`, `graph`, `external` |
| `HEAT_COST_PROVIDER` | `mock` | `mock`, `file`, `external` |
| `PLACE_PROVIDER` | `mock` (`.env.example`) | `mock`, `kakao`; 현재 MVP는 고정 좌표 `mock` |
| `SHORTEST_ROUTE_PROVIDER` | `internal_graph` | `internal_graph`, `external` |
| `ALLOWED_ORIGINS` | local Expo origins | Swagger/Expo Web CORS allowlist |
| `REQUEST_TIMEOUT_SECONDS` | `10` | 전체 분석 제한 시간 |
| `MAX_NODE_MATCH_DISTANCE_M` | `150` | 최근접 보행 Node 허용 거리 |
| `MAX_ROUTE_SEARCH_DISTANCE_M` | `10000` | 입력 좌표 직선거리 상한 |
| `HEAT_MISSING_POLICY` | `exclude` | `exclude`, `conservative`, `regional_median` |
| `LOG_PRECISE_LOCATIONS` | `false` | 정확한 위치 로깅은 구현상 항상 금지; opt-in 시에도 sanitizer는 소수 2자리만 허용 |

## 실제 데이터 교체

1. 데이터팀과 `edge_id`, 좌표계, 시간대, Heat Cost 단위를 먼저 확정합니다.
2. 공개 저장소 밖의 개인 경로에 `edges_static.gpkg`와 `edge_time_features.parquet`를 둡니다.
3. `.env`의 `PIPELINE_*` 절대 경로와 `ANALYSIS_PROVIDER=graph`, `HEAT_COST_PROVIDER=file`을 설정합니다.
4. `/health`에서 두 파일이 로드됐는지 확인하고 고정 좌표로 `/v1/route-analyses`를 호출합니다.
5. 실측 검증 상태를 각 edge의 `validation_status`로 전달합니다. 값이 없다고 0으로 채우지 않습니다.

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
