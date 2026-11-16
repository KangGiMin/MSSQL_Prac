import { Component } from "react";
import { downloadJson } from "../../lib/export";
import { workspaceBackup } from "../../lib/storage";

export default class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error) {
    console.error("화면 오류:", error);
  }
  backup = () => {
    downloadJson(workspaceBackup(), "queryground-recovery.json");
  };
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="result-empty" role="alert">
        <h1>실습실 화면을 불러오지 못했습니다.</h1>
        <p>
          저장 내용은 삭제하지 않았습니다. 복구 파일을 내려받은 뒤 새로고침해
          주세요.
        </p>
        <div className="backup-actions">
          <button className="primary-button" onClick={this.backup}>
            저장 내용 복구 파일
          </button>
          <button className="text-button" onClick={() => location.reload()}>
            새로고침
          </button>
        </div>
        <details>
          <summary>오류 정보</summary>
          <pre>{this.state.error.message}</pre>
        </details>
      </main>
    );
  }
}
