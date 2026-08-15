# 데이터 파이프라인 연동 안내

PawSafe는 소스·공유 입력·로컬 산출물·앱 실행 export를 분리합니다.

## 저장소에 포함되는 파일

- `src/pawsafe/`: 전처리, 그림자, 피처, 군집, 경로, 실시간 갱신 코드
- `data/live/edge_time_features_absorptivity_updated_v2.csv`: 승인된 v2 입력 스냅샷
- `data/live/kma_weather.csv`, `asos_hourly.csv`: 가공된 기상 누적 스냅샷
- `backend/data/exports/`: 앱·API 실행에 필요한 그래프, coverage, Heat Cost

## 로컬에만 두는 파일

- `data/raw/`: 재배포 권한을 확인하지 않은 원천 지리·포장재·IoT 자료
- `data/processed/`: 전처리 GeoPackage·Parquet
- `outputs/`: 학습 모델과 검토용 GeoJSON
- `backend/.env`: KMA·ASOS·Kakao API 키

이 파일들은 `.gitignore`로 제외합니다. 새 원천 자료를 공유하려면 먼저
`DATA_ATTRIBUTION.md`에 원천 URL과 이용조건을 기록합니다.

## 전체 모델 생성

```bash
make setup
.venv/bin/python scripts/00_실행환경_확인.py
.venv/bin/python scripts/01_전체_전처리_군집화_실행.py
```

`config.json`의 원천 경로와 CRS를 먼저 확인합니다. 전체 생성에는 Git에 없는
승인된 원천 자료가 필요하므로 일반 기여자는 저장소 clone만으로 재학습할 수
없습니다. 앱과 백엔드 실행에는 재학습이 필요하지 않습니다.

## 실시간 갱신 흐름

```text
KMA·ASOS JSON
  → data/live/*.csv 누적
  → v2 Edge 피처 + 고정 모델로 Heat Cost 재계산
  → backend/data/exports/edge_heat_cost.json 교체
  → FastAPI가 변경된 스냅샷 자동 로딩
```

갱신 전 다음 로컬 산출물이 필요합니다.

- `data/processed/edges_static.gpkg`
- `outputs/heat_cluster_model.joblib`

백엔드를 실행한 뒤 한 번 갱신하려면 `make update-weather`, 매시간 유지하려면
`make update-weather-watch`를 사용합니다.

## 데이터 계약

- Edge key: `edge_id`, `from_node`, `to_node`
- geometry: WGS84 GeoJSON `[longitude, latitude]`
- timezone: `Asia/Seoul`
- Heat Cost: 0~100 상대 지표
- validation: 실측 승인 전 `not_validated`

모바일 앱은 Python 모델이나 원본 파일을 직접 읽지 않고 FastAPI JSON만
사용합니다. 자세한 응답 형식은 `backend/docs/API_CONTRACT.md`를 기준으로 합니다.
