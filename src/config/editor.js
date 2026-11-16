import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import {
  oneDarkTheme,
  oneDarkHighlightStyle,
} from "@codemirror/theme-one-dark";

export const sqlBlueTheme = [
  oneDarkTheme,
  syntaxHighlighting(
    HighlightStyle.define(
      oneDarkHighlightStyle.specs.map((rule) =>
        rule.color === "#c678dd"
          ? { ...rule, color: "var(--accent-text)" }
          : rule,
      ),
    ),
  ),
];

export const editorAppearance = EditorView.theme({
  "&": { fontSize: "13px", backgroundColor: "var(--editor-bg)" },
  ".cm-scroller": { fontFamily: 'Consolas, "SFMono-Regular", monospace' },
  ".cm-gutters": {
    backgroundColor: "var(--editor-bg)",
    border: "none",
    color: "#505563",
  },
  ".cm-content": { paddingTop: "20px" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--accent)" },
  ".cm-activeLine": { backgroundColor: "#ffffff03" },
  ".cm-activeLineGutter": { backgroundColor: "transparent" },
});

export const editorSetup = {
  foldGutter: false,
  highlightActiveLine: false,
  autocompletion: true,
  bracketMatching: true,
};
