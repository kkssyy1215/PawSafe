# 모바일 앱 연동 규격

모바일 앱은 모델 파일이나 GeoPackage를 번들하지 않고 FastAPI 계약만
사용합니다.

## 연결 설정

```env
EXPO_PUBLIC_ANALYSIS_MODE=api
EXPO_PUBLIC_PLACE_SEARCH_MODE=mock
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

물리 기기에서는 `127.0.0.1` 대신 개발 PC의 LAN IP 또는 HTTPS 배포 URL을
사용합니다. API 키는 모바일 환경변수에 넣지 않습니다.

## 주요 API

- `GET /health`: 그래프·Heat Cost 로딩 상태
- `GET /v1/coverage`: 분석 가능 범위
- `GET /v1/places/search`: 장소 검색
- `POST /v1/places/reverse-geocode`: 좌표→장소
- `POST /v1/route-analyses`: fast/cool 경로 비교

GeoJSON 좌표는 `[longitude, latitude]` 순서입니다. 앱은 거리, 예상 시간,
상대 Heat Cost, 최단 경로 대비 차이와 Heat Segment를 표시합니다. 정확한
필드·null·오류 규칙은 `backend/docs/API_CONTRACT.md`와 `/openapi.json`을
기준으로 합니다.

## 표시 원칙

- `fast`: 거리 최우선
- `cool`: 상대 Heat Cost 우선
- Heat Cost: “예상 상대 열노출”로 표시
- `validation_status=not_validated`: 실측 검증 전 안내 유지
- 지도·경로 화면: OpenStreetMap과 기상청 출처 표시 유지
