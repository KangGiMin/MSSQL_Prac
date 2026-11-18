import { Database, Loader2 } from "lucide-react";
import Modal from "../common/Modal";
import { practiceLabel } from "../database/labels";
import { workspaceLimits } from "../../../shared/workspace.mjs";
import { clientUrl } from "../../../shared/runtime.mjs";

export default function WorkspaceModal({
  modal,
  database,
  resetting,
  onClose,
  resetDatabase,
  saveQuery,
  saveTitle,
  setSaveTitle,
  onClear,
}) {
  return (
    <Modal
      title={
        modal === "reset"
          ? "데이터베이스를 초기화할까요?"
          : modal === "save"
            ? "나의 쿼리 저장"
            : modal.startsWith("clear")
              ? "목록을 비울까요?"
              : "QueryGround 시작 가이드"
      }
      onClose={onClose}
      locked={resetting}
    >
      {modal === "reset" ? (
        <>
          <div className="modal-db">
            <Database size={22} />
            <div>
              {practiceLabel(database.id)}
              <small>{database.name}</small>
            </div>
          </div>
          <p>
            선택한 실습 DB의 테이블과 실습 중 만든 객체를 초기화하고 기본
            데이터를 다시 채웁니다. 현재 변경 사항은 사라집니다.
          </p>
          <p className="muted">
            다른 DB와 브라우저에 저장한 쿼리·실행 기록은 유지됩니다. 단, 사용자
            정의 스키마·타입과 시간 테이블도 정리합니다. 지원 범위를 벗어나는
            객체의 의존성이 있으면 전체 초기화를 롤백하고 오류를 표시합니다.
          </p>
          <div className="modal-actions">
            <button disabled={resetting} onClick={onClose}>
              취소
            </button>
            <button
              className="primary-button"
              disabled={resetting}
              onClick={resetDatabase}
            >
              {resetting && <Loader2 size={14} className="spinning" />}
              {resetting ? "초기화 중..." : "이 DB 초기화"}
            </button>
          </div>
        </>
      ) : modal === "save" ? (
        <>
          <label className="input-label">
            쿼리 이름
            <input
              autoFocus
              value={saveTitle}
              maxLength={workspaceLimits.queryTitleLength}
              placeholder="예: 부서별 평균 급여 조회"
              onChange={(e) => setSaveTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveQuery();
              }}
            />
          </label>
          <p className="muted">
            SQL과 선택된 데이터베이스를 이 브라우저에 저장합니다.
          </p>
          <div className="modal-actions">
            <button onClick={onClose}>취소</button>
            <button className="primary-button" onClick={saveQuery}>
              저장하기
            </button>
          </div>
        </>
      ) : modal.startsWith("clear") ? (
        <>
          <p>
            {modal === "clear-history"
              ? "실행 기록"
              : modal === "clear-archives"
                ? "자동 보관"
                : "저장한 쿼리"}{" "}
            목록을 이 브라우저에서 삭제합니다. 데이터베이스의 데이터는
            유지됩니다.
          </p>
          <div className="modal-actions">
            <button onClick={onClose}>취소</button>
            <button className="primary-button" onClick={onClear}>
              목록 비우기
            </button>
          </div>
        </>
      ) : (
        <div className="help-content">
          <p>React와 실제 SQL Server가 연결된 개인용 실습실입니다.</p>
          <ol>
            <li>
              <strong>DB 선택</strong>
              <span>직원 정보·주문 정보·학생 성적 중 하나를 고르세요.</span>
            </li>
            <li>
              <strong>쿼리 작성과 실행</strong>
              <span>
                탐색기의 테이블을 조회하거나 SQL을 직접 입력하고 Ctrl + Enter를
                누르세요. 선택한 SQL만 실행할 수도 있습니다.
              </span>
            </li>
            <li>
              <strong>문제 풀고 복습</strong>
              <span>
                학습 로드맵과 PDF 문제집에서 문제·설명·정답·주의사항을 확인하고
                스스로 완료 체크를 해보세요.
              </span>
            </li>
          </ol>
          <div className="help-setup">
            <strong>로컬 서버 시작</strong>
            <pre>npm.cmd ci{"\n"}npm.cmd run dev</pre>
            <p>
              {`기본 주소는 ${clientUrl()}입니다. Live Server(5500) 대신 이 주소를 사용하세요. 연결 변경은 .env.example을 .env로 복사한 뒤 SQL_SERVER와 인증 방식을 수정하세요.`}
            </p>
          </div>
          <p className="muted">
            각 실행은 독립 연결입니다. BEGIN TRAN과 COMMIT/ROLLBACK은 한 번에
            실행하세요. 서버 관리 명령과 다른 DB 접근은 제한됩니다. 현재
            브라우저에 진행도·쿼리·최대 {workspaceLimits.records}개 기록을
            저장합니다.
          </p>
        </div>
      )}
    </Modal>
  );
}
