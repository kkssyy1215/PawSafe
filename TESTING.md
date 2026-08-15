# PawSafe 테스트

## 전체 검사

프로젝트 루트에서 실행합니다.

```bash
make test
```

검사 범위:

- 모바일 Jest 17 suites·46 tests
- TypeScript strict typecheck와 ESLint
- 백엔드 pytest 51 tests, Ruff, strict mypy
- 데이터 파이프라인 pytest

웹 정적 빌드까지 확인하려면 다음을 실행합니다.

```bash
make build-web
```

## 화면 확인

실제 API 연결:

```bash
make backend
make web
```

백엔드 없이 Mock 화면만 확인:

```bash
make web-mock
```

GitHub Pull Request와 `main` push에서도 `.github/workflows/ci.yml`이 같은
정적 검사와 Expo 웹 export를 수행합니다.
