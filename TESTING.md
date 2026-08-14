# PawSafe 파일 기반 테스트

프로젝트 루트의 파일과 터미널만 사용해 전체 검사를 실행합니다.

## 전체 검사

프로젝트 루트에서 실행합니다.

```bash
./scripts/test-all.sh
```

이 스크립트는 다음을 순서대로 실행합니다.

- 모바일 Jest 테스트
- 모바일 TypeScript 검사
- 모바일 ESLint
- 백엔드 pytest
- 백엔드 Ruff 검사/포맷 검사
- 백엔드 strict mypy

## 모바일만 검사

```bash
cd pawsafe-mobile
npm test
npm run typecheck
npm run lint
```

## 백엔드만 검사

```bash
cd backend
.venv/bin/python -m pytest -q
.venv/bin/ruff check app tests
.venv/bin/ruff format --check app tests
.venv/bin/mypy app
```

## 실제 앱 화면 확인

Mock 모드로 앱을 직접 실행합니다.

```bash
cd pawsafe-mobile
npm start
```

Expo Go로 QR 코드를 스캔한 뒤 `우리집` → `망원한강공원`을 선택하고 분석 흐름을 확인합니다.
