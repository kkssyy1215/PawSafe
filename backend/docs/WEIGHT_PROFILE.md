# 최종 GMM 경로 가중치와 점수

최종 `ongil_gmm` 모드는 과거 YAML의 alpha/beta 프로필을 사용하지 않습니다.
모델팀 산출물의 Edge 상대 Heat Cost `0·1·2`를 그대로 사용합니다.

## 경로 탐색 비용

각 Edge에서:

```text
shortest_weight = length_m
ongil_weight = length_m × (1 + 1.0 × relative_heat_cost)
```

NetworkX Dijkstra가 각 비용의 합이 가장 작은 경로를 찾습니다.

- `fast`: 앱에서 순수 최단경로만 표시
- `cool`: 일반 최단경로와 온:길 경로를 비교
- `balanced`: 없음

경로의 `heat_cost`는 포함 Edge의 거리 가중 평균입니다.

```text
route_relative_heat = Σ(length_i × heat_cost_i) / Σ(length_i)
```

## 1~100 경로 열위험 점수

경로가 확정된 후 고온 군집 확률을 길이로 가중 평균합니다.

```text
P_high_route = Σ(length_i × P_i(High)) / Σ(length_i)
temperature_factor = clip((26.6 - 0) / (50 - 0), 0, 1)
score_raw = clip(temperature_factor × P_high_route × 100, 0, 100)
score = round_half_up(score_raw), 최소 표시값 1
```

상태는 `1~40 comfortable`, `41~79 caution`, `80~100 danger`입니다.

이 기준은 모델 출력의 상대 비교를 화면에 전달하기 위한 초기 규칙입니다. 실측
노면온도, 화상 확률, 의학·수의학적으로 보정된 안전 판정이 아니므로 현장 검증
없이 절대 위험도로 해석하면 안 됩니다.
