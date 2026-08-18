# PawSafe API

FastAPI 백엔드입니다. 기본 운영 모드는 모델팀이 전달한 12일 ASOS 학습 모델과
3,797개 보행 Edge를 읽고, 경로 요청마다 ASOS 서울 108번의 최근 12시간
기온·습도·풍속·강수·일사량을 결합해 Heat Cost와 추천 경로를 다시 계산합니다.

## 실행

프로젝트 루트에서 처음 한 번:

```bash
make setup
```

`backend/.env`에 `ASOS_SERVICE_KEY`를 입력합니다. Kakao 장소 검색까지 사용할
경우 `KAKAO_REST_API_KEY`도 입력한 뒤:

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
| `POST` | `/v1/route-analyses` | 동일 모델 그래프의 fast 최단경로 또는 cool 경로 비교 |

공유 기본 설정은 `ANALYSIS_PROVIDER=pawsafe_12day`입니다.

- `fast`: `cool`과 같은 보행로 그래프에서 계산한 거리 기준 최단경로만 표시합니다.
- `cool`: 최신 유효 ASOS 12시간 관측 → 모델 피처 변환 → Edge별 Heat Cost → 거리 기준
  최단경로와 최저 Heat Cost 경로 비교 순으로 실행합니다.
- 모델 자산: `backend/data/models/pawsafe_12day/`

기본값 `PAWSAFE_ASOS_INFERENCE_MODE=latest`는 ASOS가 제공하는 전날(D-1)의
09~21시 중 직전 12시간이 완전한 최신 시각을 사용합니다. 시연에서 같은 결과를 반복하려면 `fixed`로 바꾸며,
이 경우 `PAWSAFE_ASOS_FIXED_TIMESTAMP`의 2026-08-15 16:00을 사용합니다.
Heat Cost는 상대 비교 지표이며 노면온도나 절대 안전 판정값이 아닙니다.

상세 계약은 [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md), 전체 실행·테스트
방법은 루트 [`README.md`](../README.md)를 참고합니다.
