import { Menu, CircleHelp } from "lucide-react";
const labels = {
  playground: "자유 실습",
  learn: "학습 로드맵",
  pdf: "PDF 문제집",
  history: "실행 기록",
};
export default function Header({ view, health, onMenu, onHelp, menuOpen }) {
  return (
    <header className="topbar">
      <div className="breadcrumb">
        <button
          className="icon-button menu-button"
          onClick={onMenu}
          aria-label="메뉴 열기"
          aria-controls="workspace-navigation"
          aria-expanded={menuOpen}
        >
          <Menu size={20} />
        </button>
        <strong>{labels[view]}</strong>
      </div>
      <div className="topbar-right">
        <span
          className={`connection-badge ${health?.ok ? "connected" : ""}`}
          title={health?.detail || health?.error || "연결 확인 중"}
        >
          <i />
          {health?.ok
            ? "SQL Server 연결됨"
            : health === null
              ? "연결 확인 중"
              : "SQL Server 연결 필요"}
        </span>
        <button
          className="help-button"
          onClick={onHelp}
          aria-label="시작 가이드"
          title="시작 가이드"
        >
          <CircleHelp size={15} />
          <span>시작 가이드</span>
        </button>
      </div>
    </header>
  );
}
