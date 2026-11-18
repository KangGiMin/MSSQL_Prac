import { Menu, CircleHelp } from "lucide-react";
import { views } from "../../config/navigation";
import { engineLabel } from "../../config/runtime";
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
        <strong>{views[view]?.label}</strong>
      </div>
      <div className="topbar-right">
        <span
          className={`connection-badge ${health?.ok ? "connected" : ""}`}
          title={health?.detail || health?.error || "연결 확인 중"}
        >
          <i />
          {health?.ok
            ? `${engineLabel} 연결됨`
            : health === null
              ? "연결 확인 중"
              : `${engineLabel} ${health.unconfigured ? "연결 대기" : "연결 필요"}`}
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
