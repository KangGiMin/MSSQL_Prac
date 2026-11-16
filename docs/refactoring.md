# 하드 코딩 점검과 코드 정리

`src`, `server`, `shared`, `scripts`, 테스트, DB 시드와 실행·배포 설정을 점검했습니다. 같은 의미로 반복되는 값은 공통 정의로 모으고, 중복 처리와 긴 화면 코드는 함수·컴포넌트·훅으로 분리했습니다. 기존 기본값, API 주소와 응답 구조, 저장 키, 백업 형식, SQL 실행 방식은 유지했습니다.

## 공통 정의

| 파일 | 관리하는 값과 역할 |
| --- | --- |
| `shared/runtime.mjs` | 기본 호스트·API/클라이언트 포트·API 접두사, 포트 검증, IPv6·와일드카드 프록시 주소 |
| `shared/workspace.mjs` | 기존 `qg.*` 저장 키, 보관·복구 접두사, 백업 버전, 기록 100개·백업 20MB·제목 80자 제한, PDF 경로, 기존 기본 SQL |
| `shared/databases.mjs` | 기존 DB 허용 목록과 명시적인 기본 DB ID. 배열의 세 번째 항목에 의존하던 선택 제거 |
| `src/config/navigation.js` | 메뉴·헤더·페이지 제목과 세션 검증에서 함께 사용하는 화면 목록 |
| `src/config/workbench.js` | 연결 확인·취소·알림·다운로드 시간, 결과 페이지 크기, 미리보기 행 수, 처음 펼칠 테이블 |
| `src/config/editor.js` | 기존 CodeMirror 테마와 편집기 설정 |
| `server/config/limits.mjs` | SQL 길이·배치·열·결과·메시지·용량 제한, 연결·잠금·정리 시간, 환경변수 숫자 범위 처리 |
| `server/config/sql.mjs` | 실습 사용자 이름과 DB 소유·준비 표시 이름 |
| `server/db/statements.mjs` | DB 표시 조회·생성, 실습 사용자 준비·전환, 초기화와 스키마 조회 SQL |

## 기존 파일별 정리

| 파일 | 정리 내용 |
| --- | --- |
| `src/app/App.jsx` | 모달·연결 상태·알림 분리. 기본 DB 인덱스, 저장 키, 기록 제한, 백업 검증·병합, SQL 생성 중복 제거 |
| `src/lib/storage.js` | 기존 저장·복구·보관 키와 기록 제한을 공통 정의로 교체 |
| `src/lib/practiceSession.js` | 세션 키와 허용 화면 목록 공유 |
| `src/lib/api.js` | API 접두사 공유, 반복되는 JSON POST 처리 통합 |
| `src/lib/export.js` | JSON 다운로드 함수 공유, 다운로드 주소 해제 시간 명시 |
| `src/hooks/useQueryRunner.js` | 취소 후 대기·조회 제한 시간을 이름으로 표현 |
| `src/components/common/ErrorBoundary.jsx` | 복구 파일을 공통 JSON 다운로드 함수로 생성 |
| `src/components/database/DatabaseCards.jsx` | DB ID별 아이콘 중복 지정 대신 기존 DB 메타데이터의 `icon` 사용 |
| `src/components/database/SchemaExplorer.jsx` | 기본 펼침 목록과 SQL 식별자 이스케이프 공유 |
| `src/components/editor/QueryEditor.jsx` | 테마·설정 분리, 동일한 단축키 처리 통합 |
| `src/components/history/HistoryList.jsx` | 탭별 데이터·문구를 목록으로 정의하고 공통 탭 컴포넌트 사용 |
| `src/components/layout/Header.jsx` | 공통 화면 이름 사용 |
| `src/components/layout/Sidebar.jsx` | 공통 화면 목록으로 메뉴 생성 |
| `src/components/learning/LessonLibrary.jsx` | 반복되는 탭 버튼과 변경 처리 통합 |
| `src/components/learning/SourceReader.jsx` | PDF·페이지 텍스트 주소 공유 |
| `src/components/results/QueryResults.jsx` | 결과 페이지 크기 명시, 공통 JSON 다운로드 사용 |
| `src/styles/global.css` | 같은 색상값에 이름을 부여하고 기존 CSS 변수 재사용 |
| `src/styles/layout.css` | 반복 색상을 같은 값의 공통 CSS 변수로 교체 |
| `src/styles/learning.css` | 반복 색상을 같은 값의 공통 CSS 변수로 교체 |
| `src/styles/workbench.css` | 반복 색상을 같은 값의 공통 CSS 변수로 교체 |
| `server/config/env.mjs` | 포트 기본값·검증과 숫자 범위 처리 공유 |
| `server/db/connection.mjs` | 연결 제한과 사용자 전환 SQL 공유 |
| `server/db/azure.mjs` | DB 표시 이름과 조회·생성 SQL 공유 |
| `server/db/seed.mjs` | 긴 초기화·권한 SQL 분리, DB 표시 이름 공유 |
| `server/services/schema-service.mjs` | 조회 SQL과 결과 변환 코드 분리 |
| `server/services/query-service.mjs` | 실행·출력·정리 제한을 공통 정의로 교체. 안내 문구도 같은 제한값 참조 |
| `server/services/batches.mjs` | 배치 제한과 안내 문구의 숫자 일치 |
| `server/index.mjs` | API 접두사와 요청 본문 제한 공유 |
| `vite.config.js` | 기본 포트·호스트, 포트 검증과 프록시 주소 처리 공유 |
| `playwright.config.js` | 반복된 기본 테스트 주소 생성 통합 |
| `scripts/dev.mjs` | 공통 개발 호스트 사용 |
| `scripts/verify.mjs` | 공통 클라이언트 주소 생성 사용 |
| `scripts/smoke-http.mjs` | 공통 기본 서버 주소와 PDF 경로 사용 |
| `scripts/import-pdf.mjs` | 원본·페이지·매니페스트 파일명과 출력 디렉터리 공유 |
| `scripts/render-source.mjs` | PDF 원본 경로 공유 |

새로 분리한 `WorkspaceModal`, `SegmentedTabs`, `useDatabaseConnection`, `useToast`, `src/lib/workspace.js`는 기존 동작을 그대로 옮기거나 중복 처리를 공유합니다. 백업 병합 시 같은 ID의 기존 항목을 우선하는 규칙과 순서, 준비 SQL의 줄바꿈, 식별자의 `]` 이스케이프도 유지했습니다.

## 그대로 유지한 고정값

- `shared/content/*`, `shared/practice-problems.mjs`, `database/seeds/*`: 문제 조건·정답·테이블·예제 값은 학습 콘텐츠입니다. SQL 문장과 시드 데이터는 수정하지 않았습니다.
- `shared/curriculum.mjs`, `shared/source-manifest.json`, `public/materials/*`: 교재 문항 번호, 해시, 원문과 페이지 연결을 유지했습니다.
- UI 문구, 아이콘 크기, 여백, 반응형 기준과 CSS 선택자·선언 순서: 기존 화면을 구성하는 값을 보존했습니다. 반복되는 색상만 같은 값의 변수로 교체했습니다.
- HTTP 상태 코드, T-SQL 문법·시스템 이름, 배포 인증·권한 조건: 외부 규약과 기존 동작을 유지했습니다.
- 테스트의 기대값과 전용 SQL 입력: 공통 상수의 값이 바뀌면 회귀를 발견할 수 있도록 명시적 기대값을 유지했습니다.
- `.env.example`, `Dockerfile`, `render.yaml`, 배포 템플릿과 실행 안내: 각 도구가 직접 읽는 설정 형식과 기존 기본값을 유지했습니다.

## 검증 결과

2026-11-17, Windows / Node.js 24 / 실제 SQL Server / Chrome 환경:

- `npm.cmd run verify` 통과: 단위 25개, SQL 통합 83개, SQL 회귀 5개, 포트 2개, HTTP 17개, 브라우저 33개. 빌드와 React 서버 렌더링 포함.
- `npm.cmd run format:check`와 `git diff --check` 통과.
- 수정 전후 동일한 데이터·문제 선택·화면 크기로 비교한 10개 스크린샷의 픽셀이 일치했습니다: 학생·직원·주문 실습, 학습 로드맵, PDF 문제집, 실행 기록, 시작 가이드, 저장·초기화 모달, 모바일 실습.
- 호환성 회귀 5개를 `tests/workspace.test.mjs`에 추가했습니다: 기존 백업·저장 키, 기록 병합과 개수 제한, SQL 문자열과 식별자 이스케이프, 포트·프록시 처리, 환경변수 기본값·범위 제한.

스크린샷과 비교 실행 파일은 Git에서 제외되는 `tmp/refactor-ui/`, `tmp/refactor-ui-check.mjs`에 있습니다.
