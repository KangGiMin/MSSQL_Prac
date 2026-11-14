import { ChevronRight,Menu,ExternalLink } from 'lucide-react';
const labels={playground:'자유 실습',learn:'학습 로드맵',pdf:'PDF 문제집',history:'실행 기록'};
export default function Header({view,health,onMenu,onHelp}) {
 return <header className="topbar"><div className="breadcrumb"><button className="icon-button menu-button" onClick={onMenu} aria-label="메뉴 열기"><Menu size={20}/></button><span>워크스페이스</span><ChevronRight size={14}/><strong>{labels[view]}</strong></div><div className="topbar-right"><span className={`connection-badge ${health?.ok?'connected':''}`} title={health?.detail||health?.error||'연결 확인 중'}><i/>{health?.ok?'SQL Server 연결됨':health===null?'연결 확인 중':'SQL Server 연결 필요'}</span><button className="help-button" onClick={onHelp}>시작 가이드 <ExternalLink size={13}/></button><span className="user-avatar">G</span></div></header>;
}
