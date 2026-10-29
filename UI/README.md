# COZY 프런트엔드

Vite와 React를 사용하는 JavaScript 프런트엔드 앱입니다. 백엔드와 분리된 프로젝트이며, 화면 코드는 `src/`에서 개발합니다.

주문 메뉴, 주문 접수, 재고 및 주문 상태는 별도 `server/` Express API와 PostgreSQL을 통해 저장하고 조회합니다. Vite 개발 서버의 `/api` 프록시는 `http://localhost:3000`으로 연결됩니다.

메뉴 이미지는 외부 연결 없이 사용할 수 있도록 `public/images/`에 포함한 로컬 SVG 일러스트입니다.

## 시작하기

```bash
npm install
npm run dev
```

Vite 개발 서버가 안내하는 로컬 주소에서 앱을 확인할 수 있습니다. 파일을 저장하면 HMR(Hot Module Replacement)로 변경 사항이 반영됩니다.

백엔드와 PostgreSQL을 먼저 실행해야 메뉴와 관리자 데이터를 불러올 수 있습니다. 백엔드 실행 방법은 `../server/README.md`를 참고하세요.

## 명령어

```bash
npm run dev      # 개발 서버 실행
npm run build    # 프로덕션 빌드
npm run preview  # 프로덕션 빌드 미리보기
npm run lint     # Oxlint 검사
```
