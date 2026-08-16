# 실시간 모델 연동 경계

## 현재 상태

AWS(자동기상관측장비)·ASOS 자료로 요청 시점의 Edge Heat Cost를 다시 계산하는
모델 코드는 아직 이 저장소에 연결되지 않았습니다. 현재 `graph` 설정은 공유받은
그래프와 Heat Cost 스냅샷을 사용하므로, 앱 흐름과 경로 비교를 검증하기 위한
임시 대체 동작입니다.

프론트엔드는 기상 API나 모델 파일을 직접 호출하지 않습니다. 다음 요청 하나만
백엔드에 보냅니다.

```http
POST /v1/route-analyses
```

```json
{
  "origin": {"id": "...", "name": "...", "lat": 37.0, "lng": 127.0},
  "destination": {"id": "...", "name": "...", "lat": 37.0, "lng": 127.0},
  "walk_mode": "cool"
}
```

`departure_at`을 생략하면 백엔드가 요청 시점의 한국 표준시를 사용합니다.

## 모델이 맡을 처리

1. 요청 시각의 AWS·ASOS 기상자료 조회
2. 고정 공간 피처와 기상 피처 결합
3. Edge별 Heat Cost 재계산
4. 일반 최단경로와 PawSafe Heat Cost 최소경로 계산
5. 두 경로의 선형 좌표, 거리, 시간, Heat Cost와 비교값 반환

응답은 `RouteAnalysisResponse` 계약을 따라야 합니다. 특히 `shortest`,
`pawsafe`, `comparison`, `heat_segments`를 한 응답에서 반환하면 프론트 수정
없이 로딩·비교·산책길 보기 화면에 반영됩니다.

## 모델을 받았을 때 연결 방법

- 모델이 별도 HTTP API이면 `ANALYSIS_PROVIDER=external`과
  `ANALYSIS_EXTERNAL_URL`을 설정합니다.
- 모델 응답이 현재 계약과 다르면
  `backend/app/providers/analysis/external_analysis.py`에서 한 번 변환합니다.
- 모델을 같은 백엔드 프로세스에 넣는 경우에도 새 Analysis Provider만 추가하고
  라우터와 모바일 계약은 유지합니다.

따라서 모델 구현이 바뀌어도 입력·출력 계약만 유지하면 프론트 화면과 사용자
흐름을 다시 만들 필요가 없습니다.
