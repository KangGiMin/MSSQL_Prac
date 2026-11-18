# 실제 MSSQL Server 공개 배포

접속 주소: **https://kanggimin.github.io/MSSQL_Prac/**

현재 공개 화면은 외부 MSSQL API 연결 대기 상태입니다. 교재·문제·해설은 사용할 수 있으며, SQL 실행은 외부 서버 연결 후 제공됩니다. SQL 엔진 대체·문법 변환·브라우저 DB 실행 경로는 제거했습니다.

## 실행 구조

방문자 → GitHub Pages의 React 화면 → 외부 Express API → 실제 SQL Server 계열 DB 3개로 연결합니다. 작성한 T-SQL은 다른 문법으로 변환하지 않고 서버에 전달합니다.

GitHub Pages는 정적 호스팅이므로 SQL Server와 Node.js API를 실행하지 않습니다. PC를 꺼도 실습하려면 외부 API와 DB가 필요합니다. 준비된 경로는 **Render 웹/API + Azure SQL Database**입니다. Render는 필수가 아니며, 같은 서버를 다른 호스팅에 배포해도 됩니다. 운영자만 계정을 준비하고 방문자는 주소만 클릭합니다.

Azure SQL Database는 Microsoft SQL Server 계열 T-SQL 엔진입니다. 인스턴스 관리·서버 DB 생성 등은 별도 SQL Server 인스턴스와 차이가 있으며 앱의 실습 권한은 지정한 DB 안으로 제한됩니다.

## 계정과 외부 서버 준비

1. [Render](https://render.com/) 계정을 준비하고 이 대화의 Render 플러그인을 연결합니다.
2. [Azure 포털](https://portal.azure.com/)에서 Azure 구독을 준비합니다. Microsoft 계정 로그인과 구독 활성화는 별개입니다.
3. [MSSQL 클라우드 배포 안내](deployment-mssql.md)에 따라 SQL 논리 서버와 실습 DB 3개를 준비합니다. 무료 DB는 한도 도달 시 자동 중지 옵션을 사용하며 유료 초과 사용으로 바꾸지 않습니다.
4. DB 비밀번호는 Render의 비밀 환경 변수에 입력합니다. 채팅·README·저장소·`VITE_` 변수에는 넣지 않습니다.
5. `render.yaml`로 웹/API를 배포합니다. 초기 준비는 전용 DB만 대상으로 하며 이미 준비된 데이터는 보존합니다.

리소스 생성과 실제 외부 검증에는 계정 연결이 필요합니다. 무료 요금제의 유휴 중지·월 사용량 한도로 첫 접속 대기나 서비스 중지가 생길 수 있습니다. 유료 플랜으로 자동 대체하지 않습니다.

## Pages와 API 연결

API 서버에 설정합니다.

```dotenv
DEPLOYMENT_MODE=hosted
APP_ACCESS=public
PUBLIC_CLIENT_ORIGIN=https://kanggimin.github.io
SQL_PLATFORM=azure
SQL_AUTH=sql
SQL_ENCRYPT=true
SQL_TRUST_CERTIFICATE=false
```

`SQL_SERVER`, `SQL_USER`, `SQL_PASSWORD`도 서버에 설정합니다. Render 외 호스팅은 `PUBLIC_ORIGIN=https://API호스트`를 지정합니다. 일반 SQL Server 인스턴스는 `SQL_PLATFORM=sqlserver`를 사용합니다.

API 자신의 출처와 명시한 `PUBLIC_CLIENT_ORIGIN`만 허용합니다. Pages 출처의 API 사전 요청에 CORS를 제공하며 HTTPS·JSON 요청·기존 실습 사용자 제한을 유지합니다. 공개 방문자의 `/api/setup`은 차단합니다. SQL은 서버의 공용 실습 데이터에 반영되므로 한 방문자의 수정·삭제·초기화를 다른 방문자도 볼 수 있습니다. 작성 SQL·진행도·기록은 브라우저별로 저장합니다.

GitHub 저장소 **Settings → Secrets and variables → Actions → Variables**에 저장소 변수를 지정합니다.

```dotenv
VITE_API_BASE_URL=https://실제로-발급된-API-호스트
```

이 값은 공개 API 주소이며 비밀번호가 아닙니다. `/api` 경로·쿼리 문자열 없이 HTTPS 호스트만 지정합니다. 설정 후 Pages 워크플로를 다시 실행하거나 `main`에 push합니다. 빌드와 브라우저 검사 모두 같은 주소를 사용하며 실제 MSSQL API 연결 검사를 통과한 뒤 게시합니다. 주소가 없으면 대기 안내를 표시하고 실행·초기화를 비활성화합니다.

API 서버는 React 화면도 제공합니다. API 호스팅 주소를 README 대표 주소로 사용할 때는 `npm run build`의 같은 출처 API 연결을 사용하면 됩니다.

## 검증

```powershell
npm.cmd test
npm.cmd run build:pages
npm.cmd run test:pages
npm.cmd run test:mssql
```

`test:mssql`은 환경 변수의 실제 서버에서 SELECT로 기본 데이터를 읽고, 변경 검사는 세션 임시 테이블 `#MssqlProbe`에서만 수행합니다. 기본 데이터를 초기화하지 않습니다. 기존 통합·회귀 검사는 DB를 초기화하므로 별도로 실행합니다.

공식 문서: [GitHub Pages 호스팅 범위](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site), [Azure SQL 무료 요금제](https://learn.microsoft.com/en-us/azure/azure-sql/database/free-tier), [Render Free](https://render.com/docs/free).
