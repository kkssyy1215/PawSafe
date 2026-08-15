# PawSafe 분석·경로추천 파이프라인

외부 데이터 출처와 재배포 조건은 [데이터 출처 문서](../DATA_ATTRIBUTION.md)를 따릅니다.

송파구 보행로를 `Edge × 시간` 단위로 만들고, 건물·가로수 그림자와 ASOS 일사·기상, 포장재를 결합해 **상대적 노면 열노출**을 계산합니다. K-means와 GMM을 비교한 뒤 선택 모델의 군집을 Heat Cost(0~100)로 해석하고, 거리와 Heat Cost를 함께 사용해 산책 경로를 추천합니다.

> 이 결과는 실측 노면온도(℃)의 대체물이 아닙니다. 현재 정답값(Y)이 부족하므로 서비스 출력은 “예상 상대 열노출”입니다. 실측 온도 파일을 추가하면 방향성 검증까지 자동 수행합니다.

## 1. 전체 흐름과 선택 근거

| 단계 | 수행 내용 | 이렇게 한 이유 |
|---|---|---|
| 공간 전처리 | 보행로·건물·가로수를 EPSG:5186으로 통일하고 송파구로 자름 | 거리, 높이, 그림자 길이는 미터 좌표계에서 계산해야 함 |
| 포장재 결합 | SWM 포장 지점/영역을 가까운 Edge와 결합 | 포장재에 따라 단파복사 흡수율이 달라짐. 알 수 없는 구간은 별도 코드 처리 |
| 태양·그림자 | PySolar 태양고도·방위각과 건물 높이·수관으로 시간대별 그림자 생성 | ASOS 일조시간만으로는 어느 도로가 그늘인지 알 수 없기 때문 |
| 누적 일사 | `일사 × (1-그늘비율) × 흡수율`의 최근 6시간 합 | 같은 현재 일사라도 이전에 오래 햇빛을 받은 노면은 더 많은 열을 저장할 수 있음 |
| 열저장 상태 | 태양 입력은 더하고, 시간·바람·강수에 따라 지수적으로 감소 | 뉴턴 냉각 개념을 이용한 1차 열관성 근사. 절대온도식이 아닌 상대 피처 |
| 군집 | 표준화 후 K-means/GMM, k=2~5 비교 | 정답값 없이 반복되는 열환경 유형을 찾기 위함. 비구형 군집 가능성 때문에 GMM도 비교 |
| 모델 선택 | Silhouette↑, Davies–Bouldin↓를 함께 평가 | 군집 분리도와 군집 내부 응집도를 동시에 확인 |
| Heat Cost | 군집 프로필에 물리적 방향 가중치를 적용해 0~100 변환 | 군집 번호 자체에는 고온/저온 의미가 없으므로 해석 단계가 필요 |
| 경로 | Edge 길이에 Heat Cost 패널티를 더해 Dijkstra 수행 | 최단거리와 열노출 사이의 trade-off를 명시적으로 조정 가능 |

## 2. 데이터 배치

`data/raw/` 아래에 다음 이름으로 놓습니다. 원본 이름을 바꾸기 어렵다면 `config.json` 경로만 수정합니다.

| 파일명 | 원본 | 필수 여부 |
|---|---|---|
| `songpa_walkways.gpkg` | 송파구 OSM 보행로 | 필수 |
| `songpa_boundary.gpkg` | 송파구 경계 | 필수 |
| `buildings_seoul.zip` | 연속수치지형도 건물 서울 ZIP | 필수 |
| `building_register.csv` | 건축물대장 표제부 | 권장; 없으면 층수×3m |
| `street_trees.csv` | 서울시 가로수 위치 | 권장 |
| `asos_hourly.csv` | 기상청 ASOS 시간자료 | 필수 |
| `edge_time_features_absorptivity_updated_v2.csv` | 팀 제공 revised Edge×시간 흡수율 피처 | 실시간 갱신 기준 |
| `SWM_WKAR_AS.csv` | 서울시 보도 포장 공간자료 | 권장 |
| `SWM_BASIC_CODE.csv` | 포장 코드표 | 설명용 |
| `measured_surface_temperature.csv` | 직접 측정한 선택 자료 | 선택 |

건물 ZIP은 압축을 풀지 않아도 됩니다. 코드가 최초 실행 시 `data/processed/buildings_extracted/`에 풉니다.

## 3. 설치와 실행

Windows PowerShell 기준:

```powershell
cd pawsafe_pipeline
py -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python preflight.py
python run_pipeline.py --start 127.1000,37.5100 --end 127.1200,37.5050 --time "2026-08-08 15:00"
```

macOS/Linux 기준:

```bash
cd pawsafe_pipeline
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements-dev.txt
python preflight.py
python check_known_pavement.py
python run_pipeline.py --start 127.1000,37.5100 --end 127.1200,37.5050 --time "2026-08-08 15:00"
```

압축파일에 들어 있던 Windows `.venv`는 운영체제가 달라 재사용하지 않습니다. 새 환경은 Python 3.12로 만들고, `requirements-dev.txt`에는 내장 테스트와 IoT 검증 차트에 필요한 개발 의존성까지 포함합니다.

경로를 만들지 않고 데이터·모델만 생성하려면:

```powershell
python run_pipeline.py
```

### 기상청 JSON → CSV → 실시간 Heat Cost

백엔드의 기상청 엔드포인트가 실행 중인 상태에서 한 번만 갱신하려면:

```bash
python update_live_heat.py
```

한 시간마다 자동 갱신하려면 별도 터미널에서 다음 프로세스를 계속 실행합니다.

```bash
python update_live_heat.py --watch
```

자동 모드는 기상청 초단기실황 제공 시각을 고려해 매시 45분에 갱신합니다.

기상 JSON은 `data/live/kma_weather.csv`, ASOS 시간자료는
`data/live/asos_hourly.csv`에 관측시각별로 누적되고, 같은 관측시각은 중복 저장하지
않습니다. 최신 Edge 피처는
`data/processed/edge_time_features_live.parquet`, 지도 및 앱 데이터는 각각
`outputs/edge_heat_live.geojson`, `outputs/app_edge_heat.geojson`에 원자적으로
교체됩니다.

초단기실황의 기온·습도·풍속·강수와 서울 108 지점 ASOS의 전일 동일 시간 일사량을
결합합니다. 결과는 `validation_status=not_validated`,
`solar_source=ASOS_STATION_108_PREVIOUS_DAY_REFERENCE`로 명시됩니다. ASOS 시간자료의
D-1 제약 때문에 현재 시각의 실시간 일사 관측값이 아니라 전일 참조값입니다.

실시간 갱신은 팀 제공 `data/live/edge_time_features_absorptivity_updated_v2.csv`를
기준표로 사용합니다. revised `surface_absorptivity`를 반영해 `effective_solar_mj_m2`,
누적 일사량, `heat_storage_proxy`를 다시 계산한 뒤 기존 학습 모델을 고정하고 Heat Cost만
재산출합니다. 따라서 매시간 모델 자체를 다시 학습하지 않습니다.

시간 범위가 너무 크면 건물 그림자 계산량이 커집니다. 해커톤 PoC에서는 `config.json`의 `time.start`, `time.end`를 폭염일 1일, 간격을 60분으로 두는 것을 권장합니다.

## 4. 주요 산출물

| 파일 | 네이티브 앱 사용법 |
|---|---|
| `outputs/edge_heat_latest.geojson` | 지도 위 도로별 Heat Cost 색상 표시 |
| `outputs/edge_heat_live.geojson` | 최신 기상값으로 자동 갱신한 Edge Heat Cost |
| `outputs/route_comparison.geojson` | fast/cool 경로 선 표시 |
| `outputs/route_comparison.json` | 거리, 평균 Heat Cost, Edge 목록 표시 |
| `outputs/graph_nodes.geojson` | 출발·도착점 스냅 또는 디버깅 |
| `outputs/cluster_metrics.csv` | K-means/GMM 평가표 |
| `outputs/cluster_profiles.csv` | 군집별 열환경 특징 설명 |
| `outputs/heat_cluster_model.joblib` | 동일 피처에 군집 재적용 |
| `data/processed/edge_time_features.parquet` | 서버/앱 백엔드용 전체 시간 데이터 |

자세한 필드와 앱 계약은 [docs/NATIVE_APP_HANDOFF.md](docs/NATIVE_APP_HANDOFF.md), 방법론 한계는 [docs/METHODOLOGY.md](docs/METHODOLOGY.md)를 참고합니다.

## 5. 경로 모드

- `fast`: 열 가중치 0.0 — 거리 우선
- `cool`: 0.95 — 열노출 감소 우선

모든 모드는 같은 Edge 길이를 사용하며, Heat Cost가 높은 Edge의 유효 비용만 더 크게 만듭니다. 따라서 1.5km의 그늘길이 1km의 노출길보다 항상 선택되는 것이 아니라 선택 모드와 실제 Heat Cost 차이에 따라 결정됩니다.

## 6. 실측 검증

`data/raw/measured_surface_temperature.csv`에 다음 형태로 5개 이상 넣으면 Spearman 순위상관을 계산합니다.

```csv
edge_id,timestamp,surface_temperature_c
E0000123,2026-08-08 15:00,44.2
```

절대 오차보다 “Heat Cost가 높은 구간이 실제로도 더 뜨거운가”를 먼저 확인합니다. ℃ 예측으로 확장하려면 더 많은 시공간 실측값으로 별도 회귀모델을 학습해야 합니다.
