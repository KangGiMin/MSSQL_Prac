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
  CheckCircle2,
  Info,
  AlertTriangle,
  Terminal,
  BookOpen,
} from "lucide-react";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import Hero from "../components/common/Hero";
import MssqlConnectionNotice from "../components/learning/MssqlConnectionNotice";
import { apiConfigured, staticSite, engineLabel } from "../config/runtime";
import WorkspaceModal from "../components/workspace/WorkspaceModal";
import DatabaseCards from "../components/database/DatabaseCards";
import { practiceLabel } from "../components/database/labels";
import SchemaExplorer from "../components/database/SchemaExplorer";
const QueryEditor = lazy(() => import("../components/editor/QueryEditor"));
import QueryResults from "../components/results/QueryResults";
import LessonPanel from "../components/learning/LessonPanel";
import PracticeProblem from "../components/learning/PracticeProblem";
import LessonLibrary from "../components/learning/LessonLibrary";
import SourceReader from "../components/learning/SourceReader";
import HistoryList from "../components/history/HistoryList";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { useQueryRunner } from "../hooks/useQueryRunner";
import { api } from "../lib/api";
import { lessons, sourceCoverage } from "../../shared/curriculum.mjs";
import { databases, defaultDatabaseId } from "../../shared/databases.mjs";
import { pickPracticeProblem } from "../../shared/practice-problems.mjs";
import {
  readPracticeSession,
  savePracticeSession,
} from "../lib/practiceSession";
import {
  archiveDraft,
  readArchives,
  subscribeArchives,
  deleteArchive,
  clearArchives,
  workspaceBackup,
} from "../lib/storage";
import { downloadJson } from "../lib/export";

import {
  defaultQueries as defaults,
  storageKeys,
  workspaceLimits,
  sourceUrls,
} from "../../shared/workspace.mjs";
import { views } from "../config/navigation";
import { useToast } from "../hooks/useToast";
import { useDatabaseConnection } from "../hooks/useDatabaseConnection";
import {
  validateBackup,
  mergeRecords,
  lessonQuery,
  tablePreviewQuery,
} from "../lib/workspace";
export default function App() {
  const [view, setView] = useState("playground"),
    [mobileMenu, setMobileMenu] = useState(false);
  const [selected, setSelected] = useLocalStorage(
    storageKeys.database,
    defaultDatabaseId,
  );
  const database =
    databases.find((d) => d.id === selected) ||
    databases.find((d) => d.id === defaultDatabaseId);
  const [pageSession] = useState(readPracticeSession);
  const [practiceMode, setPracticeMode] = useState(true);
  const [practiceByDatabase, setPracticeByDatabase] = useState(() =>
    Object.fromEntries(
      databases.map((db) => [
        db.id,
        pickPracticeProblem(db.id, pageSession.problemIds[db.id]),
      ]),
    ),
  );
  const [storedQueries, setQueries, queryStorage] = useLocalStorage(
      storageKeys.queries,
      defaults,
    ),
    [history, setHistory, historyStorage] = useLocalStorage(
      storageKeys.history,
      [],
    ),
    [saved, setSaved, savedStorage] = useLocalStorage(storageKeys.saved, []),
    [completed, setCompleted, completedStorage] = useLocalStorage(
      storageKeys.completed,
      [],
    );
  const resetOnReload = pageSession.reload && pageSession.view === "playground";
  const [blankDatabases, setBlankDatabases] = useState(() => [
    ...new Set([
      ...pageSession.blankDatabases,
      ...(resetOnReload ? [database.id] : []),
    ]),
  ]);
  const initialRefreshDraft = useRef(
    resetOnReload && !pageSession.blankDatabases.includes(database.id)
      ? { database: database.id, previous: storedQueries[database.id] }
      : null,
  );
  // The blank editor belongs to this tab; other open tabs keep their drafts.
  const queries = {
    ...storedQueries,
    ...Object.fromEntries(blankDatabases.map((id) => [id, ""])),
  };
  useEffect(() => {
    savePracticeSession(view, practiceByDatabase, blankDatabases);
  }, [view, practiceByDatabase, blankDatabases]);
  const [lessonIds, setLessonIds] = useLocalStorage(
    storageKeys.lessons,
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
  const {
    health,
    refreshHealth,
    schema,
    schemaLoading,
    schemaError,
    refreshSchema,
  } = useDatabaseConnection(database.id);
  const [toast, notify] = useToast();
  const [modal, setModal] = useState(null),
    [resetting, setResetting] = useState(false),
    [page, setPage] = useState(1),
    [sourcePages, setSourcePages] = useState(sourceCoverage.pageCount),
    [pdfTab, setPdfTab] = useState("exercises");
  const [saveTitle, setSaveTitle] = useState("");
  const editorRef = useRef(null);
  const query =
    typeof queries[database.id] === "string"
      ? queries[database.id]
      : defaults[database.id];
  const updateQuery = (value) => {
    if (blankDatabases.includes(database.id))
      setBlankDatabases((current) =>
        current.filter((id) => id !== database.id),
      );
    setQueries((q) => ({ ...q, [database.id]: value }));
  };
  const refreshArchived = useRef(false);
  useEffect(() => {
    if (refreshArchived.current) return;
    refreshArchived.current = true;
    const refreshDraft = initialRefreshDraft.current;
    if (
      !refreshDraft ||
      !refreshDraft.previous?.trim() ||
      refreshDraft.previous === defaults[refreshDraft.database]
    )
      return;
    try {
      const title = "새로고침 전 자동 보관";
      if (
        !readArchives().some(
          (item) =>
            item.database === refreshDraft.database &&
            item.sql === refreshDraft.previous &&
            item.title === title,
        )
      )
        archiveDraft(refreshDraft.database, refreshDraft.previous, title);
    } catch {
      notify(
        "이전 SQL을 자동 보관하지 못했습니다. 기존 저장 내용은 유지됩니다.",
      );
    }
  }, [notify]);
  const closeMobileMenu = useCallback(() => setMobileMenu(false), []);
  useEffect(() => {
    let live = true;
    fetch(sourceUrls.pages)
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
    setHistory((items) => [item, ...items].slice(0, workspaceLimits.records));
    refreshSchema();
    refreshHealth();
  });
  const switchDatabase = (id) => {
    if (runner.running || resetting) return;
    setSelected(id);
    setPracticeMode(true);
    runner.clear();
  };
  const nextPracticeProblem = () => {
    if (runner.running || resetting) return;
    setPracticeByDatabase((current) => ({
      ...current,
      [database.id]: pickPracticeProblem(database.id, current[database.id]?.id),
    }));
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
    setBlankDatabases((current) =>
      current.filter((database) => database !== id),
    );
    runner.clear();
    return true;
  };
  const loadLesson = (item, withAnswer = false) => {
    if (runner.running || resetting) {
      notify("실행이 끝난 후 문제를 바꿀 수 있습니다.");
      return;
    }
    const sql = lessonQuery(item, withAnswer);
    if (!replaceQuery(item.database, sql)) return;
    setSelected(item.database);
    setLessonIds((current) => ({ ...current, [item.database]: item.id }));
    setPracticeMode(false);
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
    setPracticeMode(true);
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
      refreshSchema();
      notify(`${practiceLabel(database.id)} 데이터를 초기화했습니다.`);
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
      ].slice(0, workspaceLimits.records),
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
      refreshSchema();
      notify("실습 DB 준비를 완료했습니다. 기존 데이터는 유지했습니다.");
    } catch (error) {
      notify(error.message);
    } finally {
      setResetting(false);
    }
  }
  function exportWorkspace() {
    downloadJson(
      workspaceBackup({
        queries,
        history,
        saved,
        completed,
        lessonIds,
        archives,
      }),
      "queryground-backup.json",
    );
  }
  async function importWorkspace(file) {
    if (!file || runner.running || resetting) return;
    try {
      if (file.size > workspaceLimits.backupMegabytes * 1024 * 1024)
        throw new Error(
          `백업 파일은 ${workspaceLimits.backupMegabytes}MB 이하로 선택해 주세요.`,
        );
      const data = JSON.parse(await file.text());
      validateBackup(data);
      for (const db of databases)
        if (queries[db.id] !== data.queries[db.id])
          archiveDraft(db.id, queries[db.id], "백업 복원 전 자동 보관");
      for (const item of data.archives)
        if (
          databases.some((db) => db.id === item.database) &&
          typeof item.sql === "string"
        )
          archiveDraft(item.database, item.sql, item.title);
      setBlankDatabases([]);
      const results = await Promise.all([
        setQueries(data.queries),
        setHistory((items) => mergeRecords(data.history, items)),
        setSaved((items) => mergeRecords(data.saved, items)),
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
  async function clearList() {
    try {
      const success =
        modal === "clear-archives"
          ? (clearArchives(), true)
          : await (modal === "clear-history" ? setHistory([]) : setSaved([]));
      if (success) setModal(null);
      else
        notify("목록 변경을 저장하지 못했습니다. 백업 후 다시 시도해 주세요.");
    } catch {
      notify("목록을 지우지 못했습니다. 브라우저 저장소를 확인해 주세요.");
    }
  }
  return (
    <div className="app">
      <Sidebar
        view={view}
        onNavigate={(nextView) => {
          setView(nextView);
          if (nextView === "playground") setPracticeMode(true);
        }}
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
          {!apiConfigured && <MssqlConnectionNotice />}
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
                {health && !health.ok && !health.unconfigured && (
                  <div className="error-banner">
                    <AlertTriangle size={16} />
                    <div>
                      <strong>{engineLabel} 준비 상태를 확인해 주세요.</strong>
                      <p>
                        {health.error} 시작 가이드에서 설정 방법을 확인할 수
                        있습니다.
                      </p>
                    </div>
                    <button onClick={refreshHealth} disabled={resetting}>
                      다시 연결
                    </button>
                    {!staticSite && (
                      <button
                        onClick={prepareDatabases}
                        disabled={resetting || runner.running}
                      >
                        {resetting ? "준비 중…" : "DB 준비"}
                      </button>
                    )}
                  </div>
                )}
                {practiceMode && (
                  <PracticeProblem
                    problem={practiceByDatabase[database.id]}
                    onNext={nextPracticeProblem}
                    disabled={runner.running || resetting}
                  />
                )}
                <div
                  className={`workbench${practiceMode ? " practice-workbench" : ""}`}
                >
                  <SchemaExplorer
                    schema={schema}
                    loading={schemaLoading}
                    error={schemaError}
                    database={database}
                    onRefresh={() => refreshSchema()}
                    onInsert={(text) => editorRef.current?.insert(text)}
                    onPreview={(table) =>
                      replaceQuery(database.id, tablePreviewQuery(table))
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
                  {!practiceMode && (
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
                  )}
                </div>
                <div className="workbench-footnote">
                  <span>
                    <Info size={13} />
                    {!apiConfigured
                      ? "SQL은 실제 MSSQL Server에서 실행합니다. 서버 연결 전에는 실행·초기화가 비활성화됩니다."
                      : health?.publicWorkspace
                        ? "공용 실습 DB입니다. 수정·삭제·초기화는 다른 방문자에게도 반영됩니다. 작성한 SQL과 학습 기록은 이 브라우저에 저장됩니다."
                        : "실제 Microsoft SQL Server에서 실행합니다. 변경 사항은 DB에 반영되며, DB 초기화로 복원할 수 있어요."}
                  </span>
                </div>
              </section>
            </>
          ) : (
            <>
              <div className="page-heading">
                <h1>{views[view].label}</h1>
                <p>
                  {view === "pdf"
                    ? `${sourcePages}쪽의 원본 자료와 기출 문제를 한곳에.`
                    : views[view].description}
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
              QueryGround<span className="accent-text">.</span>{" "}
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
        <WorkspaceModal
          modal={modal}
          database={database}
          resetting={resetting}
          onClose={() => setModal(null)}
          resetDatabase={resetDatabase}
          saveQuery={saveQuery}
          saveTitle={saveTitle}
          setSaveTitle={setSaveTitle}
          onClear={clearList}
        />
      )}
    </div>
  );
}
