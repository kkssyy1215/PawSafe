# PawSafe 기여 가이드

PawSafe의 협업 기준 브랜치는 `main`입니다. 기능·문서·데이터 export 변경은
작업 브랜치와 Pull Request를 통해 반영합니다.

## 개발 시작

```bash
git clone https://github.com/kkssyy1215/PawSafe.git
cd PawSafe
make setup
git switch -c feature/<작업명>
```

로컬 API 키는 `backend/.env`, 공개 가능한 앱 설정은
`pawsafe-mobile/.env`에 둡니다. 두 파일은 Git에 커밋하지 않습니다.

## 변경 위치

- 앱 화면·상태·API 호출: `pawsafe-mobile/`
- FastAPI·경로 분석·기상 Provider: `backend/`
- Heat Cost 계산·데이터 변환: `src/pawsafe/`
- 공개 가능한 실행용 스냅샷: `backend/data/exports/`
- 방법론·계약·출처: `docs/`, `backend/docs/`, `DATA_ATTRIBUTION.md`

동일 기능을 임시 복사본이나 별도 프로젝트 폴더에 구현하지 않습니다. 실행 중인
백엔드는 `backend/data/exports/`만 읽고, 파이프라인이 이 위치의 export를
갱신하도록 유지합니다.

## 검증과 Pull Request

```bash
make test
make build-web
```

Pull Request에는 변경 이유, 사용자 영향, 검증 명령과 데이터 계약 변경 여부를
적습니다. API 응답 또는 환경변수가 바뀌면 관련 `.env.example`과 문서도 함께
수정합니다.

## 데이터와 보안

- API 키, 개인 위치, `.env`, 원본 IoT 문서와 재배포 권한이 불명확한 자료를
  커밋하지 않습니다.
- 새 외부 데이터를 추가할 때 원천 URL·제공기관·라이선스·가공 여부를
  `DATA_ATTRIBUTION.md`에 기록합니다.
- Heat Cost는 상대 비교 지표이며 실측 노면온도나 절대 안전 판정으로 표현하지
  않습니다.
- 큰 binary 또는 CSV를 반복 갱신하기 전에는 Release, Git LFS 또는 별도 object
  storage 사용 여부를 먼저 합의합니다.
- Pull Request를 제출하는 기여자는 해당 변경을 제출할 권한이 있고, 저장소의
  `LICENSE.md`와 제3자 데이터 이용조건을 준수해야 합니다.
