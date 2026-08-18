# 온:길 배포

## 백엔드: Render

저장소 루트의 `render.yaml`을 Blueprint로 등록합니다. Docker 이미지에는 최종
GMM 3,797 Edge 스냅샷과 점수 설정이 포함됩니다.

기본 환경 변수:

```text
APP_ENV=production
ANALYSIS_PROVIDER=ongil_gmm
PLACE_PROVIDER=catalog
COVERAGE_FILE_PATH=data/exports/coverage.geojson
ONGIL_GMM_MODEL_PATH=data/models/ongil_gmm_0815_1600
ALLOWED_ORIGINS=https://<frontend-host>
```

최종 경로 모델은 KMA·ASOS·Kakao·AWS 키 없이 동작합니다. `ALLOWED_ORIGINS`에는
실제 웹 앱의 HTTPS origin만 쉼표로 구분해 등록합니다. 배포 후 `/health`가
`status=ok`, `analysis_provider=ongil_gmm`인지 확인합니다.

무료 인스턴스는 유휴 후 첫 요청이 느릴 수 있고 GPKG 그래프를 첫 경로 요청에서
메모리에 구성합니다. 운영 전 메모리와 cold start를 실제 배포 환경에서 확인해야
합니다.

## 웹 앱: Vercel

Vercel에서 저장소를 가져오고 Root Directory를 `pawsafe-mobile`로 지정합니다.

```text
EXPO_PUBLIC_API_BASE_URL=https://<backend-host>
```

이 값은 브라우저 번들에 공개되므로 비밀키를 넣으면 안 됩니다. 첫 배포 URL이
정해지면 Render의 `ALLOWED_ORIGINS`를 갱신하고 백엔드를 다시 배포합니다.

## 배포 확인

1. `GET https://<backend-host>/health`
2. `GET https://<backend-host>/v1/capabilities`
3. 웹에서 지원 주소 검색
4. fast 최단경로와 cool 두 경로 비교
5. 지도 타일·경로·출처 표시

현재 모델 결과의 유효시각은 `2026-08-15 16:00 KST`로 고정됩니다. 실시간 날씨
반영 서비스로 설명하지 않습니다.
