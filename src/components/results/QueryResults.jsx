import { resultsPageSize as pageSize } from "../../config/workbench";
import { useState, useEffect } from "react";
import {
  Table2,
  MessageSquare,
  Download,
  CheckCircle2,
  AlertCircle,
  Terminal,
  Clock3,
  Loader2,
} from "lucide-react";
import { downloadCsv, downloadJson } from "../../lib/export";
import { engineLabel } from "../../config/runtime";
export default function QueryResults({ result, running, canceling }) {
  const [tab, setTab] = useState("results"),
    [index, setIndex] = useState(0),
    [page, setPage] = useState(0);
  useEffect(() => {
    setIndex(0);
    setPage(0);
    setTab(result?.error ? "messages" : "results");
  }, [result]);
  const recordset = result?.recordsets?.[index];
  return (
    <section className="results-panel" aria-live="polite">
      <div className="results-toolbar">
        <div
          role="tablist"
          aria-label="쿼리 출력"
          onKeyDown={(event) => {
            if (
              ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
            ) {
              event.preventDefault();
              const next =
                event.key === "Home"
                  ? "results"
                  : event.key === "End"
                    ? "messages"
                    : tab === "results"
                      ? "messages"
                      : "results";
              setTab(next);
              event.currentTarget
                .querySelectorAll("button")
                [next === "results" ? 0 : 1].focus();
            }
          }}
        >
          <button
            role="tab"
            aria-selected={tab === "results"}
            id="query-results-tab"
            aria-controls="query-results-content"
            tabIndex={tab === "results" ? 0 : -1}
            className={tab === "results" ? "active" : ""}
            onClick={() => setTab("results")}
          >
            <Table2 size={14} />
            실행 결과{recordset && <span>{recordset.totalRows}</span>}
          </button>
          <button
            role="tab"
            aria-selected={tab === "messages"}
            id="query-messages-tab"
            aria-controls="query-messages-content"
            tabIndex={tab === "messages" ? 0 : -1}
            className={tab === "messages" ? "active" : ""}
            onClick={() => setTab("messages")}
          >
            <MessageSquare size={14} />
            메시지{result?.error && <i className="error-dot" />}
          </button>
        </div>
        <button
          className="text-button"
          disabled={!recordset}
          onClick={() => downloadCsv(recordset)}
          title={
            'NULL은 \\N, 빈 문자열은 ""로 내보냅니다. 원본 값은 JSON으로도 저장할 수 있습니다.'
          }
        >
          <Download size={13} />
          CSV
        </button>
        <button
          className="text-button"
          disabled={!recordset}
          onClick={() => downloadJson(recordset, "query-result.json")}
        >
          JSON
        </button>
      </div>
      {running ? (
        <div className="result-empty">
          <Loader2 className="spinning" size={26} />
          <strong>
            {canceling
              ? "실행을 취소하고 연결을 정리하고 있습니다"
              : `${engineLabel}에서 실행 중입니다`}
          </strong>
          <p>
            {canceling
              ? "열린 트랜잭션을 정리한 뒤 다시 실행할 수 있습니다."
              : "작성한 쿼리의 실제 결과를 가져오고 있어요."}
          </p>
        </div>
      ) : !result ? (
        <div className="result-empty">
          <span className="empty-terminal">
            <Terminal size={26} />
          </span>
          <strong>첫 번째 쿼리를 실행해 보세요</strong>
          <p>
            실행 버튼 또는 <kbd>Ctrl + Enter</kbd>를 누르면 결과가 여기에
            표시돼요.
          </p>
        </div>
      ) : tab === "messages" ? (
        <div
          className="message-output"
          id="query-messages-content"
          role="tabpanel"
          aria-labelledby="query-messages-tab"
        >
          {result.error && (
            <div className="query-error">
              <AlertCircle size={16} />
              <div>
                <strong>
                  쿼리를 실행하지 못했습니다
                  {result.error.number ? ` · Msg ${result.error.number}` : ""}
                </strong>
                <pre>{result.error.message}</pre>
                {result.error.line && (
                  <small>
                    {result.error.batch || 1}번 배치 내 {result.error.line}번째
                    줄
                  </small>
                )}
              </div>
            </div>
          )}
          {!result.error && (
            <p className="success-text">
              <CheckCircle2 size={15} />
              실행이 완료되었습니다.
            </p>
          )}
          {result.rowsAffected?.map((count, i) => (
            <p key={i}>({count}개 행에 영향을 주었습니다.)</p>
          ))}
          {result.messages?.map((message, i) => (
            <pre key={i}>{message}</pre>
          ))}
          <small>
            각 실행은 독립된 연결입니다. 명시적으로 COMMIT한 변경과 자동 커밋된
            변경은 DB에 저장됩니다.
          </small>
        </div>
      ) : (
        <div
          id="query-results-content"
          role="tabpanel"
          aria-labelledby="query-results-tab"
        >
          {result.recordsets.length > 1 && (
            <div className="recordset-tabs">
              {result.recordsets.map((set, i) => (
                <button
                  key={i}
                  className={i === index ? "active" : ""}
                  onClick={() => {
                    setIndex(i);
                    setPage(0);
                  }}
                >
                  결과 {i + 1} <span>{set.totalRows}</span>
                </button>
              ))}
            </div>
          )}
          {recordset ? (
            <>
              <div className="table-scroll">
                <table className="result-table">
                  <thead>
                    <tr>
                      <th className="row-number">#</th>
                      {recordset.columns.map((c, i) => (
                        <th key={i}>{c.name || "(열 이름 없음)"}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recordset.rows
                      .slice(page * pageSize, (page + 1) * pageSize)
                      .map((row, i) => (
                        <tr key={i}>
                          <td className="row-number">
                            {page * pageSize + i + 1}
                          </td>
                          {row.map((value, j) => (
                            <td
                              key={j}
                              className={
                                typeof value === "number" ? "numeric" : ""
                              }
                              title={value === null ? "NULL" : String(value)}
                            >
                              {value === null ? (
                                <span className="null-value">NULL</span>
                              ) : typeof value === "object" ? (
                                JSON.stringify(value)
                              ) : (
                                String(value)
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                  </tbody>
                </table>
                {recordset.totalRows === 0 && (
                  <div className="empty-rows">조건에 맞는 행이 없습니다.</div>
                )}
              </div>
              {recordset.rows.length > pageSize && (
                <div className="pagination">
                  <button
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    이전
                  </button>
                  <span>
                    {page + 1} / {Math.ceil(recordset.rows.length / pageSize)}
                  </span>
                  <button
                    disabled={(page + 1) * pageSize >= recordset.rows.length}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    다음
                  </button>
                </div>
              )}
              {recordset.truncated && (
                <p className="truncated-note">
                  전체 {recordset.totalRows.toLocaleString()}행 중{" "}
                  {recordset.rows.length.toLocaleString()}행을
                  표시·내보내기합니다.{" "}
                  {recordset.limitReason === "bytes"
                    ? "결과 용량 한도에 도달했습니다."
                    : "행 수 한도에 도달했습니다."}
                </p>
              )}
            </>
          ) : (
            <div className="result-empty">
              <CheckCircle2 size={26} />
              <strong>실행 완료</strong>
              <p>
                결과 테이블이 없는 명령입니다. 메시지에서 영향받은 행을
                확인하세요.
              </p>
            </div>
          )}
        </div>
      )}
      {result && !running && (
        <div className={`result-status ${result.error ? "has-error" : ""}`}>
          <span>
            {result.error ? (
              <AlertCircle size={12} />
            ) : (
              <CheckCircle2 size={12} />
            )}{" "}
            {result.error ? "오류 발생" : "정상 실행"}
            {recordset && ` · ${recordset.totalRows.toLocaleString()}개 행`}
          </span>
          <span>
            <Clock3 size={12} />
            {result.elapsedMs ?? 0} ms
          </span>
        </div>
      )}
    </section>
  );
}
