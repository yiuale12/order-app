# COZY 프런트엔드

Vite와 React를 사용하는 JavaScript 프런트엔드 앱입니다. 백엔드와 분리된 프로젝트이며, 화면 코드는 `src/`에서 개발합니다.

현재 주문 화면은 화면 개발을 위한 임의의 커피 메뉴와 프런트엔드 데모 동작을 사용합니다. 주문은 서버에 저장되지 않으며, 백엔드 API 연동은 별도로 필요합니다.

메뉴 이미지는 외부 연결 없이 사용할 수 있도록 `public/images/`에 포함한 로컬 SVG 일러스트입니다.

## 시작하기

```bash
npm install
npm run dev
```

Vite 개발 서버가 안내하는 로컬 주소에서 앱을 확인할 수 있습니다. 파일을 저장하면 HMR(Hot Module Replacement)로 변경 사항이 반영됩니다.

## 명령어

```bash
npm run dev      # 개발 서버 실행
npm run build    # 프로덕션 빌드
npm run preview  # 프로덕션 빌드 미리보기
npm run lint     # Oxlint 검사
```
