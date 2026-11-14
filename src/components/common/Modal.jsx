import { useEffect,useRef } from 'react';
import { X } from 'lucide-react';
export default function Modal({title,children,onClose,locked=false}) {
 const ref=useRef(null);
 useEffect(()=>{ref.current?.showModal();return()=>ref.current?.close();},[]);
 return <dialog ref={ref} className="modal" onCancel={e=>{e.preventDefault();if(!locked)onClose();}} onClick={e=>{if(e.target===ref.current&&!locked)onClose();}}><div className="modal-heading"><h2>{title}</h2><button className="icon-button" aria-label="닫기" disabled={locked} onClick={onClose}><X size={20}/></button></div>{children}</dialog>;
}
