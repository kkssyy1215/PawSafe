# PawSafe

[![CI](https://github.com/kkssyy1215/PawSafe/actions/workflows/ci.yml/badge.svg)](https://github.com/kkssyy1215/PawSafe/actions/workflows/ci.yml)

PawSafe는 일반 보행 경로와 상대적인 Heat Cost가 낮은 산책 경로를 비교하는
Expo 앱과 FastAPI 백엔드입니다. 현재 저장소의 공유 기준은 이 루트 하나입니다.

## 저장소 구조

```text
PawSafe/
├── backend/                 FastAPI API, 12일 모델 추론, KMA AWS·Kakao 연동
│   ├── app/                 백엔드 소스
│   ├── data/models/         앱이 읽는 12일 모델·Edge·시간 피처
│   ├── data/exports/        이전 파일 기반 분석 모드의 그래프·Heat Cost
│   └── tests/               백엔드 테스트
├── pawsafe-mobile/          Expo Router 모바일·웹 앱
├── src/pawsafe/             Heat Cost·기상 데이터 파이프라인의 단일 소스
├── data/live/               공유한 최신 CSV 입력 스냅샷
├── scripts/                 설치·전체 테스트 스크립트
├── docs/                    방법론·배포·데이터 인계 문서
├── Makefile                 루트에서 실행하는 공통 명령
└── update_live_heat.py      기상값으로 최신 Heat Cost를 갱신하는 진입점
```

현재 `cool` 요청은 `backend/data/models/pawsafe_12day/`의 모델·Edge·시간 피처를
읽고 KMA AWS 최신 관측을 결합합니다. `backend/data/exports/`는 이전 파일 기반
분석 모드와 갱신 파이프라인 호환을 위해 유지합니다. 개인 API 키는
`backend/.env`에만 두고 Git에는 올리지 않습니다.

Heat Cost는 절대 노면온도나 안전 판정이 아니라, 같은 조건에서 경로를 비교하는
상대 지표입니다. 현재 공개된 데이터의 검증 상태도 앱과 API에서
`not_validated`로 표시합니다.

## 처음 한 번만 설정

Python 3.12 이상과 Node.js 20.19 이상이 필요합니다. macOS에서는 프로젝트
루트에서 다음 한 번만 실행하면 두 Python 환경, 모바일 의존성, 로컬 환경파일을
준비합니다.

```bash
git clone https://github.com/kkssyy1215/PawSafe.git
cd PawSafe
make setup
```

그 다음 `backend/.env`에 Kakao 키와 기상청 APIHub AWS 인증키를 입력합니다.
날씨 확인 API까지 사용할 경우 KMA·ASOS 키도 입력합니다. 키는 백엔드에만 두며
`pawsafe-mobile/.env`의 `EXPO_PUBLIC_` 변수에는 넣지 않습니다.

```text
KAKAO_REST_API_KEY=...
KMA_AWS_AUTH_KEY=...
```

현재 실행 흐름은 `빠른 산책 → Kakao`, `시원한 산책 → 12일 모델 + 실시간
KMA AWS 관측`입니다. 모델은 AWS 데이터로 매 요청 재학습하지 않고, 저장된
모델에 최신 관측 피처를 입력해 Edge Heat Cost와 경로를 다시 계산합니다.

## 화면 테스트

터미널 하나에서 API를 실행합니다.

```bash
make backend
```

다른 터미널에서 웹 화면을 실행합니다.

```bash
make web
```

브라우저에서 Expo가 표시한 주소를 열고, API 상태는
[`http://127.0.0.1:8000/health`](http://127.0.0.1:8000/health), Swagger는
[`http://127.0.0.1:8000/docs`](http://127.0.0.1:8000/docs)에서 확인합니다.

백엔드 없이 화면만 확인하려면 다음을 사용합니다.

```bash
make web-mock
```

실제 휴대폰에서는 `pawsafe-mobile/.env`의
`EXPO_PUBLIC_API_BASE_URL`을 Mac의 LAN IP로 바꾸고 `make backend`를
`--host 0.0.0.0`로 실행해야 합니다. 자세한 내용은
[`DEPLOYMENT.md`](DEPLOYMENT.md)를 참고합니다.

## 기상값과 Heat Cost 갱신

저장소에 포함된 `backend/data/exports/`만으로 앱과 API는 바로 실행할 수 있습니다.
다만 Heat Cost를 다시 계산하려면 재배포 권한 때문에 Git에서 제외한 원본 지리
자료와 학습 산출물(`data/processed/`, `outputs/`)이 로컬에 준비되어 있어야 합니다.
필요한 파일과 생성 순서는
[`docs/DATA_PIPELINE_HANDOFF.md`](docs/DATA_PIPELINE_HANDOFF.md)를 따릅니다.

백엔드가 실행 중인 상태에서 한 번 갱신합니다.

```bash
make update-weather
```

매 정시 자동 갱신을 유지하려면 다음을 사용합니다.

```bash
make update-weather-watch
```

이 작업은 KMA 현재 기상값과 ASOS 전날 동일 시간 일사량을 JSON으로 받아
`data/live/*.csv`에 누적하고, v2 입력을 기준으로 3,797개 Edge의 Heat Cost를
재계산한 뒤 `backend/data/exports/edge_heat_cost.json`을 교체합니다. 서버는
파일 변경 시 자동으로 새 스냅샷을 읽습니다.

## 검증

전체 검사는 루트에서 실행합니다.

```bash
make test
```

검사 범위는 모바일 Jest·TypeScript·ESLint, 백엔드 pytest·Ruff·mypy,
파이프라인 pytest입니다. 웹 배포용 정적 빌드는 다음 명령으로 확인합니다.

```bash
make build-web
```

## 협업 규칙

모든 작업은 이 저장소의 `main`에서 시작합니다.

```bash
git switch main
git pull --ff-only origin main
git switch -c feature/<작업명>
```

기능 변경 후 `make test`를 통과시키고 Pull Request를 만든 뒤 `main`에
병합합니다. 자세한 절차는 [`CONTRIBUTING.md`](CONTRIBUTING.md), API 계약은
[`backend/docs/API_CONTRACT.md`](backend/docs/API_CONTRACT.md),
데이터 설명은 [`docs/DATA_PIPELINE_HANDOFF.md`](docs/DATA_PIPELINE_HANDOFF.md),
저작권·출처 표기는 [`DATA_ATTRIBUTION.md`](DATA_ATTRIBUTION.md)를 참고합니다.

## 배포

- 백엔드: 루트의 [`render.yaml`](render.yaml)로 Render 배포
- 웹 앱: `pawsafe-mobile`을 Vercel Root Directory로 지정
- 배포 절차: [`DEPLOYMENT.md`](DEPLOYMENT.md)

원본 IoT 문서와 개인 API 키는 공개 저장소에 포함하지 않습니다. 공개된 데이터
파일과 지도·기상 API의 출처 및 라이선스는 [`DATA_ATTRIBUTION.md`](DATA_ATTRIBUTION.md)에
정리되어 있습니다. 저장소 코드의 현재 이용조건은 [`LICENSE.md`](LICENSE.md)를
따르며 제3자 데이터의 이용조건을 대체하지 않습니다.
