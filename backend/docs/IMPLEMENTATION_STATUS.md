# Implementation Status

## 완료

- FastAPI 앱 factory와 lifespan resource loading/cleanup
- Pydantic v2 settings와 strict API models
- deterministic Mock route scenarios: cool improvement, fast near shortest, balanced tradeoff, same route, no improvement, out-of-coverage, no-route, timeout
- Mock/Kakao 장소 검색과 reverse geocode Provider 구조
- GeoJSON/GraphML/GeoPackage/Parquet graph repository 구조
- Mock/file/external Heat Cost Provider 구조
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

- 데이터팀의 실제 보행 graph와 edge-time Heat Cost
- edge ID/CRS/timezone/version 계약 최종 승인
- 실측 검증과 검증 상태
- 검증된 walk-mode 가중치
- 운영 Kakao/외부 분석 credentials 및 staging smoke test
- 대규모 graph용 공간 index와 메모리/latency profiling
- edge geometry 단순화 한도 결정
- API gateway rate limiting과 관측성
- 원자적 데이터 갱신/rollback pipeline
- HTTPS 배포와 Expo 물리 기기 E2E 확인

현재 모든 `demo_*` fixture와 `demo-weight-v1`은 해커톤 흐름 검증용 예시이며 과학적으로 검증된 값이 아닙니다.
