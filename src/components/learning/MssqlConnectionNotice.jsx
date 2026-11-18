import { Info } from "lucide-react";
import { missingMssqlMessage } from "../../../shared/deployment.mjs";
export default function MssqlConnectionNotice() {
  return (
    <aside className="mssql-connection-notice" role="status">
      <strong>
        <Info size={16} />
        MSSQL Server 연결 준비 중
      </strong>
      <p>{missingMssqlMessage}</p>
    </aside>
  );
}
