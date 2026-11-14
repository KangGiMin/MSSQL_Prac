import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Search,
  FileText,
} from "lucide-react";
export default function SourceReader({ page, onPage }) {
  const [pages, setPages] = useState([]),
    [error, setError] = useState(""),
    [search, setSearch] = useState(""),
    [textMode, setTextMode] = useState(false);
  useEffect(() => {
    let live = true;
    fetch("/materials/pages.json")
      .then((r) => {
        if (!r.ok) throw new Error("원본 텍스트를 읽을 수 없습니다.");
        return r.json();
      })
      .then((p) => {
        if (live) setPages(p);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, []);
  const found = search.trim()
    ? pages.filter((p) =>
        p.text
          .replace(/\s/g, "")
          .toLowerCase()
          .includes(search.replace(/\s/g, "").toLowerCase()),
      )
    : [];
  return (
    <section className="source-reader">
      <div className="source-toolbar">
        <div>
          <FileText size={17} />
          <strong>SQL 정리 · 기출 정답 원본</strong>
          <span>90 pages</span>
        </div>
        <a
          href={`/materials/sql-reference.pdf#page=${page}`}
          target="_blank"
          rel="noreferrer"
        >
          새 창에서 보기 <ExternalLink size={14} />
        </a>
      </div>
      <div className="source-controls">
        <div className="source-search">
          <Search size={15} />
          <input
            aria-label="PDF 전체 내용 검색"
            placeholder="90쪽 전체에서 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="text-button" onClick={() => setTextMode((v) => !v)}>
          {textMode ? "PDF로 보기" : "추출 텍스트로 보기"}
        </button>
        <div className="page-control">
          <button
            aria-label="이전 페이지"
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
          >
            <ChevronLeft size={17} />
          </button>
          <input
            aria-label="PDF 페이지"
            type="number"
            min="1"
            max="90"
            value={page}
            onChange={(e) =>
              onPage(Math.min(90, Math.max(1, Number(e.target.value) || 1)))
            }
          />
          <span>/ 90</span>
          <button
            aria-label="다음 페이지"
            disabled={page >= 90}
            onClick={() => onPage(page + 1)}
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
      {search && (
        <div className="source-search-results">
          <span>{found.length}쪽에서 발견</span>
          {found.map((p) => (
            <button
              key={p.page}
              onClick={() => {
                onPage(p.page);
                setTextMode(true);
              }}
            >
              {p.page}쪽
            </button>
          ))}
        </div>
      )}
      {error && <p className="error-banner">{error}</p>}
      {textMode ? (
        <div className="source-text">
          <span>원본 {page}쪽 · 원본 표현을 유지한 추출 텍스트</span>
          <pre>{pages[page - 1]?.text || "내용을 불러오는 중입니다."}</pre>
        </div>
      ) : (
        <iframe
          key={page}
          title={`PDF 원본 ${page}쪽`}
          src={`/materials/sql-reference.pdf#page=${page}&view=FitH`}
          className="pdf-frame"
        />
      )}
      <p className="source-footnote">
        원본의 설명·답안은 그대로 보존했습니다. SQL Server 기준의 정정 사항은
        학습 콘텐츠에서 확인할 수 있습니다.
      </p>
    </section>
  );
}
