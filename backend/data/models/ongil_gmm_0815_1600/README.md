# 온:길 최종 GMM 모델 자산

이 폴더는 `2026-08-15 16:00 KST` 송파구 전체 보행로를 분석한 최종 GMM
산출물과 재현용 소스를 보관합니다.

## 앱 실행에 필요한 파일

- `runtime/edge_cluster_heatcost.gpkg`: 3,797개 Edge의 상대 Heat Cost
  `0·1·2`, GMM posterior probability, confidence, 그늘·일사·포장 특성
- `runtime/cluster_heatcost_mapping.csv`: raw cluster를 Heat Cost `0·1·2`로
  재배정한 결과
- `runtime/route_safety_payload.json`: 기준 기온과 1~100 경로 점수 계산 설정

`edge_features_0815_1600.parquet`와 `selected_features.csv`는 결과 추적용이며,
`source/`는 모델팀이 전달한 Notebook과 loader 원본입니다.

## 런타임 계산

백엔드는 GMM을 다시 학습하지 않습니다. 요청 좌표를 보행 그래프 Node에 연결한 뒤
다음 두 경로를 매 요청마다 계산합니다.

- 최단경로: `length_m`
- 온:길 추천: `length_m × (1 + 1.0 × relative_heat_cost)`

경로 확정 뒤 각 구간의 길이, 26.6℃ 기준 기온 factor, 고온 군집 posterior
`P(High)`를 사용해 1~100 경로 열위험 점수를 계산합니다. 40점 이하는 쾌적,
41~79점은 주의, 80점 이상은 산책 자제 경고입니다.

이 점수와 기준은 실측 노면온도, 화상 확률 또는 의학·수의학적으로 보정된 절대
안전 판정이 아닙니다. 현장 검증 전에는 고정 시점 상대 비교 결과로만 해석해야
합니다.
