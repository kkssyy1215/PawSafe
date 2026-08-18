# 온:길 백엔드 구현 상태

기준일: 2026-08-19

## 현재 동작

- FastAPI 시작 시 분석 범위와 중복 제거된 송파구 지원 장소 카탈로그 로딩
- 첫 경로 요청 시 최종 GMM 3,797 Edge를 그래프로 구성하고 프로세스 내 캐시
- 같은 그래프에서 순수 최단경로와 상대 Heat Cost 최적 경로 계산
- Edge Heat Cost `0·1·2`, GMM 군집 확률·신뢰도, 그늘·포장 정보를 응답
- 경로 확정 후 길이 가중 `P(High)`와 기준 기온 26.6℃로 1~100 점수 계산
- 40 이하 쾌적, 41~79 주의, 80 이상 산책 자제 상태·문구 반환
- 장소 검색, 역지오코딩, 분석 범위 검증, 표준 오류, request ID, CORS, gzip
- Docker·Render 설정과 자동 테스트 구성

기본 설정은 다음과 같습니다.

```text
ANALYSIS_PROVIDER=ongil_gmm
PLACE_PROVIDER=catalog
ONGIL_GMM_MODEL_PATH=data/models/ongil_gmm_0815_1600
```

최종 경로 계산은 KMA·ASOS·Kakao 또는 AWS 키를 요구하지 않습니다.

## 모델 자산

- Edge 결과: `data/models/ongil_gmm_0815_1600/runtime/edge_cluster_heatcost.gpkg`
- 군집 매핑: `data/models/ongil_gmm_0815_1600/runtime/cluster_heatcost_mapping.csv`
- 점수 기준: `data/models/ongil_gmm_0815_1600/runtime/route_safety_payload.json`
- 추적 자산: Edge feature Parquet, 선택 feature CSV, 원본 Notebook·loader, SHA-256
- 분석 범위: `data/exports/coverage.geojson`
- 지원 장소: `data/supported_places.json`

## 제출본 정리 상태

- 가상 GPS·자동 이동 타이머 제거
- 로컬 Mock 분석·장소 Provider와 하드코딩 경로 결과 제거
- 임시 결과 보기 버튼·시연 전용 음성 파일 제거
- 이전 12일 모델 런타임과 오래된 모델 자산 제거
- API 응답의 데모 식별 필드 제거
- 최종 배포 설정을 GMM Provider로 통일

## 제한과 다음 운영 작업

- 모델 유효시각은 `2026-08-15 16:00 KST`로 고정되어 있습니다.
- 경로 점수는 실측 노면온도나 검증된 화상 위험도가 아닙니다.
- 실측 표면온도와 다양한 날짜·계절 데이터로 GMM 및 40/80 기준을 검증해야 합니다.
- 실시간 모델로 교체할 때는 동일 API 응답 계약을 유지하는 새 Analysis Provider를
  연결하면 모바일 화면 구조는 유지할 수 있습니다.
- 운영 배포 전 HTTPS, rate limiting, 관측성, 물리 기기 위치·음성 QA가 필요합니다.

연동 경계는 [`FINAL_MODEL_INTEGRATION.md`](FINAL_MODEL_INTEGRATION.md)를 참고합니다.
