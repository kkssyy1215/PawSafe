# 최종 GMM 모델 연동

## 현재 런타임

백엔드는 모델팀이 전달한 `2026-08-15 16:00 KST` GMM 산출물을 직접 읽습니다.
Notebook 전체를 경로 요청마다 다시 실행하거나 GMM을 재학습하지 않습니다.

필수 파일은 다음과 같습니다.

```text
backend/data/models/ongil_gmm_0815_1600/runtime/
├── edge_cluster_heatcost.gpkg
├── cluster_heatcost_mapping.csv
└── route_safety_payload.json
```

파일 누락 시 `/health`가 degraded가 되고 경로 요청은 `PIPELINE_NOT_READY`를
반환합니다. 원본 ZIP과 저장소 자산의 동일성은 같은 폴더의 `SHA256SUMS`로 확인할
수 있습니다.

## 요청 처리 흐름

1. 앱이 지원 장소의 주소와 좌표, `fast | cool`을 `POST /v1/route-analyses`로 전달
2. 백엔드가 WGS84 좌표를 EPSG:5186으로 변환
3. 0.5m 단위로 연결한 보행 그래프의 가장 가까운 Node에 출발·도착점을 매칭
4. `length_m` 기준 최단경로 계산
5. `length_m × (1 + Heat Cost)` 기준 온:길 경로 계산
6. 각 경로에 대해 GMM 고온 군집 확률을 길이 가중 평균해 1~100 점수 계산
7. 두 경로, 비교값, Edge 구간, 점수·경고 payload를 한 응답으로 반환

최종 모델의 Edge Heat Cost는 `0·1·2`입니다. 사용자가 보는 1~100 점수와 같은
값이 아니며, 경로를 정한 뒤 별도 후처리로 계산됩니다.

## 앱과의 경계

앱은 GPKG·GMM·기상 API를 직접 알지 않습니다. 다음 응답 필드만 사용합니다.

- `shortest`, `pawsafe`: 지도 선, 거리, 시간, 상대 Heat Cost, `safety`
- `comparison`: 거리·시간·Heat Cost 차이
- `heat_segments`: 추천 경로의 Edge별 0·1·2와 confidence
- `warnings`: 고정 시점과 상대 지표 제한 안내

따라서 향후 실시간 ASOS/KMA 모델이나 새 학습 모델로 바뀌어도
`RouteAnalysisResponse`를 유지하면 프론트 화면을 갈아엎지 않아도 됩니다.
새 모델은 `AnalysisProvider` 구현 하나에서 입력과 출력을 현재 계약으로 변환합니다.

## 고정 시점 제한

`departure_at`은 사용자 요청 기록용입니다. 현재 Provider는 어떤 요청 시각에도
고정된 `2026-08-15 16:00 KST` Edge 상태를 사용합니다. 현재 날씨나 미래 날씨를
반영한다고 설명하면 안 됩니다. 그 기능이 필요하면 날씨 feature 생성, 모델 추론,
Edge 비용 갱신을 수행하는 별도 실시간 Provider가 필요합니다.
