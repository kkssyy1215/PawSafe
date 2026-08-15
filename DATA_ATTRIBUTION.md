# PawSafe 데이터 출처 및 이용조건

이 문서는 PawSafe가 사용하는 외부 데이터의 출처와 표시·재배포 조건을 관리합니다.
법률 자문을 대체하지 않으며, 새로운 원본 데이터를 추가할 때 반드시 원천 페이지와
라이선스를 이 문서에 기록해야 합니다.

## OpenStreetMap 보행로

- 출처: © OpenStreetMap contributors
- 라이선스: Open Data Commons Open Database License 1.0 (ODbL)
- 안내: https://www.openstreetmap.org/copyright
- 적용: 보행로 원본, `walk_graph.gpkg`, 경로 좌표 및 이를 기반으로 한 지도 시각화
- 표시: 앱 지도와 경로 이미지에서 `© OpenStreetMap contributors · ODbL`을 보이게 표시
- 재배포: OSM 파생 데이터베이스를 외부 제공할 경우 ODbL의 고지와 동일조건 공유 의무를 검토

## 기상청 초단기실황

- 제공기관: 기상청
- 서비스: 기상청 단기예보 조회서비스
- 원천 페이지: https://www.data.go.kr/data/15084084/openapi.do
- 이용조건: 공공저작물 출처표시(공공누리 제1유형), 제3자 권리 표시 확인
- 적용: 기온, 습도, 풍속, 강수량
- 표시: `기상청 공공데이터(가공)`

## 기상청 ASOS 시간자료

- 제공기관: 기상청
- 서비스: 지상(종관, ASOS) 시간자료 조회서비스
- 원천 페이지: https://www.data.go.kr/data/15057210/openapi.do
- 이용조건: 공공저작물 출처표시(공공누리 제1유형)
- 적용: 서울 108 지점 시간별 일사량 및 기상자료
- 표시: `기상청 공공데이터(가공)`
- 주의: 현재 서비스 계산은 ASOS 전일 동일 시간 자료를 참조하며 원 관측값 자체가 아닌
  PawSafe 상대 Heat Cost로 가공됩니다.

## 서울시·국토 관련 원본

다음 파일은 원천 페이지 식별자와 개별 이용조건을 확인하기 전까지 외부에 원본 또는
복제본을 배포하지 않습니다.

- `buildings_seoul.zip`
- `building_register.csv`
- `street_trees.csv`
- `SWM_WKAR_AS.csv`
- `SWM_BASIC_CODE.csv`

원본 파일은 Git에서 제외하며, 발표·배포 전 담당자가 각 다운로드 페이지 URL,
제공기관, 라이선스 유형, 가공 여부를 이 문서에 추가해야 합니다.

## v2 포장재·흡수율 보완

`data/live/edge_time_features_absorptivity_updated_v2.csv`는 OSM 보행 Edge와
기상 피처를 바탕으로 팀이 포장재 분류와 흡수율을 보완한 가공 스냅샷입니다.

- OSM tag와 SWM 코드북을 포장재 분류의 기본 근거로 사용
- Street View는 팀의 수동 교차확인에만 사용하고 이미지·캡처·타일·embedding은
  저장소에 포함하거나 재배포하지 않음
- 포장재별 흡수율은 실측 상수가 아니라 문헌 범위를 참고한 프로젝트 가설값
- `unknown=0.731834`는 특정 재질 추정이 아닌 결측 대체 대표값
- IoT 자료는 흡수율 산출에 사용하지 않고 재질별 온도 방향성 점검에만 사용

외부 발표에서 흡수율을 과학적으로 검증된 상수라고 표현하지 않습니다. 문헌의
정확한 서지정보와 SWM 원천 페이지가 확정되기 전에는 원본·코드북을 재배포하지
않고, 현재 파일은 상대 Heat Cost 계산용 가공 자료로만 사용합니다.

## 저장소 코드와 제3자 자료

저장소 자체 코드의 이용조건은 [`LICENSE.md`](LICENSE.md)를 따릅니다. OSM,
기상청 등 제3자 자료와 파생 데이터에는 코드 이용조건이 적용되지 않으며 각
원천 라이선스와 표시 의무가 우선합니다.

## 발표·스크린샷 표기

지도나 경로 화면을 발표자료·영상·이미지로 내보낼 때도 아래 문구를 화면 또는 이미지
인접 영역에 유지합니다.

> 보행로 © OpenStreetMap contributors (ODbL) · 기상자료 기상청 공공데이터(가공)
