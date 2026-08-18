# PawSafe Mobile

Expo Router 기반의 PawSafe 모바일·웹 앱입니다. 앱 화면은 이 디렉터리에 있고,
경로 분석·기상·Heat Cost 데이터는 루트의 FastAPI 백엔드가 제공합니다.

## 실행

프로젝트 루트에서 처음 한 번:

```bash
make setup
```

백엔드와 웹 화면을 각각 실행합니다.

```bash
make backend
make web
```

백엔드 없이 화면 흐름만 확인하려면:

```bash
make web-mock
```

테스트:

```bash
cd pawsafe-mobile
npm run test:all
```

## 전경 음성 경로 안내

빠른 산책과 시원한 산책 결과의 `산책길 음성 안내`에서 선택한 경로 좌표를
기준으로 다음 기능을 제공합니다.

- 앱을 화면에 켜 둔 동안 GPS 위치 추적
- 좌회전·우회전·도착 지점 자동 계산과 한국어 음성 안내
- 회전 방향 진동, 경로 이탈·복귀·도착 알림
- 현재 위치 지도 추적, 남은 거리·시간 갱신
- 음성 끄기·다시 듣기·일시정지

이 기능은 `expo-location`, `expo-speech`, `expo-haptics`와 기존 경로 좌표만
사용하므로 별도 유료 길안내 API가 필요하지 않습니다. 앱이 백그라운드나 잠금
상태일 때 계속 안내하는 기능은 현재 범위에서 제외했습니다. iPhone에서는 음성
안내 테스트 전에 무음 모드를 해제해야 합니다.

`pawsafe-mobile/.env.example`은 공개 가능한 앱 설정만 포함합니다. KMA·ASOS·
Kakao 비밀키는 반드시 `backend/.env`에만 둡니다. 물리 기기에서 API를 호출할
때는 `EXPO_PUBLIC_API_BASE_URL`을 개발 PC의 LAN IP로 바꿉니다.

전체 구조와 협업 방법은 루트 [`README.md`](../README.md), API 상세는
[`backend/docs/API_CONTRACT.md`](../backend/docs/API_CONTRACT.md)를 참고합니다.
