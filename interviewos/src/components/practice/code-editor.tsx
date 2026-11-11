"use client";

import Editor, { loader, type Monaco, type OnMount } from "@monaco-editor/react";
import { useEffect, useRef } from "react";
import type { Language } from "@/lib/content/types";
import { useI18n } from "@/lib/i18n/client";

// Serve Monaco from /public (copied at install) so the editor works offline.
loader.config({ paths: { vs: "/monaco/vs" } });

const MONACO_LANGUAGE: Record<Language, string> = { java: "java", typescript: "typescript", python: "python" };

function defineThemes(monaco: Monaco) {
  monaco.editor.defineTheme("interviewos-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "62666f", fontStyle: "italic" },
      { token: "keyword", foreground: "c792ea" },
      { token: "string", foreground: "9ece6a" },
      { token: "number", foreground: "ff9e64" },
      { token: "type", foreground: "2ac3de" },
    ],
    colors: {
      "editor.background": "#0f1013",
      "editor.lineHighlightBackground": "#17191e",
      "editorLineNumber.foreground": "#3a3e47",
      "editorLineNumber.activeForeground": "#8d929c",
      "editor.selectionBackground": "#4c8dff33",
      "editorIndentGuide.background1": "#1e2026",
      "editorWidget.background": "#17191e",
      "editorWidget.border": "#31353e",
    },
  });
  monaco.editor.defineTheme("interviewos-light", {
    base: "vs",
    inherit: true,
    rules: [],
    colors: { "editor.background": "#ffffff", "editor.lineHighlightBackground": "#f3f4f6" },
  });
  // ListNode is injected by the runner/harness; declare it so the TS language service doesn't flag it.
  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    "declare class ListNode { val: number; next: ListNode | null; constructor(val?: number, next?: ListNode | null); }",
    "file:///interviewos-globals.d.ts",
  );
  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ES2022,
    strict: true,
    noEmit: true,
    allowNonTsExtensions: true,
  });
}

export interface EditorCommands {
  onRun?: () => void;
  onSave?: () => void;
  onSubmit?: () => void;
}

export function CodeEditor({
  language,
  value,
  onChange,
  theme,
  commands,
  readOnly,
  height = "100%",
  path,
}: {
  language: Language;
  value: string;
  onChange?: (v: string) => void;
  theme: "dark" | "light";
  commands?: EditorCommands;
  readOnly?: boolean;
  height?: string;
  /** Stable model URI; each path keeps its own model (and undo history) across language switches. */
  path?: string;
}) {
  const { m } = useI18n();
  const commandsRef = useRef(commands);
  useEffect(() => {
    commandsRef.current = commands;
  }, [commands]);

  const onMount: OnMount = (editor, monaco) => {
    const { KeyMod, KeyCode } = monaco;
    editor.addCommand(KeyMod.CtrlCmd | KeyCode.Enter, () => commandsRef.current?.onRun?.());
    editor.addCommand(KeyMod.CtrlCmd | KeyCode.KeyS, () => commandsRef.current?.onSave?.());
    editor.addCommand(KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.Enter, () => commandsRef.current?.onSubmit?.());
    if (!readOnly) editor.focus();
  };

  return (
    <Editor
      height={height}
      path={path}
      language={MONACO_LANGUAGE[language]}
      value={value}
      theme={theme === "light" ? "interviewos-light" : "interviewos-dark"}
      beforeMount={defineThemes}
      onMount={onMount}
      onChange={(v) => onChange?.(v ?? "")}
      loading={<div className="p-4 text-xs text-subtle-foreground">{m.practice.ws.loadingEditor}</div>}
      options={{
        readOnly,
        fontSize: 13.5,
        fontFamily: "var(--font-geist-mono), ui-monospace, Menlo, monospace",
        fontLigatures: false,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        tabSize: language === "python" ? 4 : language === "java" ? 4 : 2,
        renderLineHighlight: "line",
        smoothScrolling: true,
        padding: { top: 12, bottom: 12 },
        automaticLayout: true,
        bracketPairColorization: { enabled: true },
        guides: { indentation: true },
        quickSuggestions: { other: true, comments: false, strings: false },
        wordWrap: "off",
        accessibilitySupport: "auto",
      }}
    />
  );
}
