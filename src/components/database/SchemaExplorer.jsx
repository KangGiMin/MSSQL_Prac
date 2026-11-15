import { useState } from "react";
import { practiceLabel } from "./labels";
import {
  ChevronRight,
  ChevronDown,
  Table2,
  KeyRound,
  Link2,
  RefreshCw,
  Search,
  Database,
  ArrowDownToLine,
} from "lucide-react";
export default function SchemaExplorer({
  schema,
  loading,
  error,
  database,
  onRefresh,
  onInsert,
  onPreview,
  disabled,
}) {
  const [expanded, setExpanded] = useState({
      "dbo.exam": true,
      "dbo.EMP": true,
    }),
    [search, setSearch] = useState("");
  return (
    <section className="schema-panel">
      <div className="panel-title">
        <span>탐색기</span>
        <button
          className="icon-button"
          title="스키마 새로고침"
          aria-label="스키마 새로고침"
          onClick={onRefresh}
          disabled={loading || disabled}
        >
          <RefreshCw size={14} className={loading ? "spinning" : ""} />
        </button>
      </div>
      <div className="schema-search">
        <Search size={13} />
        <input
          aria-label="테이블 검색"
          placeholder="테이블 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="schema-db" title={database?.name}>
        <Database size={14} />
        {database && practiceLabel(database.id)}
        <span>스키마</span>
      </div>
      <div className="schema-tree">
        {loading ? (
          <p className="small-empty">스키마 불러오는 중...</p>
        ) : error ? (
          <p className="schema-error">{error}</p>
        ) : (
          schema
            .filter((t) =>
              `${t.schema}.${t.name}`
                .toLowerCase()
                .includes(search.toLowerCase()),
            )
            .map((t) => (
              <div key={`${t.schema}.${t.name}`} className="schema-table">
                <div className="table-row">
                  <button
                    className="table-expand"
                    onClick={() =>
                      setExpanded((x) => ({
                        ...x,
                        [`${t.schema}.${t.name}`]: !x[`${t.schema}.${t.name}`],
                      }))
                    }
                  >
                    {expanded[`${t.schema}.${t.name}`] ? (
                      <ChevronDown size={12} />
                    ) : (
                      <ChevronRight size={12} />
                    )}
                    <Table2 size={14} />
                    <span title={t.schema + "." + t.name}>
                      {t.schema === "dbo" ? t.name : `${t.schema}.${t.name}`}
                    </span>
                    <small>{t.rowCount ?? "뷰"}</small>
                  </button>
                  <button
                    className="preview-table icon-button"
                    aria-label={`${t.name} 조회`}
                    title="이 테이블 조회문 열기"
                    disabled={disabled}
                    onClick={() => onPreview(t)}
                  >
                    <ArrowDownToLine size={12} />
                  </button>
                </div>
                {expanded[`${t.schema}.${t.name}`] && (
                  <div className="table-columns">
                    {t.columns.map((c) => (
                      <button
                        key={c.name}
                        title={`${c.type}${c.nullable ? " · NULL 허용" : " · NOT NULL"}${c.identity ? " · IDENTITY" : ""}${c.defaultValue ? ` · DEFAULT ${c.defaultValue}` : ""}${c.checks ? ` · CHECK ${c.checks}` : ""}${c.references?.length ? " · → " + c.references.map((f) => `${f.schema}.${f.table}.${f.column} (DELETE ${f.onDelete}, UPDATE ${f.onUpdate})`).join(", ") : ""}`}
                        onClick={() =>
                          onInsert(`[${c.name.replaceAll("]", "]]")}]`)
                        }
                        disabled={disabled}
                      >
                        <span className={c.primary ? "column-key" : ""}>
                          {c.primary ? (
                            <KeyRound size={11} />
                          ) : c.references?.length ? (
                            <Link2 size={11} />
                          ) : (
                            <span className="column-dot" />
                          )}
                        </span>
                        <span>{c.name}</span>
                        <small>{c.type}</small>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))
        )}
        {!loading && !error && !schema.length && (
          <p className="small-empty">
            테이블이 없습니다.
            <br />
            DB를 초기화해 보세요.
          </p>
        )}
      </div>
      <div className="schema-footer">
        <span className="tiny-dot" />
        {schema.length}개 테이블 · 실제 DB 스키마
      </div>
    </section>
  );
}
