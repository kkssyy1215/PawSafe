# PawSafe API

FastAPI 백엔드입니다. 기본 운영 모드는 모델팀이 전달한 12일 ASOS 학습 모델과
3,797개 보행 Edge를 읽고, 시원한 산책 요청마다 KMA AWS 서울 108번의 최신
관측값을 결합해 Heat Cost와 추천 경로를 다시 계산합니다.

## 실행

프로젝트 루트에서 처음 한 번:

```bash
make setup
```

`backend/.env`에 `KAKAO_REST_API_KEY`와 `KMA_AWS_AUTH_KEY`를 입력한 뒤:

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
| `POST` | `/v1/route-analyses` | fast Kakao 경로 또는 cool 모델 분석 |

공유 기본 설정은 `ANALYSIS_PROVIDER=pawsafe_12day`입니다.

- `fast`: Kakao 도보 최단 경로만 호출하고 모델은 실행하지 않습니다.
- `cool`: KMA AWS 최신 관측 → 모델 피처 변환 → Edge별 Heat Cost → 최저 비용
  경로 순으로 실행합니다.
- 모델 자산: `backend/data/models/pawsafe_12day/`

`KMA_AWS_AUTH_KEY`는 공공데이터포털의 `KMA_SERVICE_KEY`와 다른 기상청
APIHub 인증키입니다. 기존 `KMA_SERVICE_KEY`와 `ASOS_SERVICE_KEY`는 별도의
날씨 확인 API에 사용하며, 12일 모델의 ASOS 기준자료는 버전 고정 CSV입니다.
Heat Cost는 상대 비교 지표이며 노면온도나 절대 안전 판정값이 아닙니다.

상세 계약은 [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md), 전체 실행·테스트
방법은 루트 [`README.md`](../README.md)를 참고합니다.
