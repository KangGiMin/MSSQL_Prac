import { useEffect, useRef, useState, useCallback } from "react";
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
import QueryEditor from "../components/editor/QueryEditor";
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

const defaults = {
  company:
    "-- 사원 테이블에서 첫 번째 데이터를 만나 보세요.\nSELECT *\nFROM dbo.EMP;\n",
  store:
    "-- 온라인 스토어의 상품을 살펴보세요.\nSELECT *\nFROM dbo.Products;\n",
  campus:
    "-- 나의 첫 번째 SQL 쿼리\n-- 실행 버튼 또는 Ctrl + Enter를 눌러 보세요.\n\nSELECT *\nFROM dbo.exam;\n",
};
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
    "내 쿼리의 발자취",
    "실행했던 쿼리를 돌아보고, 나만의 쿼리를 모아 보세요.",
  ],
};
export default function App() {
  const [view, setView] = useState("playground"),
    [mobileMenu, setMobileMenu] = useState(false),
    [health, setHealth] = useState(null);
  const [selected, setSelected] = useLocalStorage("qg.database", "campus");
  const database = databases.find((d) => d.id === selected) || databases[2];
  const [queries, setQueries] = useLocalStorage("qg.queries", defaults),
    [history, setHistory] = useLocalStorage("qg.history", []),
    [saved, setSaved] = useLocalStorage("qg.saved", []),
    [completed, setCompleted] = useLocalStorage("qg.completed", []);
  const [schema, setSchema] = useState([]),
    [schemaLoading, setSchemaLoading] = useState(true),
    [schemaError, setSchemaError] = useState(""),
    [schemaRevision, setSchemaRevision] = useState(0);
  const [lesson, setLesson] = useState(lessons.find((l) => l.id === "pdf-1")),
    [modal, setModal] = useState(null),
    [resetting, setResetting] = useState(false),
    [toast, setToast] = useState(""),
    [page, setPage] = useState(1),
    [pdfTab, setPdfTab] = useState("exercises");
  const [saveTitle, setSaveTitle] = useState("");
  const editorRef = useRef(null),
    toastTimer = useRef(null);
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
  const refreshHealth = useCallback(
    () =>
      api
        .health()
        .then(setHealth)
        .catch((error) => setHealth({ ok: false, error: error.message })),
    [],
  );
  useEffect(() => {
    refreshHealth();
    const timer = setInterval(refreshHealth, 30000);
    return () => clearInterval(timer);
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
  }, [database.id, schemaRevision]);
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
  const loadLesson = (item, withAnswer = false) => {
    if (runner.running || resetting) {
      notify("실행이 끝난 후 문제를 바꿀 수 있습니다.");
      return;
    }
    setSelected(item.database);
    setLesson(item);
    setView("playground");
    runner.clear();
    setQueries((q) => ({
      ...q,
      [item.database]: withAnswer
        ? `-- ${item.title}\n${item.setup ? `-- 선행 실습 준비\n${item.setup}` : ""}${item.answer}`
        : `-- ${item.title}\n-- ${item.explanation}\n\n-- 여기에 SQL을 작성해 보세요.\n`,
    }));
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
    setSelected(item.database);
    setQueries((q) => ({ ...q, [item.database]: item.sql }));
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
  function saveQuery() {
    if (!query.trim()) {
      notify("저장할 SQL을 입력해 주세요.");
      return;
    }
    setSaved((items) =>
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
    setModal(null);
    notify("쿼리를 저장했습니다. 실행 기록 → 저장한 쿼리에서 확인하세요.");
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
        open={mobileMenu}
        onClose={() => setMobileMenu(false)}
      />
      <div className="app-body">
        <Header
          view={view}
          health={health}
          onMenu={() => setMobileMenu(true)}
          onHelp={() => setModal("help")}
        />
        <main className="main-content">
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
                    SQL 워크벤치 <span className="live-label">LIVE</span>
                  </h2>
                  <span>작은 시도에서 시작하는 확실한 실력</span>
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
                    <button onClick={refreshHealth}>다시 연결</button>
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
                      updateQuery(
                        `SELECT TOP (100) *\nFROM [${table.schema.replaceAll("]", "]]")}].[${table.name.replaceAll("]", "]]")}];`,
                      )
                    }
                    disabled={runner.running || resetting}
                  />
                  <div className="query-workspace">
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
                      resetting={resetting}
                      connected={!!health?.ok}
                      schema={schema}
                      editorRef={editorRef}
                    />
                    <QueryResults
                      result={runner.result}
                      running={runner.running}
                    />
                  </div>
                  <LessonPanel
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
                  <span>
                    Built for curiosity <span className="purple-text">✦</span>
                  </span>
                </div>
              </section>
            </>
          ) : (
            <>
              <div className="page-heading">
                <div className="eyebrow">
                  <span className="tiny-dot" />
                  LEARN BY DOING
                </div>
                <h1>{headings[view][0]}</h1>
                <p>{headings[view][1]}</p>
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
                      원본 전체 보기 <span>90쪽</span>
                    </button>
                  </div>
                  {pdfTab === "source" ? (
                    <SourceReader page={page} onPage={setPage} />
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
                  onLoad={restoreQuery}
                  onDelete={(id) =>
                    setSaved((items) => items.filter((x) => x.id !== id))
                  }
                  onClear={(tab) =>
                    setModal(
                      tab === "history" ? "clear-history" : "clear-saved",
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
            <span>Write a query. Discover something.</span>
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
                사용자 정의 스키마·타입 등 일부 고급 객체는 남을 수 있습니다.
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
                {modal === "clear-history" ? "실행 기록" : "저장한 쿼리"} 목록을
                이 브라우저에서 삭제합니다. 데이터베이스의 데이터는 유지됩니다.
              </p>
              <div className="modal-actions">
                <button onClick={() => setModal(null)}>취소</button>
                <button
                  className="primary-button"
                  onClick={() => {
                    modal === "clear-history" ? setHistory([]) : setSaved([]);
                    setModal(null);
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
                <pre>
                  npm.cmd install{"\n"}npm.cmd run db:setup{"\n"}npm.cmd run dev
                </pre>
                <p>
                  기본 주소는 http://localhost:5173입니다. 연결 변경은
                  .env.example을 .env로 복사한 뒤 SQL_SERVER와 인증 방식을
                  수정하세요.
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
