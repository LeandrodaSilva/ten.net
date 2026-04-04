import { basicSetup, EditorView } from "codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { html } from "@codemirror/lang-html";
import { oneDark } from "@codemirror/theme-one-dark";
import type { DemoFile } from "../types.ts";

export function createEditor(
  container: HTMLElement,
  file: DemoFile,
  onChange: (content: string) => void,
): EditorView {
  const langExt = file.language === "typescript"
    ? javascript({ typescript: true })
    : html();

  const view = new EditorView({
    doc: file.content,
    extensions: [
      basicSetup,
      langExt,
      oneDark,
      EditorView.theme({
        "&": { backgroundColor: "#1b1b1f", height: "100%" },
        ".cm-gutters": { backgroundColor: "#1b1b1f", border: "none" },
        ".cm-scroller": {
          fontFamily: "'Roboto Mono', 'Fira Code', monospace",
          fontSize: "12px",
          lineHeight: "2",
        },
      }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChange(update.state.doc.toString());
        }
      }),
      EditorView.editable.of(file.editable),
    ],
    parent: container,
  });

  return view;
}

export function destroyEditor(view: EditorView): void {
  view.destroy();
}
