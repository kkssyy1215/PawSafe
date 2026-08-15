# PawSafe Walk Mode Weight Profile

실행 환경은 `app/config_data/walk_modes.live.yaml`, Mock 테스트는
`walk_modes.demo.yaml`을 사용합니다. 두 설정 모두 경로 간 상대 비교를 위한
초기값이며 검증된 과학적·안전 가중치가 아닙니다.

## 비용식

각 edge에서:

```text
heat_ratio = heat_cost / 100
heat_exposure_cost = distance_m * heat_ratio
total_cost = alpha * distance_m + beta * heat_exposure_cost
```

경로 비용은 edge `total_cost`의 합이며 NetworkX Dijkstra로 최소화합니다.

| mode | live alpha | live beta | 의도 |
|---|---:|---:|---|
| `fast` | 1.00 | 0.00 | 거리 최우선 |
| `cool` | 0.05 | 0.95 | 상대 Heat Cost를 크게 반영 |

Mock 설정은 사용자 흐름 검증을 위해 `fast=0.85/0.15`,
`cool=0.25/0.75`를 사용합니다.

## 경로 통계

- distance: `sum(edge.distance_m)`
- duration: `distance / WALKING_SPEED_M_PER_MINUTE`; 교통/개체 속도를 반영하지 않은 추정치
- route Heat Cost: `sum(distance * heat_cost) / sum(distance)`
- shade ratio: 값이 있는 edge만 거리 가중 평균
- direct sun minutes: 데이터가 있는 edge 값을 합산; 임의 추정하지 않으며 전부 없으면 null

## 교체 방법

1. 데이터팀/제품/검증 담당자가 가중치 책임과 평가 목표를 합의합니다.
2. 새 YAML에 새 `version`과 각 mode의 고유 `id`를 부여합니다.
3. `alpha`, `beta`는 각각 0~1이며 합이 1이어야 합니다.
4. `WALK_MODE_CONFIG_PATH`를 새 파일로 바꿉니다.
5. 경로 회귀 fixture, 실제 heat snapshot, 거리 상한, no-improvement 결과를 재검증합니다.
6. `is_demo=false`는 실제 검증과 승인 이후에만 설정합니다.
