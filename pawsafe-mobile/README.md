# PawSafe Mobile

PawSafe는 출발지, 목적지, 산책 시작 시각과 비교 기준을 입력하면 일반 경로와 상대 Heat Cost를 낮춘 PawSafe 경로를 비교하는 React Native 앱입니다. 현재 결과는 실제 모델 출력이 아니라 사용자 흐름 검증용 deterministic MVP fixture입니다.

Heat Cost는 절대 노면온도나 안전 판정이 아닙니다. 같은 조건에서 경로 간 상대 열노출을 비교하는 지표입니다.

이번 작업공간에는 참고할 기존 PawSafe React/Vite 소스나 전용 자산이 없었습니다. 따라서 화면 정보 구조, 색상, 금지 문구와 사용자 흐름은 제공된 최종 명세를 기준으로 새 모바일 앱에 구현했고 기존 create-expo-app 코드를 재사용하지 않았습니다.

## 기술 선택

- React Native 0.81 + TypeScript strict mode
- Expo SDK 54 + Expo Router 6
- `react-native-maps`, `expo-location`
- Zod 런타임 계약 검증
- Jest Expo, React Native Testing Library, Maestro

Expo SDK 54를 고정하고 Expo Go를 기본 개발 경로로 선택했습니다. Expo Go에 포함된 `react-native-maps`와 foreground `expo-location`으로 네이티브 빌드 대기 없이 핵심 흐름을 검증할 수 있기 때문입니다. `expo-maps`는 SDK 54에서 alpha이며 Expo Go에서 실행되지 않으므로 이번 MVP에서는 사용하지 않습니다. 향후 Kakao 네이티브 SDK처럼 커스텀 네이티브 모듈이 필요하면 이미 준비된 EAS development build로 전환할 수 있습니다.

## 현재 구현 범위

- Expo Router Stack: 입력 → 분석 → 구간 → 비교 → 실시간 산책 도우미 → 복구 가능한 오류
- 검색 결과를 통한 출발지·목적지 확정
- 사용자가 눌렀을 때만 앱 사용 중 현재 위치 권한 요청
- 날짜·시간 및 fast/cool 모드 선택
- deterministic Mock Provider와 FastAPI HTTP Provider 전환
- 일반/PawSafe 경로, 마커, 구간 Polyline, 지도 텍스트 요약
- 목업 기반 분석 진행 지도와 실시간 노면 열환경·우회 알림 화면
- API timeout, 취소, offline, HTTP/계약 오류 변환
- 데모/실측 검증 전 상태 표시
- Android Preview APK와 development build용 EAS 프로필

모델 학습은 앱 범위가 아닙니다. K-means/GMM, 실제 Edge × Time 데이터, 실측 검증과 Heat Cost 산출은 데이터분석팀이 담당합니다. 앱은 그 결과를 제공하는 FastAPI 계약만 소비합니다.

## 설치와 기본 실행

전체 개발·테스트 도구를 위해 Node.js 24 LTS를 권장합니다(이번 검증은 Node 24.14에서 수행). Expo SDK 54 자체 최소 버전은 Node 20.19이지만 현재 React Native Testing Library 14는 Node 22.13 또는 24 이상을 요구합니다. 저장소의 Expo SDK 54 버전과 맞추기 위해 네이티브 패키지는 임의 버전 대신 `npx expo install`로 관리합니다.

```bash
cd pawsafe-mobile
npm install
cp .env.example .env
npm start
```

Expo Go 앱으로 터미널의 QR 코드를 스캔합니다. LAN 연결이 막힌 환경에서는 다음을 사용합니다.

```bash
npx expo start --go --tunnel
```

개발 서버 캐시를 초기화해야 하면 `npx expo start --go --clear`를 실행합니다. `expo-dev-client`가 설치되어 있어 Expo CLI의 무옵션 기본값은 development build가 될 수 있으므로, Expo Go에는 `npm start` 또는 `--go`를 사용합니다.

### Android Emulator

Android Studio에서 emulator를 먼저 실행한 뒤 다음 중 하나를 사용합니다.

```bash
npm run android
# 또는 npx expo start --go 후 a
```

현재 위치를 시험하려면 emulator의 Settings에서 위치 서비스를 켜고 Extended controls에서 테스트 좌표를 지정합니다.

### iOS Simulator

macOS와 Xcode가 필요합니다.

```bash
npm run ios
# 또는 npx expo start --go 후 i
```

Simulator의 Features → Location에서 `None`이 아닌 위치를 선택합니다.

### 물리 기기와 FastAPI

휴대폰의 `localhost`는 개발 PC가 아니라 휴대폰 자신입니다. FastAPI를 모든 인터페이스에 bind하고 PC의 LAN IP, HTTPS 개발 서버 또는 HTTPS 터널을 사용합니다.

```bash
cd ../backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

```env
EXPO_PUBLIC_ANALYSIS_MODE=api
EXPO_PUBLIC_PLACE_SEARCH_MODE=api
EXPO_PUBLIC_API_BASE_URL=http://192.168.0.10:8000
```

휴대폰과 PC가 같은 Wi-Fi인지, 방화벽이 8000 포트를 허용하는지 확인합니다. 발표 환경에는 HTTPS API를 권장합니다. 변경 후 Expo 개발 서버를 다시 시작합니다.

## 환경 변수와 보안

`.env.example`의 지원 값은 다음과 같습니다.

| 변수 | 값 | 역할 |
|---|---|---|
| `EXPO_PUBLIC_ANALYSIS_MODE` | `mock`, `api` | 경로 분석 Provider |
| `EXPO_PUBLIC_PLACE_SEARCH_MODE` | `mock`, `api` | 장소 검색 Provider |
| `EXPO_PUBLIC_MAP_MODE` | `mock`, `native` | 예시 지도 또는 네이티브 지도 |
| `EXPO_PUBLIC_API_BASE_URL` | URL | FastAPI base URL |
| `EXPO_PUBLIC_SHOW_DEMO_CONTROLS` | `true`, `false` | 개발용 시나리오 표시 |

`EXPO_PUBLIC_` 값은 앱 번들에서 누구나 읽을 수 있습니다. Kakao REST API 키, FastAPI 비밀키, Google Maps 키를 이 변수에 넣지 마세요. Kakao 키는 백엔드에만 둡니다.

Standalone Android 지도용 키가 필요한 경우 `GOOGLE_MAPS_ANDROID_API_KEY`라는 비공개 local/EAS build 환경 값으로 공급합니다. `app.config.ts`가 빌드 시 네이티브 설정으로 전달하며 JavaScript 공개 환경 변수로 노출하지 않습니다. Android package는 `com.pawsafe.mobile`이므로 키를 이 package와 빌드 인증서 SHA-1로 제한해야 합니다. Expo Go 지도 시험에는 별도 설정이 필요 없습니다.

## Mock 모드와 API 모드

기본 `.env.example`은 Mock 분석과 장소 검색을 사용합니다. 고정 fixture이므로 같은 입력은 같은 결과를 반환합니다. 성공 결과에는 다음 상태가 포함됩니다.

```text
is_demo=true
analysis_source=mock_fixture
validation_status=not_validated
```

Mock에는 cool improvement, fast near-shortest, same route, no improvement, out of coverage, no route, timeout 시나리오가 있습니다. 실제 시각·실측 안전 결과로 표현하지 않습니다.

API 모드는 다음 endpoint를 사용합니다.

- `GET /v1/places/search?q=...`
- `POST /v1/places/reverse-geocode`
- `POST /v1/route-analyses`

응답은 Zod로 검증하며 GeoJSON 좌표는 `[lng, lat]` 순서입니다. `src/config/env.ts`만 공개 환경 변수를 읽고 컴포넌트는 검증된 설정을 사용합니다.

## 위치 권한

앱 시작 시 위치 권한을 요청하지 않습니다. 사용자가 “현재 위치 사용”을 누르면 foreground/When In Use 권한만 요청하고 좌표를 출발지 선택에 일시적으로 사용합니다. 거부, 다시 묻지 않음, 위치 서비스 비활성 상태에는 수동 검색 안내를 표시합니다.

백그라운드 위치, 항상 허용, 카메라, 연락처, 사진, 마이크와 Bluetooth 권한은 요청하지 않습니다. 정확한 출발지·목적지는 영구 저장하지 않습니다.

## 지도 모드

```env
EXPO_PUBLIC_MAP_MODE=native
```

`native`는 `react-native-maps`의 `MapView`, `Marker`, `Polyline`을 사용합니다. 경로 좌표가 비어 있어도 crash하지 않으며 지도 아래에 스크린리더가 읽을 수 있는 텍스트 요약과 범례가 있습니다.

```env
EXPO_PUBLIC_MAP_MODE=mock
```

`mock`은 지도 SDK나 키와 무관하게 데모 레이아웃을 확인하는 fallback입니다.

## EAS 빌드

EAS 계정 로그인과 프로젝트 연결/서명 설정 후 실행합니다.

```bash
npx eas-cli@latest login
npx eas-cli@latest build:configure
eas build --platform android --profile preview
eas build --platform android --profile development
```

- `preview`: 발표용으로 기기에 직접 설치할 수 있는 internal APK
- `development`: `expo-dev-client`가 포함된 internal development build
- `production`: 스토어 배포용 기본 프로필

이 저장소에는 설정만 준비되어 있습니다. 이번 구현 과정에서 EAS cloud build나 APK 생성은 실제로 실행하지 않았습니다. 계정, EAS project ID, Android signing credential과 standalone 지도 키를 확인한 뒤 발표 전에 APK를 생성·설치해 두어야 합니다.

development build를 설치한 뒤 전용 Metro 서버를 열 때는 `npm run start:dev-client`를 사용합니다.

## 테스트

```bash
npm run typecheck
npm run lint
npm test
npm run test:coverage
```

Jest 테스트는 formatter/null 처리, GeoJSON 변환, 입력 검증, 오류 카피, 결과 headline, same/no-improvement, demo 상태, deterministic provider 오류·취소와 reducer 전체 흐름을 포함합니다.

현재 저장소 검증 결과는 Expo Go 모드 Metro 시작, TypeScript와 lint 통과, Jest 12 suites/33 tests 통과, 웹 정적 export 8개 라우트 성공, Android Hermes Metro export 성공(1,557 modules)입니다. 이 export는 네이티브 APK를 만드는 EAS Build와 다릅니다.

Maestro가 설치되어 있고 `com.pawsafe.mobile` APK/development build가 실행 가능한 Android 기기에 설치되어 있으면 다음을 실행합니다.

```bash
maestro test tests/maestro/walk-flow.yaml
```

Maestro 흐름은 앱 실행 → 출발/목적지 선택 → 시간 picker → cool 모드 → 분석 → 구간 선택 → 비교 → 재검색을 다룹니다. 테스트 실행 전 Mock 모드로 빌드해야 합니다.

## 데이터분석팀 결과 연결

1. 데이터팀과 `edge_id`, graph/data version, 좌표계, timezone, nullable 값과 검증 상태를 합의합니다.
2. 데이터팀은 실제 Edge별 Heat Cost와 보행 그래프를 백엔드 팀에 전달합니다.
3. 백엔드는 Heat Cost를 그래프에 결합하고 FastAPI 응답 계약을 유지합니다.
4. 앱 `.env`를 `analysis=api`, `placeSearch=api`와 배포 API URL로 변경합니다.
5. `/health`, 장소 검색, reverse geocode와 route analysis 계약을 확인합니다.
6. 실측 검증 전 결과는 계속 명시적으로 표시하고 누락값을 0이나 임의 신뢰도로 채우지 않습니다.

## 아직 구현·검증되지 않은 범위

- 실제 Edge × Time 데이터와 실제 Heat Cost
- K-means/GMM 학습과 군집 평가
- 실측 표면온도 검증
- 실제 운영 보행 그래프와 검증된 가중치
- 운영 Kakao 장소 검색/외부 분석 credential
- EAS cloud build, 실제 APK 설치와 물리 기기 QA
- 앱스토어 배포와 운영 모니터링
- `npm audit --omit=dev`가 보고한 Expo/Metro 전이 의존성 26건(13 high, 13 moderate)의 점검·해소. 자동 fix는 Expo 57 강제 업그레이드를 요구해 SDK 54 고정 범위를 벗어나므로 적용하지 않았습니다.

상세 상태는 [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)에 기록합니다.
