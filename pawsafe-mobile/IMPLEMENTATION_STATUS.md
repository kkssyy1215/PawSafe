# PawSafe Mobile implementation status

기준일: 2026-08-15

## 현재 동작

- React Native, TypeScript strict, Expo SDK 54, Expo Router
- 입력 → 분석 → 구간 → 비교 → 실시간 산책 도우미 → 오류 화면
- `fast`와 `cool` 산책 모드
- FastAPI 장소 검색·역지오코딩·경로 분석 연결
- Mock Provider를 이용한 백엔드 없는 UI 테스트
- 출발지 저장, 현재 위치, 주변 산책 장소 추천
- Native Map과 웹·키 없는 Mock Map
- 경로·Heat Segment·지도 출처·상대 지표 안내
- timeout, 취소, offline, HTTP·Zod 계약 오류 처리
- Jest 17 suites·46 tests, TypeScript, ESLint 통과
- Expo web 정적 경로 8개 export 통과

공유 `.env.example`은 로컬 FastAPI를 호출합니다. 실제 앱은 백엔드의 Graph
Provider 결과를 사용하며 Mock 모드는 발표 리허설과 오류 흐름 재현용입니다.

## 남은 배포 작업

- 운영 백엔드 URL과 CORS 연결
- EAS project·서명 credential 설정
- Android Preview APK 생성·설치
- iOS·Android 물리 기기 지도·위치 권한 QA
- Maestro 전체 흐름 E2E 실행

Heat Cost는 상대 비교 지표이며 실측 노면온도나 절대 안전 판정으로 표시하지
않습니다.
