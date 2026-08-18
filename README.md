# 온:길 (On:Gil)

[![CI](https://github.com/kkssyy1215/PawSafe/actions/workflows/ci.yml/badge.svg)](https://github.com/kkssyy1215/PawSafe/actions/workflows/ci.yml)

온:길은 노면 열환경을 고려해 일반 최단 보행경로와 상대적으로 열부담이 낮은
경로를 비교하고, 시각장애인·안내견 사용자를 위한 전경 GPS 음성 안내를 제공하는
Expo + FastAPI 프로젝트입니다. 저장소 이름은 기존 협업 링크 호환을 위해
`PawSafe`를 유지하지만 앱에 표시되는 서비스명은 온:길입니다.

## 현재 적용 모델

최종 앱 런타임은 `2026-08-15 16:00 KST` 송파구 전체 보행로를 분석한
3군집 GMM 산출물을 사용합니다.

- 입력 특성: 그늘 비율, 누적 유효 일사량, 포장면 흡수율
- Edge 상대 Heat Cost: 쾌적 `0`, 주의 `1`, 고온 `2`
- 최단경로 가중치: `length_m`
- 온:길 추천 가중치: `length_m × (1 + 1.0 × Heat Cost)`
- 경로 확정 후 GMM의 `P(High)`, 경로 길이, 기준 기온 26.6℃로 1~100
  경로 열위험 점수 계산
- 점수 40 이하 쾌적, 41~79 주의, 80 이상 산책 자제 경고

Edge Heat Cost와 1~100 점수는 실측 노면온도, 화상 확률 또는 의학·수의학적으로
보정된 절대 안전 판정이 아닙니다. 현재 모델은 고정 시점의 상대 경로 비교
결과이며 현장 검증 전이라는 제한을 API와 화면에 함께 표시합니다.

## 구조

```text
PawSafe/
├── backend/
│   ├── app/                          FastAPI와 GMM 경로 계산
│   ├── data/models/ongil_gmm_0815_1600/
│   │   ├── runtime/                  앱 실행용 GPKG·mapping·점수 기준
│   │   └── source/                   모델팀 Notebook·loader 원본
│   ├── data/supported_places.json    중복 없는 지원 주소·좌표
│   └── tests/
├── pawsafe-mobile/
│   ├── app/                          Expo Router 화면
│   ├── src/                          API·지도·음성 인식·GPS 안내
│   └── tests/
├── src/pawsafe/                      연구·데이터 파이프라인
└── scripts/                          설치·통합 검사
```

백엔드는 시작 후 첫 경로 요청에서 3,797개 Edge를 읽어 그래프를 캐시합니다.
경로 요청마다 출발·도착 좌표를 가까운 보행 Node에 연결하고 최단경로와 Heat Cost
최적 경로를 계산합니다. GMM을 요청마다 다시 학습하거나 기상 API를 호출하지
않습니다.

## 처음 설정

Python 3.12 이상과 Node.js 20.19 이상이 필요합니다.

```bash
git clone https://github.com/kkssyy1215/PawSafe.git
cd PawSafe
make setup
```

최종 경로 API는 별도 API 키 없이 실행됩니다. Kakao 장소 자유 검색 또는 KMA·ASOS
조회 API를 별도로 사용할 때만 해당 키를 `backend/.env`에 넣습니다. 앱 번들에
포함되는 `EXPO_PUBLIC_` 변수에는 비밀키를 넣지 않습니다.

## 실행

터미널 1:

```bash
make backend
```

터미널 2:

```bash
make web
```

- 앱: [http://localhost:8081](http://localhost:8081)
- API 상태: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)
- Swagger: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

iOS 개발 빌드:

```bash
cd pawsafe-mobile
npm run build:ios
npm run ios
```

실제 휴대폰에서는 `EXPO_PUBLIC_API_BASE_URL`을 개발 PC의 LAN IP로 바꾸고
휴대폰과 PC를 같은 네트워크에 연결합니다.

## 사용자 흐름

1. 백엔드가 제공하는 지원 주소를 검색하거나 음성으로 입력
2. 빠른 산책 또는 시원한 산책 선택
3. 빠른 산책은 동일 GMM 그래프의 순수 최단경로만 표시
4. 시원한 산책은 최단경로와 Heat Cost 최적 경로, 거리·점수를 비교
5. 선택한 경로를 실제 GPS 지도에 표시
6. 앱을 화면에 켠 상태에서 좌·우회전, 경로 이탈·복귀, 도착을 음성·진동으로 안내

가상 GPS, 임시 결과 버튼, 하드코딩 경로 응답, 시연 전용 음성 파일은 최종
제출본에 포함하지 않습니다.

## 검증

```bash
make test
make build-web
```

개별 검사:

```bash
cd backend && PYTHONPATH=. .venv/bin/python -m pytest -q
cd pawsafe-mobile && npm run test:all
```

모델 원본·해시·해석은
[`backend/data/models/ongil_gmm_0815_1600/README.md`](backend/data/models/ongil_gmm_0815_1600/README.md),
API 구조는 [`backend/docs/API_CONTRACT.md`](backend/docs/API_CONTRACT.md),
데이터 출처는 [`DATA_ATTRIBUTION.md`](DATA_ATTRIBUTION.md)를 참고합니다.
