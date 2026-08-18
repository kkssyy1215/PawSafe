# Backend implementation status

기준일: 2026-08-18

## 현재 동작

- FastAPI lifespan에서 v5 모델·그래프·그림자 캐시와 coverage 로딩
- 모델팀의 송파 보행 그래프 3,797개 Edge 사용
- ASOS 전날(D-1) 최신 유효 12시간 또는 2026-08-15 16:00 고정 관측 조회
- ASOS 기온·습도·풍속·강수·일사량을 v5 Feature로 변환해 Edge Heat Cost 재계산
- `fast` 거리 최우선 경로와 `cool` 상대 Heat Cost 우선 경로 계산
- Mock, Graph, Kakao 최단 경로, 외부 Provider 경계
- 장소 검색·역지오코딩 Provider와 coverage 검증
- 표준 오류 envelope, request ID, CORS, gzip, 민감정보 로그 제거
- Docker·Render 실행 구성
- pytest 69개, Ruff, strict mypy 검증

공유 기본 설정은 `ANALYSIS_PROVIDER=pawsafe_12day`, `HEAT_COST_PROVIDER=file`입니다.
Mock fixture는 API 키나 실시간 데이터 없이 UI와 오류 흐름을 재현하는 테스트
fallback으로 유지합니다.

## 데이터 상태

- model: `backend/data/models/pawsafe_12day/outputs/heat_cluster_model.joblib`
- graph: `backend/data/models/pawsafe_12day/data/processed/edges_static.gpkg`
- shadow: `backend/data/models/pawsafe_12day/data/processed/shadow_cache_songpa_full_network_v3.parquet`
- ASOS baseline: `backend/data/models/pawsafe_12day/data/raw/asos_hourly.csv`
- coverage: `backend/data/exports/coverage.geojson`
- 응답 상태: `analysis_source=pawsafe_summer_09_21_12day_v5_asos_latest`, `is_demo=false`,
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

현재 모델의 연동 경계와 향후 교체 방법은
[`REALTIME_MODEL_INTEGRATION.md`](REALTIME_MODEL_INTEGRATION.md)를 참고합니다.
