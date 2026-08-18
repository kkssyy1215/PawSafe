# 온:길 모바일 앱 연동 규격

모바일 앱은 모델 파일이나 GeoPackage를 번들하지 않고 FastAPI 계약만 사용합니다.

## 연결 설정

```env
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

물리 기기에서는 `127.0.0.1` 대신 개발 PC의 LAN IP 또는 HTTPS 배포 URL을
사용합니다. API 키는 모바일 환경변수에 넣지 않습니다.

## 주요 API

- `GET /health`: 최종 그래프·GMM 자산 로딩 상태
- `GET /v1/coverage`: 분석 가능 범위
- `GET /v1/places/search`: 지원 장소 검색
- `POST /v1/places/reverse-geocode`: 좌표에서 가까운 지원 장소 찾기
- `POST /v1/route-analyses`: fast/cool 경로 결과

모바일은 `departure_at`을 생략합니다. 백엔드는 요청 시각을 기록하지만 경로 계산은
고정된 `2026-08-15 16:00 KST` Edge 스냅샷을 사용합니다.

- `fast`: `shortest`만 표시
- `cool`: 같은 `shortest`와 `pawsafe`를 비교
- `route.heat_cost`: Edge 상대 비용의 길이 가중 평균 `0~2`
- `route.safety.score`: 화면용 경로 열위험 점수 `1~100`
- `heat_segments[].heat_cost`: Edge별 GMM 등급 `0·1·2`

GeoJSON 좌표는 `[longitude, latitude]` 순서입니다. 정확한 필드·null·오류 규칙은
`backend/docs/API_CONTRACT.md`와 실행 중인 `/openapi.json`을 기준으로 합니다.

## 표시 원칙

- `validation_status=not_validated`와 고정 시점 안내 유지
- 점수를 실측 노면온도나 화상 확률로 표현하지 않음
- 80점 경고는 현장 보정 전 초기 기준임을 문서에 유지
- 지도·경로 화면에 OpenStreetMap과 기상청 가공자료 출처 표시

향후 새 모델은 `RouteAnalysisResponse` 계약을 유지하는 Analysis Provider로
연결합니다. 자세한 경계는
`backend/docs/FINAL_MODEL_INTEGRATION.md`를 기준으로 합니다.
