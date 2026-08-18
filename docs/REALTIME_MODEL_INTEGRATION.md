# 실시간 모델 연동 구조

현재 앱은 두 산책 스타일에 같은 12일 모델 공급자와 보행로 그래프를 사용합니다.

```text
fast
  → 3,797개 Edge의 거리 기준 최단 경로
  → 빠른 산책 결과만 표시

cool
  → KMA ASOS 서울 108번의 전날(D-1) 최신 유효 관측 조회
  → 직전 12시간이 완전한 13개 정시 관측 창 생성
  → 사전 계산한 시간대별 그늘 + Edge 공간·포장 피처 결합
  → 저장된 군집 모델 추론 + 연속 Heat Cost 계산
  → 최단 경로와 Heat Cost 최소 경로 계산
  → 기존 RouteAnalysisResponse 계약으로 반환
```

같은 출발지·목적지라면 fast에 표시되는 경로는 cool 비교 화면의 `shortest`와
동일합니다. 차이는 fast 화면이 `pawsafe`와 Heat Cost 비교를 숨긴다는 점입니다.

## 모델 교체 경계

모바일 앱은 Python 모델 파일을 읽지 않고 `POST /v1/route-analyses` JSON만
사용합니다. 다음 모델이 같은 응답 계약을 유지하면 프론트 코드를 갈아엎지 않고
`Pawsafe12DayAnalysisProvider` 내부 또는 Provider 설정만 교체할 수 있습니다.

필수 응답은 `shortest`, `pawsafe`, `comparison`, `heat_segments`, 모델·데이터
버전과 유효시각입니다. GeoJSON 좌표는 항상 `[longitude, latitude]`입니다.

## 현재 모델의 정확한 의미

- 학습/기준: 제공받은 12일 ASOS 자료와 Edge 시간 피처
- 요청 시 입력: KMA ASOS 기온·습도·풍속·강수·일사 관측
- 재계산: Edge 피처, 상대 Heat Cost, 경로
- 하지 않는 것: 요청마다 모델 재학습, 미래 단기예보, 노면온도(℃) 예측,
  절대 안전 판정

`ASOS_SERVICE_KEY`가 없는 환경에서는 자산 검증과 목 관측 통합 테스트까지는
가능하지만 실제 실시간 cool 요청은 준비되지 않은 상태로 반환됩니다.

운영 기본값은 `PAWSAFE_ASOS_INFERENCE_MODE=latest`이며 ASOS 제공 범위상 전날
최신 자료를 사용합니다. 같은 결과를 반복하는
시연에서는 `fixed`로 바꾸면 `2026-08-15 16:00`과 직전 12시간을 사용합니다.
