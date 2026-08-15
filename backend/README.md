# PawSafe API

FastAPI 백엔드입니다. 경로 그래프와 Heat Cost는
`backend/data/exports/`를 기준으로 읽고, KMA·ASOS 기상 API는 요청 시 조회합니다.

## 실행

프로젝트 루트에서 처음 한 번:

```bash
make setup
```

`backend/.env`에 API 키를 입력한 뒤:

```bash
make backend
```

확인 주소:

- Health: `http://127.0.0.1:8000/health`
- Swagger: `http://127.0.0.1:8000/docs`
- KMA: `http://127.0.0.1:8000/v1/weather/current`
- ASOS: `http://127.0.0.1:8000/v1/weather/asos/reference`

## 주요 API

| Method | Path | 역할 |
| --- | --- | --- |
| `GET` | `/health` | 그래프·Heat Cost 로딩 상태 |
| `GET` | `/v1/capabilities` | 앱 기능과 데이터 상태 |
| `GET` | `/v1/coverage` | 분석 영역 |
| `GET` | `/v1/weather/current` | KMA 현재 기상 |
| `GET` | `/v1/weather/asos/reference` | ASOS 전날 동일 시간 일사량 |
| `POST` | `/v1/route-analyses` | fast/cool 경로 비교 |

`ANALYSIS_PROVIDER=graph`와 `HEAT_COST_PROVIDER=file`이 공유 데이터 연결
설정입니다. `fast`와 `cool`만 사용하며 Heat Cost는 상대 비교 지표입니다.

상세 계약은 [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md), 전체 실행·테스트
방법은 루트 [`README.md`](../README.md)를 참고합니다.
