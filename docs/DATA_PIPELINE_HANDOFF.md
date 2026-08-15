# 데이터분석·모델구현팀 연동 안내

이 저장소에는 팀이 작성한 Python 모델 **소스 코드만** 연동되어 있습니다.
원본 지리 데이터, 기상 파일, 포장재 파일, IoT 엑셀, 전처리 결과, 모델 가중치는
공개 저장소에 넣지 않습니다.

## 포함된 코드

- `src/pawsafe/preprocess.py`: 좌표계 통일, 보행로·건물·가로수·기상·포장재 입력 처리
- `src/pawsafe/shadow.py`: 태양 위치와 건물·가로수 그림자 비율 계산
- `src/pawsafe/features.py`: 일사·그늘·열저장 상대 피처 생성
- `src/pawsafe/clustering.py`: K-means/GMM 비교와 상대 Heat Cost 산출
- `src/pawsafe/routing.py`: Edge 그래프와 Fast/Cool 경로 계산
- `src/pawsafe/pipeline.py`: 위 단계를 순서대로 실행하고 앱 전달용 결과를 생성

## 로컬 실행 원칙

1. 승인된 원본 입력을 각자 로컬의 `data/raw/`에 둡니다. 이 폴더의 파일은 Git에
   올라가지 않습니다.
2. `config.json`의 파일 경로와 좌표계 설정을 확인합니다.
3. `python scripts/00_실행환경_확인.py`로 필수 입력만 점검합니다.
4. 분석 실행은 `python scripts/01_전체_전처리_군집화_실행.py`를 사용합니다.
5. 생성되는 `data/processed/`, `outputs/`와 모델 파일은 로컬 검토용이며 공개
   커밋 대상이 아닙니다.

모델의 Heat Cost는 실제 노면온도(℃)나 절대적인 안전 판정이 아니라, 입력 자료에
대한 상대 열노출 점수입니다. 실제 서비스에서는 백엔드가 버전이 지정된 결과를
읽어 모바일 앱에 전달해야 합니다. Python 모델을 모바일 앱에 직접 번들하지
않습니다.

## 앱·백엔드 연결 계약

현재 모바일 앱은 Fast 모드에서 Kakao 보행 API 경로를 사용하고, Cool 모드는
백엔드의 상대 Heat Cost 결과가 준비되면 연결할 수 있도록 provider 경계를 둡니다.
모델팀이 결과를 전달할 때는 `edge_id`, 좌표, 시각, `heat_cost`, 모델 버전과
검증 상태를 함께 제공해 주세요. 자세한 GeoJSON/JSON 전달 형태는
[`docs/NATIVE_APP_HANDOFF.md`](NATIVE_APP_HANDOFF.md)를 참고합니다.
