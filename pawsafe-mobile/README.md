# 온:길 Mobile

Expo Router 기반 모바일·웹 앱입니다. 경로·점수·지원 장소는 FastAPI 백엔드에서
받고, 앱에는 모델 결과나 가상 위치를 하드코딩하지 않습니다.

## 실행

프로젝트 루트에서:

```bash
make setup
make backend
make web
```

모바일 폴더에서 직접 실행할 수도 있습니다.

```bash
npm install
npm run web
npm run ios
```

`pawsafe-mobile/.env`에는 백엔드 주소만 둡니다.

```text
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

실제 휴대폰은 `127.0.0.1` 대신 개발 PC의 LAN IP를 사용합니다. API 키는
앱 번들에 넣지 않고 백엔드에만 보관합니다.

## 접근성 기능

- 출발지·목적지 한국어 음성 입력과 첫 일치 주소 자동 선택
- 선택 경로의 실제 GeoJSON Polyline 표시
- 전경 GPS 위치 추적과 남은 거리·시간 갱신
- 좌·우회전, 경로 이탈·복귀, 도착 한국어 음성 안내
- 회전 방향별 진동
- 경로 안내 화면 우측 상단 음성 안내 토글

음성 인식은 네이티브 개발 빌드가 필요할 수 있습니다.

```bash
npm run build:ios
npm run ios
```

백그라운드·잠금 화면 안내는 현재 범위에 포함하지 않습니다. GPS 안내는 보조
기능이므로 횡단보도, 차량, 턱과 장애물은 사용자가 직접 확인해야 합니다.

## 검사

```bash
npm run test:all
```

최종 제출본에는 가상 GPS, 임시 결과 보기, 로컬 분석 목업, 시연 전용 음성 파일이
포함되지 않습니다.
