import { Terminal,Code2,BookOpen,FileText,History,ArrowUpRight,ChevronRight,X } from 'lucide-react';
const items=[['playground',Code2,'자유 실습'],['learn',BookOpen,'학습 로드맵'],['pdf',FileText,'PDF 문제집'],['history',History,'실행 기록']];
export default function Sidebar({view,onNavigate,completed,total,open,onClose}) {
  return <><div className={`mobile-shade ${open?'visible':''}`} onClick={onClose}/><aside className={`sidebar ${open?'open':''}`}>
    <a className="brand" href="#" onClick={e=>{e.preventDefault();onNavigate('playground');}}><span className="brand-icon"><Terminal size={22}/></span>QueryGround<span className="brand-dot">.</span></a>
    <button className="mobile-close icon-button" onClick={onClose} aria-label="메뉴 닫기"><X size={20}/></button>
    <div className="workspace-name"><span className="workspace-avatar">Q</span><div>나의 SQL 워크스페이스<small>Personal workspace</small></div><ChevronRight size={14}/></div>
    <div className="nav-label">WORKSPACE</div>
    <nav aria-label="메인 메뉴">{items.map(([id,Icon,label])=><button key={id} className={`nav-item ${view===id?'active':''}`} onClick={()=>{onNavigate(id);onClose();}}><Icon size={18}/>{label}{id==='playground'&&<span className="nav-live"/>}{id==='pdf'&&<span className="nav-count">90p</span>}</button>)}</nav>
    <div className="sidebar-note"><span className="tiny-dot"/>직접 쓰고, 실행하며 배우세요.<small>실수해도 괜찮아요.<br/>실습 데이터는 언제든 되돌릴 수 있어요.</small></div>
    <div className="sidebar-bottom"><div className="study-progress"><div><span>나의 학습 여정</span><strong>{Math.round(completed/Math.max(total,1)*100)}<small>%</small></strong></div><div className="progress-track"><i style={{width:`${completed/Math.max(total,1)*100}%`}}/></div><p>{completed} / {total}개 학습 완료 <span>차근차근, 꾸준히</span></p></div><a href="https://learn.microsoft.com/ko-kr/sql/t-sql/language-reference" target="_blank" rel="noreferrer" className="docs-link">T-SQL 공식 문서 <ArrowUpRight size={15}/></a><div className="profile"><span>ME</span><div>나만의 학습 공간<small>Keep querying. Keep growing.</small></div></div></div>
  </aside></>;
}
