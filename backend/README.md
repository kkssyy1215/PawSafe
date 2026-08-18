# 온:길 API

온:길 앱의 FastAPI 백엔드입니다. 최종 런타임은 모델팀이 전달한
`2026-08-15 16:00 KST` 송파구 GMM Edge 산출물을 읽고, 요청한 출발지와
목적지 사이에서 순수 최단경로와 상대 Heat Cost 최적 경로를 계산합니다.

## 실행

프로젝트 루트에서:

```bash
make setup
make backend
```

또는 백엔드 폴더에서:

```bash
source .venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

- Health: `http://127.0.0.1:8000/health`
- Swagger: `http://127.0.0.1:8000/docs`
- Route: `POST /v1/route-analyses`
- Places: `GET /v1/places/search?q=위례`

## 최종 모델 런타임

`backend/data/models/ongil_gmm_0815_1600/runtime/`의 다음 파일이 필수입니다.

- `edge_cluster_heatcost.gpkg`
- `cluster_heatcost_mapping.csv`
- `route_safety_payload.json`

기본 설정은 다음과 같습니다.

```text
ANALYSIS_PROVIDER=ongil_gmm
PLACE_PROVIDER=catalog
ONGIL_GMM_MODEL_PATH=data/models/ongil_gmm_0815_1600
```

경로 계산에는 ASOS·KMA·Kakao 키가 필요하지 않습니다. 기상 조회 API나 Kakao
자유 장소 검색을 별도로 사용할 때만 `.env`에 각 키를 추가합니다.

## 지표 구분

- `route.heat_cost`: 경로 구간의 길이 가중 Edge 상대 비용, 범위 `0~2`
- `route.safety.score`: 경로 확정 후 계산한 화면용 열위험 점수, 범위 `1~100`
- `heat_segments[].heat_cost`: Edge별 GMM 상대 비용 `0·1·2`
- `heat_segments[].confidence`: 선택된 GMM 군집의 posterior confidence

1~100 점수는 고정 기준시점 기온 26.6℃와 경로의 길이 가중
`P(High)`를 사용합니다. 실측 노면온도나 화상 확률이 아니며 40/80 기준도
현장 검증 전 서비스 운영용 초기 기준입니다.

상세 계약은 [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md), 모델 파일 설명은
[`data/models/ongil_gmm_0815_1600/README.md`](data/models/ongil_gmm_0815_1600/README.md)를
참고합니다.
