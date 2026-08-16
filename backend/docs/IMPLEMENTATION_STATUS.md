# Backend implementation status

기준일: 2026-08-16

## 현재 동작

- FastAPI lifespan에서 그래프·coverage·Heat Cost 파일 로딩
- `backend/data/exports/`의 송파 보행 그래프와 3,797개 Edge Heat Cost 사용
- `fast` 거리 최우선 경로와 `cool` 상대 Heat Cost 우선 경로 계산
- Heat Cost 파일 변경 시 서버 재시작 없이 새 스냅샷 로딩
- KMA 초단기실황과 ASOS 전날 동일 시간 관측 API
- Mock, Graph, Kakao 최단 경로, 외부 Provider 경계
- 장소 검색·역지오코딩 Provider와 coverage 검증
- 표준 오류 envelope, request ID, CORS, gzip, 민감정보 로그 제거
- Docker·Render 실행 구성
- pytest 58개, Ruff, strict mypy 검증

공유 기본 설정은 `ANALYSIS_PROVIDER=graph`, `HEAT_COST_PROVIDER=file`입니다.
Mock fixture는 API 키나 실시간 데이터 없이 UI와 오류 흐름을 재현하는 테스트
fallback으로 유지합니다.

## 데이터 상태

- graph: `backend/data/exports/walk_graph.gpkg`
- Heat Cost: `backend/data/exports/edge_heat_cost.json`
- coverage: `backend/data/exports/coverage.geojson`
- weight profile: `backend/app/config_data/walk_modes.live.yaml`
- 응답 상태: `analysis_source=graph`, `is_demo=false`,
  `validation_status=not_validated`

Heat Cost는 상대 경로 비교 지표이며 실측 노면온도나 절대 안전·화상 위험
판정이 아닙니다.

## 남은 운영 작업

- 실측 표면온도 기반 검증과 validation status 승인
- fast/cool 가중치의 평가·승인·버전 운영
- Render/Vercel HTTPS 배포와 운영 credential 설정
- rate limiting, 관측성, 데이터 갱신 rollback
- 대규모 그래프 latency·memory profiling
- Expo 물리 기기 E2E와 배포 환경 smoke test
- AWS·ASOS 실시간 Edge Heat Cost 재계산 모델 Provider 연결

실시간 모델을 받기 전 연동 경계와 교체 방법은
[`REALTIME_MODEL_INTEGRATION.md`](REALTIME_MODEL_INTEGRATION.md)를 참고합니다.
