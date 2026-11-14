import {
  useEffect,
  useRef,
  useState,
  useCallback,
  lazy,
  Suspense,
} from "react";
import {
  Code2,
  ArrowUpRight,
  Database,
  CheckCircle2,
  Info,
  AlertTriangle,
  Loader2,
  Terminal,
  BookOpen,
} from "lucide-react";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import Hero from "../components/common/Hero";
import Modal from "../components/common/Modal";
import DatabaseCards from "../components/database/DatabaseCards";
import SchemaExplorer from "../components/database/SchemaExplorer";
const QueryEditor = lazy(() => import("../components/editor/QueryEditor"));
import QueryResults from "../components/results/QueryResults";
import LessonPanel from "../components/learning/LessonPanel";
import LessonLibrary from "../components/learning/LessonLibrary";
import SourceReader from "../components/learning/SourceReader";
import HistoryList from "../components/history/HistoryList";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useQueryRunner } from "../hooks/useQueryRunner";
import { api } from "../lib/api";
import { lessons, sourceCoverage } from "../../shared/curriculum.mjs";
import { databases } from "../../shared/databases.mjs";
import {
  archiveDraft,
  readArchives,
  subscribeArchives,
  deleteArchive,
  clearArchives,
  workspaceBackup,
} from "../lib/storage";
import { downloadText } from "../lib/export";

import { defaultQueries as defaults } from "../../shared/workspace.mjs";
const headings = {
  learn: [
    "학습 로드맵",
    "기본 개념부터 확장 실습까지, 나만의 속도로 배워 보세요.",
  ],
  pdf: [
    "PDF 문제집",
    "90쪽의 원본 자료와 실제로 실행할 수 있는 기출 문제를 한곳에.",
  ],
  history: [
    "실행 기록",
    "실행한 SQL, 저장한 쿼리와 자동 보관 내용을 확인하세요.",
  ],
};
export default function App() {
  const [view, setView] = useState("playground"),
    [mobileMenu, setMobileMenu] = useState(false),
    [health, setHealth] = useState(null);
  const [selected, setSelected] = useLocalStorage("qg.database", "campus");
  const database = databases.find((d) => d.id === selected) || databases[2];
  const [queries, setQueries, queryStorage] = useLocalStorage(
      "qg.queries",
      defaults,
    ),
    [history, setHistory, historyStorage] = useLocalStorage("qg.history", []),
    [saved, setSaved, savedStorage] = useLocalStorage("qg.saved", []),
    [completed, setCompleted, completedStorage] = useLocalStorage(
      "qg.completed",
      [],
    );
  const [lessonIds, setLessonIds] = useLocalStorage(
    "qg.lessons",
    Object.fromEntries(
      databases.map((db) => [
        db.id,
        lessons.find((item) => item.database === db.id).id,
      ]),
    ),
  );
  const lesson =
    lessons.find(
      (item) =>
        item.id === lessonIds[database.id] && item.database === database.id,
    ) || lessons.find((item) => item.database === database.id);
  const [archives, setArchives] = useState(readArchives);
  useEffect(() => subscribeArchives(() => setArchives(readArchives())), []);
  const storageProblem = [
    queryStorage,
    savedStorage,
    historyStorage,
    completedStorage,
  ].find((item) => ["error", "recovered"].includes(item.status));
  const [schema, setSchema] = useState([]),
    [schemaLoading, setSchemaLoading] = useState(true),
    [schemaError, setSchemaError] = useState(""),
    [schemaRevision, setSchemaRevision] = useState(0);
  const [modal, setModal] = useState(null),
    [resetting, setResetting] = useState(false),
    [toast, setToast] = useState(""),
    [page, setPage] = useState(1),
    [sourcePages, setSourcePages] = useState(sourceCoverage.pageCount),
    [pdfTab, setPdfTab] = useState("exercises");
  const [saveTitle, setSaveTitle] = useState("");
  const editorRef = useRef(null),
    toastTimer = useRef(null),
    healthGeneration = useRef(0);
  const query =
    typeof queries[database.id] === "string"
      ? queries[database.id]
      : defaults[database.id];
  const updateQuery = (value) =>
    setQueries((q) => ({ ...q, [database.id]: value }));
  const notify = useCallback((message) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3500);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);
  const closeMobileMenu = useCallback(() => setMobileMenu(false), []);
  const refreshHealth = useCallback(async () => {
    const generation = ++healthGeneration.current;
    try {
      const data = await api.health(database.id);
      if (generation === healthGeneration.current) setHealth(data);
    } catch (error) {
      if (generation === healthGeneration.current)
        setHealth({ ...error.body, ok: false, error: error.message });
    }
  }, [database.id]);
  useEffect(() => {
    setHealth(null);
    refreshHealth();
    const timer = setInterval(refreshHealth, 30000);
    return () => {
      clearInterval(timer);
      healthGeneration.current++;
    };
  }, [refreshHealth]);
  useEffect(() => {
    let live = true;
    setSchemaLoading(true);
    setSchemaError("");
    setSchema([]);
    api
      .schema(database.id)
      .then((data) => {
        if (live) setSchema(data);
      })
      .catch((error) => {
        if (live) setSchemaError(error.message);
      })
      .finally(() => {
        if (live) setSchemaLoading(false);
      });
    return () => {
      live = false;
    };
  }, [database.id, schemaRevision, health?.ok]);
  useEffect(() => {
    let live = true;
    fetch("/materials/pages.json")
      .then((response) => response.json())
      .then((pages) => {
        if (live && Array.isArray(pages) && pages.length)
          setSourcePages(pages.length);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  const runner = useQueryRunner((item) => {
    setHistory((items) => [item, ...items].slice(0, 100));
    setSchemaRevision((x) => x + 1);
    refreshHealth();
  });
  const switchDatabase = (id) => {
    if (runner.running || resetting) return;
    setSelected(id);
    runner.clear();
  };
  const replaceQuery = (id, sql) => {
    const previous = queries[id] || "";
    if (previous !== sql && previous !== defaults[id] && previous.trim()) {
      try {
        archiveDraft(id, previous);
      } catch {
        notify(
          "기존 SQL을 보관하지 못해 교체하지 않았습니다. 백업 후 저장 공간을 확인해 주세요.",
        );
        return false;
      }
    }
    setQueries((current) => ({ ...current, [id]: sql }));
    runner.clear();
    return true;
  };
  const loadLesson = (item, withAnswer = false) => {
    if (runner.running || resetting) {
      notify("실행이 끝난 후 문제를 바꿀 수 있습니다.");
      return;
    }
    const sql = withAnswer
      ? `-- ${item.title}\n${item.setup ? `-- 선행 실습 준비\n${item.setup}` : ""}${item.answer}`
      : `-- ${item.title}\n-- ${item.explanation}\n\n${item.setup ? `-- 선행 실습 준비\n${item.setup}\n` : ""}-- 여기에 SQL을 작성해 보세요.\n`;
    if (!replaceQuery(item.database, sql)) return;
    setSelected(item.database);
    setLessonIds((current) => ({ ...current, [item.database]: item.id }));
    setView("playground");
    runner.clear();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const openSource = (page) => {
    setPage(page);
    setPdfTab("source");
    setView("pdf");
  };
  const restoreQuery = (item) => {
    if (runner.running || resetting) {
      notify("실행이 끝난 후 쿼리를 열어 주세요.");
      return;
    }
    if (!replaceQuery(item.database, item.sql)) return;
    setSelected(item.database);
    setView("playground");
    runner.clear();
  };
  const toggleComplete = (id) =>
    setCompleted((items) =>
      items.includes(id) ? items.filter((x) => x !== id) : [...items, id],
    );
  async function resetDatabase() {
    setResetting(true);
    try {
      await api.reset(database.id);
      runner.clear();
      setSchemaRevision((x) => x + 1);
      notify(`${database.label} 데이터베이스를 초기화했습니다.`);
      setModal(null);
      refreshHealth();
    } catch (e) {
      notify(e.message);
    } finally {
      setResetting(false);
    }
  }
  async function saveQuery() {
    if (!query.trim()) {
      notify("저장할 SQL을 입력해 주세요.");
      return;
    }
    const success = await setSaved((items) =>
      [
        {
          id: crypto.randomUUID(),
          title: saveTitle.trim() || "나의 SQL 쿼리",
          database: database.id,
          sql: query,
          time: new Date().toISOString(),
        },
        ...items,
      ].slice(0, 100),
    );
    if (success) {
      setModal(null);
      notify("쿼리를 저장했습니다. 실행 기록 → 저장한 쿼리에서 확인하세요.");
    } else
      notify("쿼리를 저장하지 못했습니다. 백업 후 저장 공간을 확인해 주세요.");
  }
  async function prepareDatabases() {
    if (runner.running || resetting) return;
    setResetting(true);
    try {
      await api.setup();
      await refreshHealth();
      setSchemaRevision((x) => x + 1);
      notify("실습 DB 준비를 완료했습니다. 기존 데이터는 유지했습니다.");
    } catch (error) {
      notify(error.message);
    } finally {
      setResetting(false);
    }
  }
  function exportWorkspace() {
    downloadText(
      JSON.stringify(
        workspaceBackup({
          queries,
          history,
          saved,
          completed,
          lessonIds,
          archives,
        }),
        null,
        2,
      ),
      "queryground-backup.json",
      "application/json",
    );
  }
  async function importWorkspace(file) {
    if (!file || runner.running || resetting) return;
    try {
      if (file.size > 20 * 1024 * 1024)
        throw new Error("백업 파일은 20MB 이하로 선택해 주세요.");
      const data = JSON.parse(await file.text());
      if (
        data.version !== 1 ||
        !data.queries ||
        databases.some((db) => typeof data.queries[db.id] !== "string") ||
        !["history", "saved", "completed", "archives"].every((key) =>
          Array.isArray(data[key]),
        )
      )
        throw new Error("올바른 QueryGround 백업 파일이 아닙니다.");
      for (const db of databases)
        if (queries[db.id] !== data.queries[db.id])
          archiveDraft(db.id, queries[db.id], "백업 복원 전 자동 보관");
      for (const item of data.archives)
        if (
          databases.some((db) => db.id === item.database) &&
          typeof item.sql === "string"
        )
          archiveDraft(item.database, item.sql, item.title);
      const results = await Promise.all([
        setQueries(data.queries),
        setHistory((items) =>
          [
            ...new Map(
              [...data.history, ...items]
                .filter((item) => item?.id)
                .map((item) => [item.id, item]),
            ).values(),
          ].slice(0, 100),
        ),
        setSaved((items) =>
          [
            ...new Map(
              [...data.saved, ...items]
                .filter((item) => item?.id)
                .map((item) => [item.id, item]),
            ).values(),
          ].slice(0, 100),
        ),
        setCompleted((items) => [...new Set([...items, ...data.completed])]),
        ...(data.lessonIds ? [setLessonIds(data.lessonIds)] : []),
      ]);
      notify(
        results.every(Boolean)
          ? "백업을 복원했습니다. 이전 SQL은 자동 보관에 남겼습니다."
          : "일부 항목을 저장하지 못했습니다. 백업 파일을 보관하고 저장 공간을 확인하세요.",
      );
    } catch (error) {
      notify(error.message);
    }
  }
  return (
    <div className="app">
      <Sidebar
        view={view}
        onNavigate={setView}
        completed={
          completed.filter((id) => lessons.some((l) => l.id === id)).length
        }
        total={lessons.length}
        pageCount={sourcePages}
        open={mobileMenu}
        onClose={closeMobileMenu}
      />
      <div className="app-body">
        <Header
          view={view}
          health={health}
          onMenu={() => setMobileMenu(true)}
          menuOpen={mobileMenu}
          onHelp={() => setModal("help")}
        />
        <main className="main-content">
          {storageProblem && (
            <div className="error-banner" role="alert">
              <AlertTriangle size={16} />
              <p>{storageProblem.message}</p>
              <button
                onClick={async () =>
                  notify(
                    (await storageProblem.retry())
                      ? "다시 저장했습니다."
                      : "저장하지 못했습니다. 지금 백업해 주세요.",
                  )
                }
              >
                다시 저장
              </button>
              <button onClick={exportWorkspace}>지금 백업</button>
            </div>
          )}
          {view === "playground" ? (
            <>
              <Hero onLearn={() => setView("learn")} />
              <DatabaseCards
                databases={databases}
                selected={database.id}
                onSelect={switchDatabase}
                disabled={runner.running || resetting}
              />
              <section className="workbench-section">
                <div className="section-heading workbench-heading">
                  <h2>
                    <Terminal size={17} />
                    SQL 워크벤치
                  </h2>
                  <span>작성 → 실행 → 결과 확인</span>
                </div>
                {health && !health.ok && (
                  <div className="error-banner">
                    <AlertTriangle size={16} />
                    <div>
                      <strong>SQL Server 연결을 확인해 주세요.</strong>
                      <p>
                        {health.error} 시작 가이드에서 설정 방법을 확인할 수
                        있습니다.
                      </p>
                    </div>
                    <button onClick={refreshHealth} disabled={resetting}>
                      다시 연결
                    </button>
                    <button
                      onClick={prepareDatabases}
                      disabled={resetting || runner.running}
                    >
                      {resetting ? "준비 중…" : "DB 준비"}
                    </button>
                  </div>
                )}
                <div className="workbench">
                  <SchemaExplorer
                    schema={schema}
                    loading={schemaLoading}
                    error={schemaError}
                    database={database}
                    onRefresh={() => setSchemaRevision((x) => x + 1)}
                    onInsert={(text) => editorRef.current?.insert(text)}
                    onPreview={(table) =>
                      replaceQuery(
                        database.id,
                        `SELECT TOP (100) *\nFROM [${table.schema.replaceAll("]", "]]")}].[${table.name.replaceAll("]", "]]")}];`,
                      )
                    }
                    disabled={runner.running || resetting}
                  />
                  <div className="query-workspace">
                    <Suspense
                      fallback={
                        <div
                          className="result-empty"
                          aria-label="SQL 쿼리 편집기"
                        >
                          편집기를 불러오는 중입니다…
                        </div>
                      }
                    >
                      <QueryEditor
                        value={query}
                        onChange={updateQuery}
                        onRun={(selection) =>
                          runner.run(database.id, selection || query)
                        }
                        onCancel={runner.cancel}
                        onSave={() => {
                          setSaveTitle("");
                          setModal("save");
                        }}
                        onReset={() => setModal("reset")}
                        running={runner.running}
                        canceling={runner.canceling}
                        resetting={resetting}
                        connected={!!health?.ok}
                        schema={schema}
                        editorRef={editorRef}
                        storageStatus={queryStorage.status}
                      />
                    </Suspense>
                    <QueryResults
                      result={runner.result}
                      running={runner.running}
                      canceling={runner.canceling}
                    />
                  </div>
                  <LessonPanel
                    sourceMatches={sourceCoverage.matchesSource}
                    lesson={lesson}
                    onLoad={loadLesson}
                    onSource={openSource}
                    completed={completed.includes(lesson.id)}
                    onComplete={toggleComplete}
                    onBrowse={() => setView("learn")}
                    disabled={runner.running || resetting}
                  />
                </div>
                <div className="workbench-footnote">
                  <span>
                    <Info size={13} />
                    실제 Microsoft SQL Server에서 실행합니다. 변경 사항은 DB에
                    반영되며, DB 초기화로 복원할 수 있어요.
                  </span>
                </div>
              </section>
            </>
          ) : (
            <>
              <div className="page-heading">
                <h1>{headings[view][0]}</h1>
                <p>
                  {view === "pdf"
                    ? `${sourcePages}쪽의 원본 자료와 기출 문제를 한곳에.`
                    : headings[view][1]}
                </p>
                {!sourceCoverage.matchesSource &&
                  ["learn", "pdf"].includes(view) && (
                    <p className="error-banner">
                      원본 PDF가 교체되었습니다. 현재 학습 문제와 페이지 대응은
                      이전 교재 기준입니다. 새 PDF에 맞게 학습 콘텐츠를 갱신해
                      주세요.
                    </p>
                  )}
              </div>
              {view === "learn" && (
                <LessonLibrary
                  key="learn"
                  lessons={lessons}
                  completed={completed}
                  onChoose={(item) => loadLesson(item)}
                  coverage={sourceCoverage}
                />
              )}{" "}
              {view === "pdf" && (
                <>
                  <div className="pdf-tabs">
                    <button
                      className={pdfTab === "exercises" ? "active" : ""}
                      onClick={() => setPdfTab("exercises")}
                    >
                      <Code2 size={16} />
                      기출 문제 실습 <span>{sourceCoverage.exercises}</span>
                    </button>
                    <button
                      className={pdfTab === "source" ? "active" : ""}
                      onClick={() => setPdfTab("source")}
                    >
                      <BookOpen size={16} />
                      원본 전체 보기 <span>{sourcePages}쪽</span>
                    </button>
                  </div>
                  {pdfTab === "source" ? (
                    <SourceReader
                      page={page}
                      onPage={setPage}
                      pageCount={sourcePages}
                    />
                  ) : (
                    <LessonLibrary
                      key="pdf"
                      lessons={lessons}
                      kind="exercise"
                      completed={completed}
                      onChoose={(item) => loadLesson(item)}
                      coverage={sourceCoverage}
                    />
                  )}
                </>
              )}
              {view === "history" && (
                <HistoryList
                  history={history}
                  saved={saved}
                  archives={archives}
                  onExport={exportWorkspace}
                  onImport={importWorkspace}
                  onLoad={restoreQuery}
                  onDelete={(id) =>
                    setSaved((items) => items.filter((x) => x.id !== id))
                  }
                  onDeleteArchive={(id) => {
                    try {
                      deleteArchive(id);
                    } catch {
                      notify("자동 보관 항목을 삭제하지 못했습니다.");
                    }
                  }}
                  onClear={(tab) =>
                    setModal(
                      tab === "history"
                        ? "clear-history"
                        : tab === "archives"
                          ? "clear-archives"
                          : "clear-saved",
                    )
                  }
                />
              )}
            </>
          )}
          <footer className="main-footer">
            <span>
              QueryGround<span className="purple-text">.</span>{" "}
              <span>나만의 SQL 실습실</span>
            </span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={17} />
          {toast}
        </div>
      )}
      {modal && (
        <Modal
          title={
            modal === "reset"
              ? "데이터베이스를 초기화할까요?"
              : modal === "save"
                ? "나의 쿼리 저장"
                : modal.startsWith("clear")
                  ? "목록을 비울까요?"
                  : "QueryGround 시작 가이드"
          }
          onClose={() => setModal(null)}
          locked={resetting}
        >
          {modal === "reset" ? (
            <>
              <div className="modal-db">
                <Database size={22} />
                <div>
                  {database.label}
                  <small>{database.name}</small>
                </div>
              </div>
              <p>
                선택한 실습 DB의 테이블과 실습 중 만든 객체를 초기화하고 기본
                데이터를 다시 채웁니다. 현재 변경 사항은 사라집니다.
              </p>
              <p className="muted">
                다른 DB와 브라우저에 저장한 쿼리·실행 기록은 유지됩니다. 단,
                사용자 정의 스키마·타입과 시간 테이블도 정리합니다. 지원 범위를
                벗어나는 객체의 의존성이 있으면 전체 초기화를 롤백하고 오류를
                표시합니다.
              </p>
              <div className="modal-actions">
                <button disabled={resetting} onClick={() => setModal(null)}>
                  취소
                </button>
                <button
                  className="primary-button"
                  disabled={resetting}
                  onClick={resetDatabase}
                >
                  {resetting && <Loader2 size={14} className="spinning" />}
                  {resetting ? "초기화 중..." : "이 DB 초기화"}
                </button>
              </div>
            </>
          ) : modal === "save" ? (
            <>
              <label className="input-label">
                쿼리 이름
                <input
                  autoFocus
                  value={saveTitle}
                  maxLength={80}
                  placeholder="예: 부서별 평균 급여 조회"
                  onChange={(e) => setSaveTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveQuery();
                  }}
                />
              </label>
              <p className="muted">
                SQL과 선택된 데이터베이스를 이 브라우저에 저장합니다.
              </p>
              <div className="modal-actions">
                <button onClick={() => setModal(null)}>취소</button>
                <button className="primary-button" onClick={saveQuery}>
                  저장하기
                </button>
              </div>
            </>
          ) : modal.startsWith("clear") ? (
            <>
              <p>
                {modal === "clear-history"
                  ? "실행 기록"
                  : modal === "clear-archives"
                    ? "자동 보관"
                    : "저장한 쿼리"}{" "}
                목록을 이 브라우저에서 삭제합니다. 데이터베이스의 데이터는
                유지됩니다.
              </p>
              <div className="modal-actions">
                <button onClick={() => setModal(null)}>취소</button>
                <button
                  className="primary-button"
                  onClick={async () => {
                    try {
                      const success =
                        modal === "clear-archives"
                          ? (clearArchives(), true)
                          : await (modal === "clear-history"
                              ? setHistory([])
                              : setSaved([]));
                      if (success) setModal(null);
                      else
                        notify(
                          "목록 변경을 저장하지 못했습니다. 백업 후 다시 시도해 주세요.",
                        );
                    } catch {
                      notify(
                        "목록을 지우지 못했습니다. 브라우저 저장소를 확인해 주세요.",
                      );
                    }
                  }}
                >
                  목록 비우기
                </button>
              </div>
            </>
          ) : (
            <div className="help-content">
              <p>React와 실제 SQL Server가 연결된 개인용 실습실입니다.</p>
              <ol>
                <li>
                  <strong>DB 선택</strong>
                  <span>회사·스토어·캠퍼스 중 데이터를 고르세요.</span>
                </li>
                <li>
                  <strong>쿼리 작성과 실행</strong>
                  <span>
                    탐색기의 테이블을 조회하거나 SQL을 직접 입력하고 Ctrl +
                    Enter를 누르세요. 선택한 SQL만 실행할 수도 있습니다.
                  </span>
                </li>
                <li>
                  <strong>문제 풀고 복습</strong>
                  <span>
                    학습 로드맵과 PDF 문제집에서 문제·설명·정답·주의사항을
                    확인하고 스스로 완료 체크를 해보세요.
                  </span>
                </li>
              </ol>
              <div className="help-setup">
                <strong>로컬 서버 시작</strong>
                <pre>npm.cmd ci{"\n"}npm.cmd run dev</pre>
                <p>
                  기본 주소는 http://127.0.0.1:5173입니다. Live Server(5500)
                  대신 이 주소를 사용하세요. 연결 변경은 .env.example을 .env로
                  복사한 뒤 SQL_SERVER와 인증 방식을 수정하세요.
                </p>
              </div>
              <p className="muted">
                각 실행은 독립 연결입니다. BEGIN TRAN과 COMMIT/ROLLBACK은 한
                번에 실행하세요. 서버 관리 명령과 다른 DB 접근은 제한됩니다.
                현재 브라우저에 진행도·쿼리·최대 100개 기록을 저장합니다.
              </p>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
