# COZY 백엔드

Node.js와 Express를 사용하는 REST API 서버입니다. 프런트엔드(`UI/`)와 별도로 실행합니다.

## 시작하기

```bash
npm install
```

`.env` 파일에서 포트, 프런트엔드 주소, PostgreSQL 연결 정보를 설정합니다. `DATABASE_URL`이 설정되어 있으면 우선 사용하고, 없으면 `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`를 사용합니다.

```bash
npm run dev
```

개발 서버는 기본적으로 `http://localhost:3000`에서 실행됩니다. 서버 시작 전에 PostgreSQL 연결을 확인하며, 연결에 실패하면 오류 코드와 함께 종료됩니다. `GET /api/health`는 서버와 데이터베이스 연결 상태를 확인합니다. 파일 변경 시 Node.js watch 모드가 서버를 다시 시작합니다.

운영 방식으로 실행하려면 다음 명령을 사용합니다.

```bash
npm start
```

PostgreSQL 드라이버(`pg`)로 연결 풀을 관리합니다. 데이터베이스 및 API 기능은 후속 백엔드 구현에서 추가합니다.
