import { useState, useRef } from "react";
import {
  History,
  Bookmark,
  Play,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock3,
} from "lucide-react";
export default function HistoryList({
  history,
  saved,
  archives = [],
  onExport,
  onImport,
  onDeleteArchive,
  onLoad,
  onDelete,
  onClear,
}) {
  const [tab, setTab] = useState("history");
  const data = tab === "history" ? history : tab === "saved" ? saved : archives;
  const input = useRef(null);
  return (
    <section className="history-page">
      <div className="library-controls">
        <div className="segmented">
          <button
            className={tab === "history" ? "active" : ""}
            onClick={() => setTab("history")}
          >
            <History size={15} />
            실행 기록 {history.length}
          </button>
          <button
            className={tab === "saved" ? "active" : ""}
            onClick={() => setTab("saved")}
          >
            <Bookmark size={15} />
            저장한 쿼리 {saved.length}
          </button>
          <button
            className={tab === "archives" ? "active" : ""}
            onClick={() => setTab("archives")}
          >
            자동 보관 {archives.length}
          </button>
        </div>
        <div className="backup-actions">
          <button className="text-button" onClick={onExport}>
            전체 백업
          </button>
          <button
            className="text-button"
            onClick={() => input.current?.click()}
          >
            백업 복원
          </button>
          <input
            ref={input}
            type="file"
            accept="application/json,.json"
            hidden
            aria-label="백업 파일 선택"
            onChange={(event) => {
              onImport?.(event.target.files[0]);
              event.target.value = "";
            }}
          />
        </div>
        <button
          className="text-button"
          disabled={!data.length}
          onClick={() => onClear(tab)}
        >
          <Trash2 size={14} />
          목록 비우기
        </button>
      </div>
      <p className="history-note">
        기록은 이 브라우저에 저장됩니다. 자동 보관에서 이전 SQL을 복구하거나
        전체 백업으로 따로 보관할 수 있습니다.
      </p>
      {!data.length ? (
        <div className="result-empty">
          <History size={28} />
          <strong>
            {tab === "history"
              ? "아직 실행 기록이 없습니다"
              : tab === "archives"
                ? "자동 보관한 SQL이 없습니다"
                : "저장한 쿼리가 없습니다"}
          </strong>
          <p>실습실에서 쿼리를 실행하거나 저장해 보세요.</p>
        </div>
      ) : (
        <div className="history-list">
          {data.map((item) => (
            <article key={item.id}>
              <div className="history-item-heading">
                <span className={`history-status ${item.error ? "error" : ""}`}>
                  {tab !== "history" ? (
                    <Bookmark size={15} />
                  ) : item.error ? (
                    <AlertCircle size={15} />
                  ) : (
                    <CheckCircle2 size={15} />
                  )}{" "}
                  {item.title ||
                    {
                      company: "회사 · 인사",
                      store: "온라인 스토어",
                      campus: "캠퍼스",
                    }[item.database]}
                </span>
                <time>{new Date(item.time).toLocaleString("ko-KR")}</time>
              </div>
              <pre>{item.sql}</pre>
              <footer>
                {item.error ? (
                  <span className="history-error">{item.error}</span>
                ) : (
                  <span>
                    <Clock3 size={12} />
                    {item.elapsedMs ?? "—"} ms · {item.rows ?? "—"}행
                  </span>
                )}
                <div>
                  {tab !== "history" && (
                    <button
                      className="text-button"
                      aria-label="저장한 쿼리 삭제"
                      onClick={() =>
                        tab === "archives"
                          ? onDeleteArchive(item.id)
                          : onDelete(item.id)
                      }
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                  <button className="load-query" onClick={() => onLoad(item)}>
                    <Play size={12} />
                    편집기에서 열기
                  </button>
                </div>
              </footer>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
