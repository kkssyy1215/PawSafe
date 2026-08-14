# Implementation Status

## 완료

- FastAPI 앱 factory와 lifespan resource loading/cleanup
- Pydantic v2 settings와 strict API models
- deterministic Mock route scenarios: cool improvement, fast near shortest, balanced tradeoff, same route, no improvement, out-of-coverage, no-route, timeout
- Mock/Kakao 장소 검색과 reverse geocode Provider 구조
- Kakao 도보 API `SHORTEST` baseline Provider와 demo Heat Cost 조합
- GeoJSON/GraphML/GeoPackage/Parquet graph repository 구조
- 데이터팀 edge-only GeoPackage(`edges_static.gpkg`)를 정점쌍으로 분할하고 원본 `edge_id`를 Heat Cost 키로 보존하는 파이프라인 어댑터
- Mock/file/external Heat Cost Provider 구조
- 데이터팀 `edge_time_features.parquet`의 timestamp/Heat Cost alias·Asia/Seoul 시간대·상대 지표 경고 연결
- 비공개 pipeline boundary GeoPackage를 WGS84 coverage로 읽는 어댑터
- internal NetworkX Dijkstra와 external shortest-route Provider 구조
- Graph route analysis, STRtree 후보 검색 + haversine node matching, mode cost, 통계, comparison, GeoJSON
- coverage 검증
- 표준 오류 envelope와 request ID
- CORS allowlist와 gzip
- 위치/주소/키 비로깅 원칙과 privacy sanitizer
- Expo API 계약/OpenAPI
- unit/integration/security-oriented tests
- Docker Python 3.12 실행 환경

## 의도적으로 제외

- K-means/GMM 학습과 모델 파일
- PySolar, 뉴턴 냉각 모델, 실시간 그림자 분석
- Silhouette/Davies-Bouldin 평가
- 임의/random Heat Cost 생성
- 절대 노면온도 예측
- 안전/화상 위험 분류

## 수신 데이터와 실제 전환 전 TODO

- 잠실 환경별 IoT 관측 workbook 수신 완료(원본은 개인정보/재배포 권한 확인 전이므로 비공개 보관)
- 현장 재실측은 MVP 데이터 인계 범위에서 생략 가능하나, edge/time 매핑과 검증 상태 확정은 필요

- 데이터팀 export가 로컬 비공개 경로에 연결되어 Graph Provider를 통한 실제 경로 계산 가능(현재 송파 범위)
- edge ID/CRS/timezone/version 계약 최종 승인
- 실측 검증과 검증 상태
- 검증된 walk-mode 가중치
- 운영 Kakao/외부 분석 credentials 및 staging smoke test
- 대규모 graph용 공간 index와 메모리/latency profiling
- edge geometry 단순화 한도 결정
- API gateway rate limiting과 관측성
- 원자적 데이터 갱신/rollback pipeline
- HTTPS 배포와 Expo 물리 기기 E2E 확인

현재 `demo_*` fixture와 `demo-weight-v1`은 해커톤 흐름 검증용 예시입니다. 연결된
데이터팀 파이프라인도 `validation_status=not_validated`이며 Heat Cost는 상대
열노출 지표일 뿐 실측 노면온도(℃)나 절대 안전 판정이 아닙니다.
