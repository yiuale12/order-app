# COZY 백엔드

Node.js와 Express를 사용하는 REST API 서버입니다. 프런트엔드(`UI/`)와 별도로 실행합니다.

## 시작하기

```bash
npm install
```

`.env` 파일에서 포트, 프런트엔드 주소, PostgreSQL 연결 정보를 설정합니다. `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`가 모두 설정되어 있으면 개별 설정을 사용하고, 그렇지 않으면 `DATABASE_URL`을 사용합니다.

```bash
npm run dev
```

개발 서버는 기본적으로 `http://localhost:3000`에서 실행됩니다. 서버 시작 전에 PostgreSQL 연결을 확인하며, 연결에 실패하면 오류 코드와 함께 종료됩니다. `GET /api/health`는 서버와 데이터베이스 연결 상태를 확인합니다. 파일 변경 시 Node.js watch 모드가 서버를 다시 시작합니다.

운영 방식으로 실행하려면 다음 명령을 사용합니다.

```bash
npm start
```

PostgreSQL 드라이버(`pg`)로 연결 풀을 관리합니다. 서버 시작 시 PRD의 메뉴·옵션·주문 테이블을 생성하고, 메뉴가 없는 경우 데모 메뉴와 옵션을 초기 등록합니다. 주문, 재고, 주문 상태 API는 `/api` 경로에서 제공합니다.

## 주요 API

- `GET /api/health`: 서버 및 데이터베이스 연결 확인
- `GET /api/menus`: 메뉴, 옵션, 재고 조회
- `POST /api/orders`: 주문 생성 및 재고 차감
- `GET /api/orders`: 관리자 주문 목록 조회
- `GET /api/orders/:orderId`: 주문 상세 조회
- `PATCH /api/orders/:orderId/status`: 주문 상태를 다음 단계로 변경
- `PATCH /api/menus/:menuId/stock`: 메뉴 재고 증감

프런트엔드와 함께 실행할 때는 이 서버를 먼저 실행한 후 `UI/`에서 Vite 개발 서버를 실행합니다. Vite의 `/api` 요청은 이 서버로 프록시됩니다.
