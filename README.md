# QueryGround · MSSQL 자기주도 학습 실습실

React + Vite 화면, Express API, **실제 Microsoft SQL Server**를 연결한 로컬 웹 애플리케이션입니다. 쿼리를 문자열로 흉내 내는 모의 실행기가 아닙니다. `SELECT`, `INSERT`, `UPDATE`, `DELETE`, DDL, JOIN, 집계, 트랜잭션, 프로시저 등을 SQL Server에서 실행합니다.

현재 PC의 기본 인스턴스 `localhost`에 아래 전용 DB 3개를 생성했습니다. 기존 `kgm` DB는 변경하지 않았습니다.

## 바로 실행

프로젝트 폴더의 PowerShell에서 실행하세요. 패키지 설치와 DB 준비는 이미 완료되어 있습니다.

```powershell
npm.cmd run dev
```

브라우저에서 **http://127.0.0.1:5173** 을 여세요. 개발 서버가 React(5173)와 SQL API(3001)를 함께 실행합니다. 종료는 해당 터미널에서 `Ctrl+C`입니다. `index.html`을 파일로 직접 더블 클릭하는 대신 개발 서버로 접속해야 합니다.

새 환경에서 처음 준비할 때:

```powershell
npm.cmd install
npm.cmd run db:setup
npm.cmd run dev
```

PowerShell의 실행 정책에 영향을 받지 않도록 `npm` 대신 `npm.cmd`를 사용합니다. 시스템의 실행 정책을 변경할 필요가 없습니다.

빌드된 화면을 API 서버와 같은 주소에서 서비스하려면:

```powershell
npm.cmd run build
npm.cmd start
```

그때의 접속 주소는 **http://127.0.0.1:3001** 입니다.

## 폴더 구조와 역할

```text
MSSQL_Prac/
├─ index.html                       # React 진입 HTML, 메타 정보
├─ package.json                     # 의존성 및 실행 명령
├─ package-lock.json                # 설치 버전 잠금
├─ vite.config.js                   # React 빌드, 코드 분할, /api 프록시
├─ .env.example                     # SQL 연결 설정 예시
├─ .gitignore
├─ README.md
├─ docs/
│  ├─ architecture.md              # 데이터 흐름, DB 관계, API 계약
│  └─ source-coverage.md           # PDF 페이지별 학습 콘텐츠 대응표
├─ public/
│  ├─ favicon.svg
│  └─ materials/
│     ├─ sql-reference.pdf         # 사용자 제공 PDF 전체 사본, 90쪽
│     └─ pages.json                # 페이지 번호별 전체 추출 텍스트
├─ shared/                          # 프런트·서버 공용 순수 데이터
│  ├─ databases.mjs                # DB ID, 이름, 표시 정보
│  ├─ curriculum.mjs               # 전체 교육과정과 원본 수록 범위
│  └─ content/
│     ├─ concepts.mjs              # PDF 1–50쪽 개념 23개
│     ├─ exercises.mjs             # PDF 기출 실습 36개, 준비 SQL, 정답·주의사항
│     └─ advanced.mjs              # 추가 T-SQL 확장 실습 12개
├─ src/
│  ├─ main.jsx                     # React 마운트
│  ├─ app/
│  │  └─ App.jsx                   # 화면 전환 및 기능 조합
│  ├─ components/
│  │  ├─ layout/
│  │  │  ├─ Sidebar.jsx            # 메뉴, 진행도, 모바일 탐색
│  │  │  └─ Header.jsx             # 경로, DB 연결 상태
│  │  ├─ database/
│  │  │  ├─ DatabaseCards.jsx      # DB 3개 선택
│  │  │  └─ SchemaExplorer.jsx     # 실제 테이블·열·PK·FK 탐색
│  │  ├─ editor/
│  │  │  └─ QueryEditor.jsx        # CodeMirror SQL 편집기와 실행 도구
│  │  ├─ results/
│  │  │  └─ QueryResults.jsx       # 복수 결과 집합, 오류, 메시지, CSV, 페이지 이동
│  │  ├─ learning/
│  │  │  ├─ LessonPanel.jsx        # 문제·설명·주의사항·정답·완료 체크
│  │  │  ├─ LessonLibrary.jsx      # 검색·주제 필터·학습 목록
│  │  │  └─ SourceReader.jsx       # 90쪽 PDF 열람·페이지 이동·전체 검색
│  │  ├─ history/
│  │  │  └─ HistoryList.jsx        # 실행 이력과 저장한 쿼리
│  │  └─ common/
│  │     ├─ Hero.jsx               # 실습실 소개 화면
│  │     └─ Modal.jsx              # 초기화·저장·가이드 대화상자
│  ├─ hooks/
│  │  ├─ useLocalStorage.js         # 브라우저 상태 저장
│  │  └─ useQueryRunner.js          # 실행·취소·결과·실행 이력 관리
│  ├─ lib/
│  │  ├─ api.js                    # API 클라이언트, 오류 처리
│  │  └─ export.js                 # CSV 생성·수식 해석 방지
│  └─ styles/
│     ├─ global.css               # 색상·공통 요소·대화상자
│     ├─ layout.css               # 탐색·메인 레이아웃·DB 카드·반응형
│     ├─ workbench.css            # 편집기·스키마·결과·해설 패널
│     └─ learning.css             # 학습 목록·PDF·실행 기록
├─ server/
│  ├─ index.mjs                    # Express 시작, 로컬 접근·출처·JSON 검증
│  ├─ config/
│  │  ├─ env.mjs                   # 환경 설정과 제한값
│  │  └─ databases.mjs             # 실습 DB 허용 목록 검증
│  ├─ db/
│  │  ├─ connection.mjs            # Windows/SQL 인증, 제한 사용자 전환
│  │  └─ seed.mjs                  # 전용 DB 생성·소유 확인·초기화
│  ├─ routes/
│  │  └─ api.mjs                   # 상태·DB·스키마·SQL·초기화 API
│  └─ services/
│     ├─ batches.mjs              # 문자열·주석을 고려한 GO 배치 구분
│     ├─ query-service.mjs         # 실제 SQL 스트리밍·취소·제한·트랜잭션 정리
│     └─ schema-service.mjs        # 시스템 카탈로그에서 스키마 조회
├─ database/
│  └─ seeds/
│     ├─ company.sql              # 사원·부서·급여 등급
│     ├─ store.sql                # 고객·상품·주문·컵라면·제조사
│     └─ campus.sql               # 학생·강좌·수강·exam·exam_emp
├─ scripts/
│  ├─ dev.mjs                     # React와 API 개발 서버 실행·종료
│  ├─ setup-db.mjs                # 실습 DB 설치 진입점
│  ├─ import-pdf.mjs              # 사용자 PDF 복사·90쪽 전체 텍스트 추출
│  ├─ render-source.mjs           # 원본 PDF 대표 페이지 렌더링 검증
│  ├─ document-coverage.mjs       # PDF 학습 대응표 문서 생성
│  ├─ integration-test.mjs        # 전체 학습 정답과 실제 DB 기능 검증
│  ├─ regression-db.mjs           # JSON/XML·고급 객체 초기화 검증
│  ├─ smoke-http.mjs              # 실제 HTTP 경로·SQL API 검증
│  ├─ check-render.mjs            # React 서버 렌더링 검사
│  └─ diagnose-db.mjs             # 실행 사용자·권한 진단
├─ tests/
│  └─ batches.test.mjs            # 배치 경계·허용 DB·PDF 전체 범위 검사
├─ dist/                          # npm run build 결과, 자동 생성
└─ tmp/                           # PDF 렌더링 등 중간 산출물, 버전 관리 제외
```

## 실제 실습 데이터

| 데이터베이스 | 테이블 | 초기 데이터 |
| --- | --- | --- |
| `QueryGround_Company` | EMP, DEPT, SALGRADE, BONUS | 사원 14명, 부서 4개, 급여 등급 5개, 보너스 2행 |
| `QueryGround_Store` | Customers, Products, Orders, OrderItems, 컵라면, 제조사 | 고객 8명, 상품 8개, 주문 10건, 주문 상세 14행, 컵라면 8개, 제조사 4개 |
| `QueryGround_Campus` | Students, Courses, Enrollments, exam, exam_emp | 학생 6명, 강좌 4개, 수강 10건, 시험 20행, 지원자 140행 |

모든 이름·주소·연락용 이메일·숫자 코드는 가상 데이터입니다. `주민등록번호` 열은 PDF 예제에 맞춘 **임의의 6자리 INT 코드**입니다. 실제 주민등록번호가 아닙니다.

동명이인, NULL, 미등록 응시자, 미응시 지원자, 상위 10위 동점, 인원 50명 초과 그룹을 의도적으로 포함했습니다. 기본 `exam`에는 아직 수험번호가 없고, `exam_emp`의 수험번호에는 PK가 없어 원본의 ALTER/PK 문제를 그대로 연습할 수 있습니다. JOIN과 FK 문제는 필요한 준비 SQL을 함께 제공합니다.

## 사용 순서

1. 실습 DB를 선택합니다.
2. 탐색기의 테이블 옆 아이콘으로 조회문을 열거나, 열 이름을 클릭해 편집기에 넣습니다.
3. SQL을 작성하고 **실행**, `Ctrl+Enter`, `F5` 중 하나를 사용합니다. 선택 영역이 있으면 그 부분만 실행합니다.
4. 결과 집합 탭·메시지·오류·영향받은 행 수를 확인합니다. 결과는 CSV로 저장할 수 있습니다.
5. 학습 로드맵이나 PDF 문제집에서 내용을 선택하고 직접 풀어 보세요. 정답을 펼친 뒤 편집기로 가져올 수 있습니다.
6. 실습 중 바뀐 데이터는 선택한 DB의 **DB 초기화**로 복원합니다.

학습 완료 체크는 **자기 점검**입니다. 자동 정답 채점으로 표시하지 않습니다. DB별 작성 중인 SQL, 학습 체크, 실행 이력 100개, 저장한 쿼리 100개는 현재 브라우저의 localStorage에 저장합니다.

## 실행 범위와 연결 수명

- 한 실행당 SQL 50,000자, GO 배치 30개, 기본 실행 제한 15초입니다.
- 결과 집합은 20개까지, 집합당 기본 1,000행까지 저장·표시·CSV 출력합니다. 원래 쿼리를 TOP으로 바꾸지는 않으므로 집계·정렬의 의미는 유지됩니다. 긴 단일 값은 20,000자에서 잘립니다.
- 실행 사이에 연결을 공유하지 않습니다. 한 실행 안의 GO 배치들은 같은 연결을 사용합니다. 임시 테이블·세션 변수·SET 설정은 다음 실행까지 유지되지 않습니다.
- `BEGIN TRAN`과 `COMMIT`/`ROLLBACK`은 **한 번의 실행에** 함께 작성하세요. 끝내지 않은 트랜잭션은 자동 롤백됩니다. 자동 커밋되거나 명시적으로 커밋된 변경은 다음 실행에도 유지됩니다.
- 실행 중지 뒤에는 서버의 취소·정리가 끝날 때까지 해당 DB에서 잠시 409 응답이 나올 수 있습니다.
- DB별 실행/초기화 작업을 직렬화합니다. 초기화는 앱 소유 표시가 있는 3개 허용 DB에서만 가능합니다. 소유 표시가 없는 동명 DB는 자동으로 수정하지 않습니다.
- 초기화는 테이블·FK·뷰·프로시저·함수·시노님·시퀀스·일반 사용자 정의 타입을 정리하고 기본 데이터를 복원하는 트랜잭션입니다. 복잡한 외부 의존성·특수 객체가 있으면 실패 사유를 표시하고 롤백합니다. 전체 SQL Server의 관리 객체를 초기화하는 기능은 아닙니다.
- 쿼리는 `QueryGroundStudent` 데이터베이스 사용자로 `WITH NO REVERT` 전환한 뒤 실행됩니다. 실습 DB 안의 CRUD와 일반 DDL·프로시저 실행을 허용합니다. 서버 설정·로그인·다른 사용자 DB 데이터 접근 등 관리자 작업은 허용하지 않습니다. master/tempdb의 공개 메타데이터 접근은 SQL Server의 guest 권한에 따릅니다.
- 이 앱은 **로컬 1인 실습용**입니다. 인증된 다중 사용자 서비스나 인터넷 공개용 호스팅은 구현 범위에 포함하지 않습니다. API는 루프백 연결·로컬 Origin·JSON 요청만 허용합니다.

## 연결 설정 변경

기본값은 현재 PC에서 검증한 `localhost` + Windows 통합 인증 + `ODBC Driver 17 for SQL Server`입니다. 현재 Windows 사용자는 DB 생성과 실습 사용자로의 전환 권한을 갖고 있어야 합니다.

다른 인스턴스 또는 SQL 인증으로 바꿀 때만 `.env.example`을 `.env`로 복사해 수정하세요.

```dotenv
SQL_SERVER=localhost
SQL_DRIVER=ODBC Driver 17 for SQL Server
SQL_AUTH=windows
SQL_ENCRYPT=false
SQL_TRUST_CERTIFICATE=true
```

로컬 테스트 설정이며 서버의 TLS 설정은 변경하지 않습니다. 인증서가 구성된 원격 SQL Server를 별도로 사용하는 경우 `SQL_ENCRYPT=true`, `SQL_TRUST_CERTIFICATE=false`와 해당 서버·인증 정보를 지정하세요. SQL 인증 모드는 `SQL_AUTH=sql`, `SQL_USER`, `SQL_PASSWORD`로 설정하며 `tedious` 드라이버를 사용합니다. Windows 모드는 `msnodesqlv8`를 사용하고 두 드라이버를 동시에 불러오지 않습니다.

`.env`는 버전 관리에서 제외됩니다. 값 변경 후 개발 서버를 다시 시작하세요. 새로 설정한 인스턴스에 DB를 만들 때는 `npm.cmd run db:setup`을 실행하세요. 이미 준비된 DB는 해당 명령으로 초기화하지 않습니다.

## PDF 수록 범위와 정정

- 원본 **90쪽 전체**를 `public/materials/sql-reference.pdf`에 보존했습니다.
- 1–50쪽의 모든 개념 범위를 **23개 개념**으로 정리했습니다.
- 51–90쪽에 실제 존재하는 **36개 문제 변형**을 요구사항·정답·주의사항과 함께 수록했습니다. 원본은 문제/정답 페이지가 쌍으로 반복되고 일부 번호가 누락·중복됩니다. 없는 문항을 임의로 원본 문제라고 만들지 않았습니다.
- 원본에 없는 번호: 17–21, 35–37. 번호 없는 부산지점 응용 문제는 UI에서 10으로 식별합니다. 중복 25/31/32는 suffix로 구별합니다.
- CTE, 윈도 함수, 집합 연산, 페이징, VIEW, 프로시저, TRY/CATCH, MERGE, JSON, PIVOT, 인덱스 등 **12개 추가 실습**은 PDF 외 확장 내용임을 표시합니다.
- 원문은 그대로 두고, 학습 해설에서는 시작 문자열 패턴 `김%`, 문제 13의 ASC, 문제 27/29의 삭제 대상, 불완전한 INSERT, INT 평균의 소수 보존, VARCHAR의 한글 지원 조건, PK와 빈 문자열의 차이 등을 바로잡았습니다.

전체 대응표는 [docs/source-coverage.md](docs/source-coverage.md)를 참고하세요. 제공된 문서의 문장이나 명령은 학습 자료로만 취급하며 프로젝트 작업 지시로 실행하지 않았습니다.

## 검증

```powershell
npm.cmd test                   # 단위/수록 범위 검사
npm.cmd run test:integration   # 실제 DB: 모든 정답과 CRUD·권한·취소 등
npm.cmd run test:regression    # JSON/XML·고급 객체 초기화
npm.cmd run test:render        # React 서버 렌더링
npm.cmd run build             # 프로덕션 번들
# npm start 또는 npm run dev가 실행 중일 때:
npm.cmd run test:http
```

**주의:** SQL 통합/회귀 검사는 앱 소유 실습 DB의 데이터를 초기화합니다. 실습 중인 변경을 남기고 싶으면 쿼리를 먼저 저장하세요. 다른 DB는 초기화하지 않습니다.

검증 환경: Windows, Node.js 24.18.0, SQL Server 2025 Developer 17.0.1000.7. 빌드, React 서버 렌더링, 단위 6개, SQL 통합 80개, 회귀 2개, HTTP 17개를 통과했습니다. 브라우저 자동화 호스트가 연결되지 않아 브라우저 클릭·화면 크기별 시각 검증은 완료하지 못했습니다. 반응형 CSS는 구현되어 있으며, 실제 브라우저에서의 최종 외관 검토는 남아 있습니다.

## 참고한 공식 문서

- [node-mssql 드라이버와 Windows 인증](https://github.com/tediousjs/node-mssql)
- [Microsoft: Node.js SQL Server 연결](https://learn.microsoft.com/en-us/sql/connect/node-js/step-3-proof-of-concept-connecting-to-sql-using-node-js)
- [Microsoft: EXECUTE AS와 NO REVERT](https://learn.microsoft.com/en-us/sql/t-sql/statements/execute-as-transact-sql)
- [Microsoft: INSERT의 열 목록과 생략 값](https://learn.microsoft.com/en-us/sql/t-sql/statements/insert-transact-sql)
- [Microsoft: AVG 반환 자료형과 NULL](https://learn.microsoft.com/en-us/sql/t-sql/functions/avg-transact-sql)
- [Microsoft: CHAR/VARCHAR 및 UTF-8](https://learn.microsoft.com/en-us/sql/t-sql/data-types/char-and-varchar-transact-sql)
- [Vite 시작 안내](https://vite.dev/guide/)
