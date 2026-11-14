import { useEffect, useRef, useState } from "react";
import {
  Terminal,
  Code2,
  BookOpen,
  FileText,
  History,
  ArrowUpRight,
  X,
} from "lucide-react";
const items = [
  ["playground", Code2, "자유 실습"],
  ["learn", BookOpen, "학습 로드맵"],
  ["pdf", FileText, "PDF 문제집"],
  ["history", History, "실행 기록"],
];
export default function Sidebar({
  view,
  onNavigate,
  completed,
  total,
  pageCount,
  open,
  onClose,
}) {
  const panel = useRef(null);
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 900px)");
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!open || !mobile) return;
    const previous = document.activeElement,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector(".mobile-close")?.focus();
    const handle = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key === "Tab") {
        const nodes = [...panel.current.querySelectorAll("a,button")].filter(
          (node) => !node.disabled && node.getClientRects().length,
        );
        const first = nodes[0],
          last = nodes.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handle);
    return () => {
      document.removeEventListener("keydown", handle);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [open, mobile, onClose]);
  return (
    <>
      <div
        className={`mobile-shade ${open ? "visible" : ""}`}
        aria-hidden="true"
        onClick={onClose}
      />
      <aside
        ref={panel}
        id="workspace-navigation"
        className={`sidebar ${open ? "open" : ""}`}
        inert={mobile && !open}
        aria-hidden={mobile && !open ? true : undefined}
      >
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onNavigate("playground");
            onClose();
          }}
        >
          <span className="brand-icon">
            <Terminal size={22} />
          </span>
          QueryGround<span className="brand-dot">.</span>
        </a>
        <button
          className="mobile-close icon-button"
          onClick={onClose}
          aria-label="메뉴 닫기"
        >
          <X size={20} />
        </button>
        <div className="nav-label">메뉴</div>
        <nav aria-label="메인 메뉴">
          {items.map(([id, Icon, label]) => (
            <button
              key={id}
              className={`nav-item ${view === id ? "active" : ""}`}
              aria-current={view === id ? "page" : undefined}
              onClick={() => {
                onNavigate(id);
                onClose();
              }}
            >
              <Icon size={18} />
              {label}
              {id === "pdf" && <span className="nav-count">{pageCount}p</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="study-progress">
            <div>
              <span>학습 진행</span>
              <strong>
                {Math.round((completed / Math.max(total, 1)) * 100)}
                <small>%</small>
              </strong>
            </div>
            <div className="progress-track">
              <i
                style={{ width: `${(completed / Math.max(total, 1)) * 100}%` }}
              />
            </div>
            <p>
              {completed} / {total}개 완료
            </p>
          </div>
          <a
            href="https://learn.microsoft.com/ko-kr/sql/t-sql/language-reference"
            target="_blank"
            rel="noreferrer"
            className="docs-link"
          >
            T-SQL 공식 문서 <ArrowUpRight size={15} />
          </a>
        </div>
      </aside>
    </>
  );
}
