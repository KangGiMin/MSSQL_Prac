# GitHub Pages 공개 SQL 실습실

접속 주소: **https://kanggimin.github.io/MSSQL_Prac/**

README의 링크를 클릭하면 바로 사용할 수 있습니다. 방문자와 운영자 모두 Render 계정·외부 SQL Server 계정이 필요하지 않습니다. 공개 파일은 GitHub Pages에서 제공하며 SQL은 방문자의 브라우저에서 실행하므로 운영자의 PC를 켜 두지 않아도 됩니다.

## 두 실행 모드

| 구분 | 공개 사이트 | 기존 로컬 MSSQL 모드 |
| --- | --- | --- |
| 실행 엔진 | sql.js의 SQLite WebAssembly | 실제 Microsoft SQL Server |
| 실행 위치 | 방문자 브라우저의 Web Worker | Express API를 통해 SQL Server |
| 데이터 | 방문자별 독립 DB 3개, IndexedDB에 저장 | 기존 전용 SQL Server DB 3개 |
| 시작 | 위 주소 클릭 | `npm run dev` |
| 빌드 | `npm run build:pages` | `npm run build` |
| 추가 계정 | 없음 | 로컬 SQL Server 또는 별도 서버 필요 |

공개 모드는 결과를 미리 만들어 보여 주는 모의 실행기가 아닙니다. 실제 SQLite 엔진이 입력한 SQL을 실행하고, 변경된 DB 파일을 브라우저에 보관합니다. 실제 MSSQL 모드의 연결·권한·서버 코드는 유지합니다. 공개 빌드에 로컬 SQL 인증 정보는 포함하지 않습니다.

## 지원 범위

- SELECT, WHERE, JOIN, GROUP BY/HAVING, 정렬, 서브쿼리, CASE, COALESCE, 집합 연산, CTE, 윈도 함수
- INSERT, UPDATE, DELETE, CREATE/DROP TABLE, 열 추가·삭제, PK/FK/CHECK, 기본 인덱스, 뷰
- BEGIN TRAN, COMMIT, ROLLBACK. 실행 종료 시 남은 트랜잭션은 롤백합니다.
- 호환 변환: `dbo.`, 대괄호 식별자, `N'문자열'`, 바깥 SELECT의 정수 TOP, 단순 TOP WITH TIES, OFFSET/FETCH, SELECT INTO, 교재의 UPDATE 별칭 패턴
- 함수: LEN, LEFT/RIGHT, SUBSTRING, ISNULL, GETDATE, DATEADD/DATEDIFF의 day/month/year/hour/minute/second, 일부 CONVERT
- GO 배치 분리, 여러 결과표, 중복 열 이름 보존, CSV/JSON 내보내기, DB별 초기화

SQLite의 자료형·문자열 비교·NULL 정렬·정수 나눗셈·집계·날짜 동작은 SQL Server와 차이가 있습니다. CHAR/NCHAR의 길이와 NVARCHAR 제한, DECIMAL 정밀도, IDENTITY, 중첩 트랜잭션 등 SQL Server의 규칙을 그대로 재현하지 않습니다. TOP의 서브쿼리 변환 등 임의 T-SQL 전체를 지원하는 변환기는 아닙니다.

프로시저·사용자 함수·MERGE·PIVOT·ALTER COLUMN·기존 테이블의 ADD CONSTRAINT·DECLARE·TRY/CATCH·OPENJSON·권한 관리·서버 관리·시스템 카탈로그·INCLUDE 인덱스·DATALENGTH는 실제 SQL Server에서 실습합니다. 관련 학습 항목에는 **SQL Server 실습 필요** 표시를 붙였습니다. 해당 항목의 설명·정답·원본 PDF는 공개 사이트에서도 읽을 수 있습니다. `CONVERT`의 스타일 인수는 `DATE` 대상의 `112`만 지원합니다.

자유 실습 24개의 예시 답안과 브라우저에서 실행 가능한 교재·확장 항목은 자동 테스트로 검사합니다. 모든 T-SQL 문법이나 SQL Server와의 결과 일치를 보장하는 검사는 아닙니다.

## 저장·취소·한도

- 기본 데이터는 기존 SQL Server용 시드에서 실제 SQLite DB 3개를 생성합니다. 새로고침 후에도 수정 내용을 유지합니다. 다른 방문자의 데이터는 바뀌지 않습니다.
- 같은 출처의 탭은 Web Locks와 저장 리비전으로 충돌을 방지합니다. 잠금 기능이 없는 브라우저는 IndexedDB의 리비전 충돌 검사를 사용합니다.
- 사이트 저장소 삭제·시크릿 모드 종료·기기 변경 시 DB가 유지되지 않을 수 있습니다. 브라우저 저장 공간이 부족하거나 차단되면 오류를 표시합니다.
- 기존 **전체 백업**은 작성 SQL·진행도·기록용이며 테이블 데이터 자체를 백업하지 않습니다. 데이터가 필요하면 조회 결과를 CSV/JSON으로 내려받으세요.
- SQL 최대 50,000자, GO 배치 최대 30개, 실행 요청 15초 제한, 결과 최대 20개, 결과별 최대 1,000행·256열, 보관 행 데이터 총 8MB입니다.
- 취소·시간 초과는 Worker를 종료합니다. 완료되어 저장된 이전 실행은 유지되지만, 중단된 현재 실행은 저장되지 않습니다. 일반 SQL 오류에서는 앞서 자동 커밋한 변경을 저장하고 미완료 트랜잭션만 롤백합니다.

## 자동 배포

`.github/workflows/pages.yml`이 `main` push 또는 수동 실행을 받아 검사 → 브라우저 모드 빌드 → Pages 업로드 → 배포를 수행합니다. `VITE_SQL_ENGINE=browser`, 저장소 이름에 맞는 `VITE_BASE_PATH`를 빌드할 때 지정합니다. WASM·Worker·교재·PDF 모두 `/MSSQL_Prac/` 경로에서 제공합니다. 서버나 DB 비밀번호를 Actions secret으로 등록할 필요가 없습니다.

```powershell
npm.cmd ci --ignore-scripts
npm.cmd test
npm.cmd run build:pages
npm.cmd run test:pages
```

GitHub 저장소 **Settings → Pages → Source**는 **GitHub Actions**입니다. 진행 상태는 저장소의 **Actions → Deploy SQL practice to GitHub Pages**에서 확인할 수 있습니다. 검사나 배포가 실패하면 마지막 성공 배포가 유지됩니다.

공식 문서: [GitHub Pages 사용자 워크플로](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [sql.js 프로젝트](https://github.com/sql-js/sql.js).

실제 SQL Server를 클라우드로 운영하는 별도 구성은 [MSSQL 클라우드 배포 안내](deployment-mssql.md)를 참고하세요. 현재 공개 사이트는 그 서비스에 의존하지 않습니다.
