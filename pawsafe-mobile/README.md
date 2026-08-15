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

`pawsafe-mobile/.env.example`은 공개 가능한 앱 설정만 포함합니다. KMA·ASOS·
Kakao 비밀키는 반드시 `backend/.env`에만 둡니다. 물리 기기에서 API를 호출할
때는 `EXPO_PUBLIC_API_BASE_URL`을 개발 PC의 LAN IP로 바꿉니다.

전체 구조와 협업 방법은 루트 [`README.md`](../README.md), API 상세는
[`backend/docs/API_CONTRACT.md`](../backend/docs/API_CONTRACT.md)를 참고합니다.
