# 온:길 Mobile 구현 상태

기준일: 2026-08-19

## 현재 동작

- React Native, TypeScript strict, Expo SDK 54, Expo Router
- 주소 입력 → 경로 분석 → 결과 비교 → 산책길 안내 흐름
- FastAPI 지원 장소 검색과 첫 일치 주소 음성 자동 선택
- `fast`는 일반 최단경로만, `cool`은 최단경로와 온:길 추천 비교
- 실제 API의 GeoJSON 경로와 Edge Heat Cost `0·1·2` 지도 표시
- 경로별 1~100 열위험 점수·상태·80점 이상 경고 표시
- 웹 OpenStreetMap 타일 이동·확대와 네이티브 지도 표시
- 실제 전경 GPS를 이용한 현재 위치·남은 거리·시간 갱신
- 좌·우회전, 경로 이탈·복귀, 도착 한국어 음성·진동 안내
- 경로 안내 화면 우측 상단 음성 토글
- timeout, 취소, 네트워크, HTTP·Zod 계약 오류 처리

백엔드 주소는 `.env`의 다음 값 하나로 연결합니다.

```text
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

## 최종 제출 상태

가상 GPS, 자동 이동 타이머, 로컬 Mock Provider, 하드코딩 경로 결과, 임시 결과
버튼, 시연 전용 오디오 파일은 포함하지 않습니다. 위치 안내는 실제 기기 권한과
GPS가 있어야 동작합니다.

## 남은 배포 작업

- 운영 백엔드 HTTPS URL과 CORS 연결
- EAS project·서명 credential 설정
- iOS·Android 물리 기기의 지도·위치·마이크·음성 안내 QA
- 접근성 사용자 테스트와 경로 이탈 임계값 조정
- 백그라운드·잠금 화면 내비게이션은 현재 범위에 포함하지 않음
