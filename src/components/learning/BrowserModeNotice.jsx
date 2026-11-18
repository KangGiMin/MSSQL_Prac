import { Info } from "lucide-react";
export default function BrowserModeNotice() {
  return (
    <details className="browser-mode-notice" open>
      <summary>
        <Info size={16} />
        브라우저 SQL 실습 · 추가 설치 없이 바로 실행
      </summary>
      <p>
        이 공개 사이트는 SQLite(WebAssembly)로 실행합니다. 실습 DB 3개는
        방문자마다 독립적이며, 변경 사항은 이 브라우저에 저장됩니다.
      </p>
      <p>
        SELECT·INSERT·UPDATE·DELETE·JOIN·집계·CTE·윈도 함수·테이블
        생성·트랜잭션을 연습할 수 있습니다. dbo, N 문자열, TOP, 일부 날짜·문자열
        함수는 호환 변환합니다.
      </p>
      <p>
        교재는 SQL Server 기준입니다. 프로시저·MERGE·PIVOT·ALTER COLUMN·권한
        관리 등 전용 기능과 자료형 동작은 다릅니다. 해당 내용은 기존 로컬 MSSQL
        모드에서 실습해 주세요.
      </p>
    </details>
  );
}
