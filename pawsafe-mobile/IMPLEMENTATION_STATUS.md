# PawSafe Mobile 구현 상태

기준일: 2026-08-12

## 구현 완료

- [x] React Native + TypeScript strict + Expo SDK 54 프로젝트
- [x] Expo Router Stack과 입력/분석/구간/비교/실시간 산책 도우미/오류 화면
- [x] Safe Area, Android edge-to-edge, 접근성 레이블·상태·텍스트 지도 요약
- [x] 장소명·주소 직접 검색, 출발지 기반 주변 산책로·공원 추천, 동일 위치 검증
- [x] 고정 좌표 장소·현재 위치·주변 추천 기본값
- [x] Kakao 도보 API 최단 경로 Provider와 MVP Heat Cost fixture 조합
- [x] 자주 쓰는 출발지를 `우리집`·`회사`처럼 이름 붙여 기기에 저장·재선택·삭제
- [x] mock 현재 위치 기본값과 선택적 foreground-only 기기 위치 요청
- [x] 날짜·시간 및 fast/cool 선택
- [x] deterministic Mock 장소/분석 Provider
- [x] FastAPI 장소 검색/reverse geocode/route analysis Provider
- [x] 데이터팀 송파 pipeline Graph 모드용 edge-only GPKG/시간별 Heat Cost 계약 연결(비공개 서버 경로)
- [x] timeout, AbortSignal 취소, offline, JSON/content-type, HTTP와 Zod 계약 오류 처리
- [x] `react-native-maps` Native Map과 key-free Mock Map
- [x] 일반 최단 경로와 선택 모드 경로 Polyline: cool은 형광 초록, fast는 보라색
- [x] 송파 pipeline 목업 출발지 `(37.50167, 127.15485)`·도착지 `(37.48804, 127.15297)` 고정값
- [x] same-route, no-improvement, out-of-coverage, no-route, timeout 데모 처리
- [x] MVP 예시·상대 Heat Cost·실측 검증 전 표시
- [x] PawSafe icon, adaptive icon, splash와 favicon 설정
- [x] Expo Go 실행 구성
- [x] EAS development/internal preview APK/production 프로필
- [x] Jest Expo, React Native Testing Library와 Maestro scaffold
- [x] 첨부 목업 기반 분석 진행 지도, 열환경 카드, 우회 알림 UI

## 이번 작업에서 확인한 결과

| 검사 | 결과 |
|---|---|
| `npm start -- --offline --port 8097` | 통과; Metro가 Expo Go 모드로 QR/LAN URL 대기 |
| `npx expo config --type public` | 통과; SDK 54, app identity와 foreground location 설정 해석됨 |
| `npm run typecheck` | 통과 |
| `npm run lint` | 통과 |
| `npm test -- --runInBand` | 17 suites, 45 tests 통과 |
| `npx expo-doctor@latest` | 18/18 checks 통과 |
| Android Metro export | 통과; Hermes bundle, 1,569 modules |
| Web static export | 통과; `/`, `/analyzing`, `/segments`, `/comparison`, `/live` 포함 8 routes |
| EAS cloud build | 미실행 |
| Preview APK 실제 설치 | 미실행 |
| Maestro 물리/emulator E2E | scaffold 작성, 미실행 |

EAS는 계정 로그인, project 연결, signing credential과 standalone Android 지도 키가 필요한 외부 빌드이므로 설정만 작성했습니다. APK가 생성되었다고 간주하지 않습니다.

## 기존 목업 참고 범위

작업공간에는 참고할 PawSafe React/Vite 프로젝트 소스나 기존 브랜드 자산이 없었습니다. 제공된 최종 명세의 네 단계 흐름, 정보 위계, 아이보리/딥그린/오렌지 색상 방향, 데모 고지와 금지 문구를 기준으로 새 Expo 앱을 구성했습니다.

## Expo Go와 EAS 선택

`react-native-maps`, Expo Router, foreground `expo-location`, NetInfo와 datetime picker는 현재 SDK 54/Expo Go 중심 흐름에 맞춰 고정했습니다. 따라서 해커톤 개발과 시연 리허설은 Expo Go로 빠르게 반복할 수 있습니다. SDK 54의 `expo-maps`는 alpha이고 Expo Go에서 제공되지 않으므로 사용하지 않습니다.

EAS development profile에는 `expo-dev-client`가 설치되어 있어 향후 커스텀 네이티브 모듈이 필요할 때 전환할 수 있습니다. Preview profile은 Android `apk`로 설정되어 발표용 직접 설치 백업을 만들 수 있습니다.

## 데모와 실제 구현의 경계

현재 다음 항목은 공개 예시 모드에서 fixture입니다.

- 장소 목록과 서비스 coverage 표시
- 일반 최단 경로와 선택 모드 경로 geometry·통계
- 지도 색상 규칙: cool = 형광 초록(`#35F56A`), fast = 보라(`#8B5CF6`)
- Heat Cost, 그늘 비율, 직사광선 시간과 구간 정보
- fast/cool 결과와 오류 시나리오

공개 `.env.example`의 API 결과는 `is_demo=true`, `analysis_source=kakao_walk+mock_heat_fixture`, `validation_status=not_validated`입니다. 로컬 비공개 pipeline 설정에서는 `analysis_source=graph`, `is_demo=false`, `validation_status=not_validated`로 데이터팀 그래프와 시간별 상대 Heat Cost를 사용합니다. 두 모드 모두 실제 AI 안전 판정, 절대 노면온도 또는 화상 위험으로 표현하지 않습니다.

## 아직 준비되지 않음

- [x] 데이터팀 Edge × Time 데이터셋·Heat Cost export의 로컬 비공개 연결
- [x] 데이터팀 보행 그래프의 로컬 비공개 연결
- [ ] K-means/GMM 모델 승인·모델 버전 운영 계약
- [ ] 실측 표면온도 검증과 validation status
- [ ] 검증된 fast/cool 가중치
- [ ] 운영 Kakao 장소 검색과 credential
- [ ] 운영 분석 API와 배포 URL
- [ ] EAS 계정/project ID/signing credential
- [ ] Android Preview APK 생성·설치·오프라인 발표 리허설
- [ ] iOS/Android 물리 기기 레이아웃·권한 QA
- [ ] Maestro 전체 흐름 실제 실행
- [ ] Expo/Metro 전이 의존성 audit 26건(13 high, 13 moderate) 해소 방안 검토

`npm audit --omit=dev`의 현재 보고는 Expo/Metro 전이 의존성에서 발생합니다. `npm audit fix --force`는 Expo 57로의 강제 업그레이드를 제안해 이 프로젝트의 SDK 54 고정·Expo Go 검증 범위를 깨뜨릴 수 있으므로 적용하지 않았습니다. SDK 54 호환 패치가 제공되는지 추적하고, SDK 업그레이드는 별도 회귀 테스트와 함께 진행해야 합니다.

## 실제 데이터 연결 체크리스트

1. 데이터팀이 보행 그래프, Edge별 시간대 Heat Cost, graph/data version, validation status와 누락값 정책을 백엔드에 전달한다.
2. `edge_id`, `from_node`, `to_node`, 좌표계, GeoJSON `[lng, lat]`, timezone과 단위를 계약한다.
3. 백엔드가 graph/file Provider로 전환하고 앱 계약과 동일한 JSON을 제공한다.
4. 앱은 `EXPO_PUBLIC_ANALYSIS_MODE=api`, `EXPO_PUBLIC_PLACE_SEARCH_MODE=mock`, `EXPO_PUBLIC_LOCATION_MODE=mock`으로 고정 좌표 입력을 사용한다. 현재 pipeline 목업 경로는 출발 `(37.50167, 127.15485)`, 도착 `(37.48804, 127.15297)`이며, 운영 장소·현재 위치가 준비되면 각 모드만 별도로 전환한다.
5. HTTPS staging API에서 timeout, offline, out-of-coverage, no-route, null 필드와 오래된 데이터 오류를 검증한다.
6. Preview APK를 생성해 실제 발표 기기에 미리 설치하고 Mock fallback도 유지한다.

## 보안 확인

- Kakao REST API 키와 FastAPI secret은 모바일 프로젝트에 없음
- Google Maps 키는 `EXPO_PUBLIC_` 변수가 아닌 private build 환경 값만 허용
- background/always location permission 비활성
- 사용자가 저장한 장소만 기기 내부 AsyncStorage에 보관하며 서버로 자동 전송하지 않음
- 서버 내부 오류 메시지를 사용자 UI에 직접 표시하지 않음
