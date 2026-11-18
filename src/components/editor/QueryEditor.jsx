import { useMemo, useRef, useEffect, useCallback } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { sql, MSSQL } from "@codemirror/lang-sql";
import { EditorView, keymap } from "@codemirror/view";
import { Prec } from "@codemirror/state";
import {
  sqlBlueTheme,
  editorAppearance,
  editorSetup,
} from "../../config/editor";
import {
  Play,
  Square,
  Save,
  RotateCcw,
  Code2,
  CornerDownLeft,
} from "lucide-react";

export default function QueryEditor({
  value,
  onChange,
  onRun,
  onCancel,
  onSave,
  onReset,
  running,
  resetting,
  connected,
  schema,
  editorRef,
  storageStatus = "saved",
  canceling = false,
}) {
  const ref = useRef(null),
    runRef = useRef(onRun);
  runRef.current = onRun;
  const allowed = useRef(false);
  allowed.current = connected && !running && !resetting && !!value.trim();
  const runSelection = useCallback(() => {
    if (!allowed.current) return;
    const view = ref.current?.view;
    const selection = view?.state.sliceDoc(
      view.state.selection.main.from,
      view.state.selection.main.to,
    );
    runRef.current(selection?.trim() ? selection : undefined);
  }, []);
  const extensions = useMemo(
    () => [
      sql({
        dialect: MSSQL,
        upperCaseKeywords: true,
        defaultSchema: "dbo",
        schema: schema.reduce((namespaces, table) => {
          (namespaces[table.schema] ||= {})[table.name] = table.columns.map(
            (column) => column.name,
          );
          return namespaces;
        }, {}),
      }),
      EditorView.lineWrapping,
      Prec.highest(
        keymap.of(
          ["Mod-Enter", "F5"].map((key) => ({
            key,
            run: () => {
              runSelection();
              return true;
            },
          })),
        ),
      ),
      editorAppearance,
    ],
    [schema, runSelection],
  );
  useEffect(() => {
    if (editorRef)
      editorRef.current = {
        insert: (text) => {
          const view = ref.current?.view;
          if (view) {
            view.dispatch(view.state.replaceSelection(text));
            view.focus();
          }
        },
      };
  }, [editorRef]);
  return (
    <section className="editor-panel">
      <div className="editor-tabs">
        <div className="file-tab">
          <Code2 size={15} />
          <span>query.sql</span>
          <i />
        </div>
        <span className="editor-dialect">
          Microsoft SQL Server <span>T-SQL</span>
        </span>
      </div>
      <div className="editor-toolbar">
        <span>
          <span className="tiny-dot" />
          {storageStatus === "saved"
            ? "자동 저장됨 · 이 브라우저"
            : storageStatus === "saving"
              ? "저장 중…"
              : storageStatus === "recovered"
                ? "저장 내용 복구됨"
                : "저장 실패 · 백업 필요"}
        </span>
        <div>
          <button
            className="text-button"
            disabled={running || resetting}
            onClick={onSave}
            title="내 쿼리 저장"
          >
            <Save size={14} />
            저장
          </button>
          <button
            className="text-button"
            disabled={running || resetting || !connected}
            onClick={onReset}
            title="선택한 DB를 원래 데이터로 초기화"
          >
            <RotateCcw size={14} />
            DB 초기화
          </button>
          <button
            className={`run-button ${running ? "cancel" : ""}`}
            onClick={running ? onCancel : runSelection}
            disabled={
              canceling ||
              resetting ||
              (!running && (!value.trim() || !connected))
            }
          >
            {running ? (
              <Square size={13} />
            ) : (
              <Play size={13} fill="currentColor" />
            )}
            {canceling ? "정리 중…" : running ? "중지" : "실행"}
            {!running && <kbd>Ctrl ↵</kbd>}
          </button>
        </div>
      </div>
      <CodeMirror
        ref={ref}
        value={value}
        onChange={onChange}
        height="260px"
        theme={sqlBlueTheme}
        extensions={extensions}
        editable={!running && !resetting}
        basicSetup={editorSetup}
        aria-label="SQL 쿼리 편집기"
      />
      <div className="editor-status">
        <span>
          T-SQL <i /> UTF-8
        </span>
        <span>
          선택 영역 또는 전체 쿼리 실행 <CornerDownLeft size={11} />
        </span>
      </div>
    </section>
  );
}
