# QueryGround · MSSQL 자기주도 학습 실습실

## 사이트 바로 접속

### [▶ SQL 실습 시작하기](https://kanggimin.github.io/MSSQL_Prac/)

위 주소를 클릭하면 설치·회원가입·터미널 실행 없이 바로 실습할 수 있습니다. GitHub Pages에서 제공하므로 프로젝트 소유자의 PC와 VS Code가 꺼져 있어도 접속할 수 있습니다. **Render 계정은 필요하지 않습니다.**

공개 사이트는 **SQLite(WebAssembly) 브라우저 SQL 모드**입니다. 회사·스토어·캠퍼스 DB 3개에서 조회·추가·수정·삭제·JOIN·집계·CTE·윈도 함수·테이블 생성·트랜잭션을 실제 실행합니다. DB 변경은 방문자마다 독립적으로 해당 브라우저에 저장되며 새로고침 후에도 유지됩니다. 사이트 데이터를 지우거나 다른 기기로 접속하면 별도의 데이터로 시작합니다.

교재는 SQL Server 기준입니다. `dbo`, `N'문자열'`, `TOP`, 일부 날짜·문자열 함수는 호환 변환합니다. **SQL Server와 완전히 같은 엔진은 아닙니다.** 프로시저·MERGE·PIVOT·ALTER COLUMN·권한 및 저장 자료형 관련 실습은 학습 화면에 별도 표시하며, 기존 **실제 MSSQL 모드**로 실행할 수 있습니다. [지원 범위와 배포 구조](docs/deployment.md)를 확인하세요.

React + Vite 화면과 기존 Express + Microsoft SQL Server 연결 기능도 함께 유지합니다. 아래 실행 준비는 **실제 MSSQL을 로컬에서 사용할 때만** 필요합니다.

## 실제 MSSQL 로컬 실행 준비

- Node.js 24 이상
- Microsoft SQL Server 인스턴스
- Windows 통합 인증: ODBC Driver 17 또는 18 for SQL Server
- 처음 DB를 준비하는 계정에는 전용 DB 생성 및 실습 사용자 구성 권한이 필요합니다.

프로젝트 폴더의 PowerShell에서 실행합니다.

```powershell
npm.cmd ci
npm.cmd run dev
```

`dev`는 실습 DB를 확인하고 없는 DB만 생성합니다. 이미 준비된 앱 소유 DB의 데이터는 보존합니다. API와 Vite를 함께 실행하며, 기본 접속 주소는 **http://127.0.0.1:5173/** 입니다. 터미널을 유지하고 종료할 때 Ctrl+C를 누르세요. Windows에서는 `start.cmd`를 더블 클릭해도 실행할 수 있습니다.

**Live Server의 5500번 주소와 index.html 파일 직접 열기로는 React 앱을 실행할 수 없습니다.** 이 경로에서는 올바른 실행 방법을 안내하는 화면을 표시합니다.

화면의 DB 준비 버튼 또는 별도 명령도 기존 데이터를 보존하는 준비 작업입니다.

```powershell
npm.cmd run db:setup
```

앱 소유 표시가 없는 동명의 DB는 자동으로 변경하지 않습니다. 기존 `kgm` 등 다른 DB는 준비·초기화 대상이 아닙니다.

프로덕션 빌드를 실행하려면:

```powershell
npm.cmd run build
npm.cmd run db:setup
npm.cmd start
```

이때는 **http://127.0.0.1:3001/** 로 접속합니다. 개발 주소와 프로덕션 주소는 브라우저 저장소가 서로 다르므로, 이동 전 전체 백업을 사용하세요.

공개 사이트의 자동 배포는 [GitHub Pages 배포 안내](docs/deployment.md)를 참고하세요. 실제 SQL Server까지 외부 서버에서 운영하려는 경우의 별도 설정은 [MSSQL 클라우드 배포 안내](docs/deployment-mssql.md)에 보관합니다.

## 연결 및 포트 설정

필요할 때 `.env.example`을 `.env`로 복사해 변경합니다. `.env`는 Git에서 제외됩니다.

```dotenv
HOST=127.0.0.1
PORT=3001
CLIENT_PORT=5173
SQL_SERVER=localhost
SQL_DRIVER=ODBC Driver 17 for SQL Server
SQL_AUTH=windows
SQL_ENCRYPT=false
SQL_TRUST_CERTIFICATE=true
QUERY_TIMEOUT_MS=15000
MAX_RESULT_ROWS=1000
MAX_RESULT_MB=8
```

API 포트를 변경하면 Vite 프록시도 같은 설정을 사용합니다. 사용 중인 클라이언트 포트를 임의로 다른 포트로 바꾸지 않고 오류를 명확히 표시합니다. 환경 설정 변경 후에는 개발 서버를 다시 시작하세요.

SQL 인증은 `SQL_AUTH=sql`, `SQL_USER`, `SQL_PASSWORD`로 지정하며 `mssql`의 기본 드라이버를 사용합니다. Windows 인증은 `msnodesqlv8`을 사용합니다. 한 프로세스에서는 한 종류의 SQL 드라이버만 로드합니다. 별도 서버의 인증서를 검증하려면 `SQL_ENCRYPT=true`, `SQL_TRUST_CERTIFICATE=false`와 해당 서버의 인증 정보를 설정하세요. 기본 TLS 값은 로컬 실습용입니다.

## 사용 흐름과 데이터 보존

1. 회사·스토어·캠퍼스 중 DB를 선택합니다. 연결 상태와 스키마는 선택 DB 기준입니다.
2. 자유 실습에는 선택한 데이터에 맞는 문제 하나가 무작위로 표시됩니다. 영역별 8개씩 총 24개 문제에서 고르며, **다른 문제**로 바꿀 수 있습니다. 힌트와 예시 정답은 필요할 때 열어봅니다. **다른 문제** 버튼은 작성한 SQL을 유지하지만, 자유 실습 화면을 새로고침하면 새 문제와 현재 영역의 빈 입력창으로 시작합니다. 이전 작성 내용은 **실행 기록 → 자동 보관**에서 복구할 수 있으며, 다른 영역·열린 탭의 작성 내용과 저장한 쿼리·실행 기록은 유지됩니다.
3. SQL을 직접 입력하거나 탐색기의 테이블·열을 이용합니다.
4. 실행 버튼, 편집기 안의 Ctrl+Enter 또는 F5를 사용합니다. 선택 영역이 있으면 그 부분만 실행합니다.
5. 결과·메시지·SQL 오류를 확인하고 CSV 또는 JSON으로 내보냅니다.
6. 학습 로드맵에서 문제를 선택합니다. 필요한 준비 SQL은 정답 없이도 편집기에 들어갑니다.
7. 명시적인 DB 초기화는 선택 DB의 실습 객체와 데이터를 기본 상태로 되돌립니다.

DB별 작성 중 SQL, 학습 완료, 저장한 쿼리, 실행 기록 최대 100개는 현재 브라우저에 저장됩니다. 탭 간 변경은 잠금 아래 최신 상태에 반영합니다. Web Locks가 없는 브라우저에서는 IndexedDB 트랜잭션으로 저장을 직렬화합니다.

각 탭의 최근 SQL, 교체 전 SQL과 충돌한 SQL은 실행 기록의 **자동 보관**에서 복구할 수 있습니다. 저장 공간 부족으로 보관하지 못하면 기존 SQL 교체를 중단합니다. 저장 실패는 화면에 표시하며, 메모리의 최신 내용도 전체 백업에 포함합니다. 공간 정리 후 다시 저장할 수 있습니다. 잘못된 저장 항목은 정상 항목을 보존해 복구하고 원문도 복구 자료로 남깁니다.

**전체 백업 / 백업 복원**으로 다른 주소·브라우저·기기로 옮길 수 있습니다. 복원 전 작성 내용도 자동 보관합니다. 자동 보관 목록은 확인 대화상자에서 비울 수 있으며 현재 편집 내용은 유지됩니다.

학습 완료는 직접 이해 여부를 표시하는 자기 평가입니다. 자동 정답 채점 기능은 아닙니다.

## 실제 MSSQL 모드의 SQL 실행 범위

- SQL 최대 50,000자, GO 배치 최대 30개. GO 반복 횟수는 지원하지 않습니다.
- 기본 SQL 실행 예산은 15초입니다. 배치 사이에 시간이 새로 시작되지 않습니다. 취소·시간 초과 후 연결 및 트랜잭션 정리에 짧은 추가 시간이 필요할 수 있습니다.
- 결과 최대 20개, 결과별 기본 1,000행, 열 최대 256개, 보관하는 행 데이터는 기본 총 8MB입니다. 환경 설정으로 행은 최대 5,000개, 용량은 최대 32MB까지 지정합니다.
- SQL에 임의로 TOP을 넣지 않습니다. 표시 한도 밖의 행도 원래 SQL대로 처리하며, 결과에는 수집한 전체 행 수와 생략 사유를 표시합니다.
- JSON·XML·바이너리 값을 20,000자에서 자르지 않습니다. 행이 용량 한도를 넘으면 해당 행을 생략하고 용량 제한을 알립니다.
- CSV는 NULL을 `\N`, 빈 문자열을 `""`로 구분합니다. 헤더와 문자열 셀의 수식 시작 문자를 보호합니다. 원본 값의 형식 보존이 필요하면 JSON을 사용하세요.
- 한 실행 안의 GO 배치는 같은 연결을 사용합니다. 다른 실행의 임시 테이블·변수·SET 설정은 공유하지 않습니다.
- BEGIN TRAN과 COMMIT/ROLLBACK은 한 실행에 함께 작성하세요. 남은 트랜잭션은 롤백합니다. 이미 자동 커밋하거나 명시적으로 커밋한 변경은 취소 버튼이나 뒤 문장의 오류로 되돌아가지 않습니다.
- DB별 실행·초기화는 프로세스 내부 잠금과 SQL Server 애플리케이션 잠금으로 중복 실행을 막습니다. 충돌은 HTTP 409입니다.

실행 SQL은 `QueryGroundStudent` DB 사용자로 `WITH NO REVERT` 전환 후 실행됩니다. 서버 관리 명령·로그인 생성·다른 사용자 DB 데이터 접근은 허용 범위가 아닙니다. SQL Server의 public/guest 권한에 따른 master/tempdb 공개 메타데이터 조회는 별개입니다. 앱은 루프백 연결·로컬 Origin·JSON 변경 요청만 허용하는 개인 실습 도구입니다.

초기화는 FK·뷰·프로시저·함수·테이블·동의어·시퀀스·의존하는 사용자 정의 타입·시간 테이블·사용자 스키마·DB DDL 트리거를 정리합니다. 지원 밖 객체의 의존성으로 실패하면 초기화 트랜잭션을 롤백하고 원인을 표시합니다.

## 실습 데이터와 학습 콘텐츠

| DB                  | 테이블                                                  | 기본 데이터                                                      |
| ------------------- | ------------------------------------------------------- | ---------------------------------------------------------------- |
| QueryGround_Company | EMP, DEPT, SALGRADE, BONUS                              | 사원 14명, 부서 4개, 급여 등급 5개, 보너스 2행                   |
| QueryGround_Store   | Customers, Products, Orders, OrderItems, 컵라면, 제조사 | 고객 8명, 상품 8개, 주문 10건, 상세 14행, 컵라면 8개, 제조사 4개 |
| QueryGround_Campus  | Students, Courses, Enrollments, exam, exam_emp          | 학생 6명, 강좌 4개, 수강 10행, 응시자 20행, 지원자 140행         |

모두 가상 데이터입니다. `주민등록번호` 열은 실제 개인정보가 아닌 임의의 6자리 실습 코드입니다. exam의 번호 열과 exam_emp의 PK·FK는 학습자가 추가하도록 초기 구조에서 생략했습니다. 동명이인을 이름으로 연결하는 준비 예시는 교육용이며 실제 인물 식별에는 고유 키가 필요합니다.

기준 교재 90쪽을 보존하고 개념 23개, 기출 36개, 확장 실습 12개를 제공합니다. 원본에 없는 번호 17–21, 35–37은 임의로 만들지 않았습니다. 중복 번호는 suffix로 구분하고 잘못된 패턴·정렬·삭제 대상·평균 자료형 등을 해설에서 정정했습니다.

- [프로젝트 구조와 API](docs/architecture.md)
- [교재 페이지 대응표](docs/source-coverage.md)
- [수정 내용과 검증 방법](docs/verification.md)

PDF 교체:

```powershell
npm.cmd run pdf:import -- "새 PDF 절대 경로"
```

원본·페이지별 텍스트·manifest를 함께 갱신하며 실패하면 기존 파일을 복원합니다. 실제 페이지 수로 화면을 구성합니다. 교재 해시가 학습 콘텐츠 기준과 달라지면 이전 교재 기반임을 표시하고 잘못된 페이지 연결을 막습니다. 새 PDF에 맞는 문제·해설·정답은 `shared/content`에서 직접 편집하고 검증해야 합니다. 검토를 완료하면 `shared/source-manifest.json`의 `curriculumSha256`을 현재 `sourceSha256`과 맞추고 대응표를 다시 생성합니다. 이 명령은 교육과정을 자동 생성하지 않습니다.

## 검증

```powershell
npm.cmd test
npm.cmd run test:render
npm.cmd run build
npm.cmd run format:check
npm.cmd run test:integration
npm.cmd run test:regression
npm.cmd run test:ports
npm.cmd run test:browser
npm.cmd run verify
```

SQL 검사는 앱 소유 실습 DB의 데이터를 초기화합니다. 필요한 작업은 먼저 전체 백업이나 저장한 쿼리로 보관하세요. 전체 검증은 공유 DB 검사를 순차 실행합니다.

브라우저 검사는 설치된 Chrome을 사용합니다. Edge를 사용하려면 PowerShell에서 `$env:BROWSER_CHANNEL='msedge'`를 지정합니다. 브라우저 테스트는 별도 브라우저 컨텍스트를 사용하며 사용자의 실제 브라우저 기록은 변경하지 않습니다. 실패 추적 자료는 `tmp/playwright-results`에 저장합니다.

GitHub Actions는 소스 포맷·단위·빌드·렌더링 검사와 브라우저 SQL 엔진 검사를 실행합니다. `main`에 push하면 별도 Pages 워크플로가 `npm run build:pages`로 빌드해 공개 사이트를 자동 갱신합니다. 실제 MSSQL·포트·기존 브라우저 전체 검증은 SQL Server가 준비된 로컬 환경에서 실행합니다.
