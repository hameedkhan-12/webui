"use client";

import React from "react";
import CodeMirror, { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { Extension } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { X, Circle } from "lucide-react";
import { WorkspaceFiles, ComponentMeta } from "@repo/shared";
import { parseComponentMetaFromSource } from "@aura/component-registry";

// ─── Zed Dark Theme ───────────────────────────────────────────────────────────
// Based on Zed's official "One Dark" theme palette
// Ref: https://github.com/zed-industries/zed/blob/main/assets/themes/one_dark.json

const zedDarkBase = EditorView.theme(
  {
    "&": { backgroundColor: "#1c1c1c", color: "#abb2bf", height: "100%" },
    ".cm-content": {
      fontFamily: "var(--font-jetbrains-mono), 'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace",
      fontSize: "13px",
      lineHeight: "1.72",
      caretColor: "#528bff",
      padding: "0 0 80px 0",
    },
    ".cm-cursor": { borderLeftColor: "#528bff", borderLeftWidth: "2px" },
    ".cm-cursor-secondary": { borderLeftColor: "rgba(82,139,255,0.5)" },
    "&.cm-focused": { outline: "none" },

    // Gutters
    ".cm-gutters": {
      backgroundColor: "#1c1c1c",
      color: "#3b3f4a",
      border: "none",
      paddingRight: "6px",
      minWidth: "44px",
      userSelect: "none",
    },
    ".cm-lineNumbers .cm-gutterElement": {
      fontSize: "12px",
      padding: "0 6px 0 8px",
      minWidth: "32px",
      textAlign: "right",
    },
    ".cm-activeLineGutter": { backgroundColor: "transparent", color: "#5c6370" },
    ".cm-foldGutter .cm-gutterElement": {
      color: "#3b3f4a",
      cursor: "pointer",
      padding: "0 4px",
    },
    ".cm-foldGutter .cm-gutterElement:hover": { color: "#5c6370" },

    // Active line
    ".cm-activeLine": { backgroundColor: "rgba(255,255,255,0.028)" },

    // Selections
    ".cm-selectionBackground": { backgroundColor: "#3e4451 !important" },
    "&.cm-focused .cm-selectionBackground": { backgroundColor: "#3e4451 !important" },
    "::selection": { backgroundColor: "#3e4451" },

    // Bracket matching
    ".cm-matchingBracket": {
      backgroundColor: "rgba(97,175,239,0.12)",
      outline: "1px solid rgba(97,175,239,0.35)",
      borderRadius: "2px",
    },

    // Scrollbars — ultra-thin Zed style
    ".cm-scroller": {
      overflow: "auto",
      scrollbarWidth: "thin",
      scrollbarColor: "#2a2d35 transparent",
    },
    ".cm-scroller::-webkit-scrollbar": { width: "5px", height: "5px" },
    ".cm-scroller::-webkit-scrollbar-track": { background: "transparent" },
    ".cm-scroller::-webkit-scrollbar-thumb": {
      background: "#2a2d35",
      borderRadius: "3px",
    },

    // Autocomplete tooltip
    ".cm-tooltip": {
      backgroundColor: "#21252b",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: "6px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
    },
    ".cm-tooltip-autocomplete ul li": {
      fontSize: "12px",
      fontFamily: "var(--font-jetbrains-mono), monospace",
    },
    ".cm-tooltip-autocomplete ul li[aria-selected]": {
      backgroundColor: "#2c313a",
    },

    // Search matches
    ".cm-searchMatch": {
      backgroundColor: "rgba(209,154,102,0.25)",
      outline: "1px solid rgba(209,154,102,0.5)",
    },
    ".cm-searchMatch-selected": { backgroundColor: "rgba(209,154,102,0.4)" },

    // Indent guides
    ".cm-indent-markers": { "--indent-marker-bg-color": "#2a2d35" },
  },
  { dark: true },
);

const zedDarkHighlight = HighlightStyle.define([
  // Keywords: purple (c678dd)
  { tag: [t.keyword, t.modifier, t.self],         color: "#c678dd", fontWeight: "500" },
  // Strings: green (98c379)
  { tag: [t.string, t.special(t.brace)],           color: "#98c379" },
  { tag: t.regexp,                                  color: "#56b6c2" },
  // Numbers, booleans, null: orange (d19a66)
  { tag: [t.number, t.bool, t.null],               color: "#d19a66" },
  // Comments: dim gray (5c6370)
  { tag: [t.comment, t.lineComment, t.blockComment], color: "#5c6370", fontStyle: "italic" },
  // Functions: blue (61afef)
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "#61afef" },
  // Types/classes: amber (e5c07b)
  { tag: [t.typeName, t.className, t.namespace],   color: "#e5c07b" },
  // Type parameters: lighter amber
  { tag: t.typeOperator,                            color: "#c678dd" },
  // Variables/names: slightly warm white
  { tag: [t.variableName, t.name],                 color: "#e06c75" },
  // Properties: salmon (e06c75)
  { tag: t.propertyName,                           color: "#e06c75" },
  // Attribute names (JSX props): amber
  { tag: t.attributeName,                          color: "#d19a66" },
  // Attribute values (JSX string props): green
  { tag: t.attributeValue,                         color: "#98c379" },
  // Operators: cyan (56b6c2)
  { tag: [t.operator, t.punctuation],              color: "#abb2bf" },
  { tag: t.arithmeticOperator,                     color: "#56b6c2" },
  { tag: t.logicOperator,                          color: "#56b6c2" },
  { tag: t.compareOperator,                        color: "#56b6c2" },
  // JSX tags: salmon
  { tag: t.tagName,                                color: "#e06c75" },
  { tag: t.angleBracket,                           color: "#abb2bf" },
  // Definitions
  { tag: t.definition(t.variableName),             color: "#e5c07b" },
  { tag: t.definition(t.propertyName),             color: "#61afef" },
  // Decorators
  { tag: t.meta,                                   color: "#e06c75" },
  // Escape sequences
  { tag: t.escape,                                 color: "#56b6c2" },
  // Invalid
  { tag: t.invalid,                                color: "#f44747", textDecoration: "underline" },
  // Headings (Markdown)
  { tag: t.heading,                                color: "#e06c75", fontWeight: "600" },
  { tag: t.link,                                   color: "#61afef", textDecoration: "underline" },
  // Units
  { tag: t.unit,                                   color: "#56b6c2" },
  // Deleted text
  { tag: t.deleted,                                color: "#e06c75" },
]);

export const zedDark: Extension = [
  zedDarkBase,
  syntaxHighlighting(zedDarkHighlight),
];


/* ─────────────────────────────────────────────────────────
   File-kind helpers  (shared with FileTree)
───────────────────────────────────────────────────────── */
type FileKind =
  | "tsx"
  | "ts"
  | "jsx"
  | "js"
  | "css"
  | "json"
  | "html"
  | "md"
  | "other";

function getFileKind(path: string): FileKind {
  if (path.endsWith(".tsx") || path.endsWith(".jsx")) return "tsx";
  if (path.endsWith(".ts")) return "ts";
  if (path.endsWith(".js")) return "js";
  if (path.endsWith(".css")) return "css";
  if (path.endsWith(".json")) return "json";
  if (path.endsWith(".html")) return "html";
  if (path.endsWith(".md")) return "md";
  return "other";
}

const KIND_META: Record<
  FileKind,
  { label: string; dot: string; lang: string }
> = {
  tsx: { label: "TSX", dot: "bg-blue-400", lang: "TypeScript JSX" },
  ts: { label: "TS", dot: "bg-blue-400", lang: "TypeScript" },
  jsx: { label: "JSX", dot: "bg-sky-400", lang: "JavaScript JSX" },
  js: { label: "JS", dot: "bg-yellow-400", lang: "JavaScript" },
  css: { label: "CSS", dot: "bg-cyan-400", lang: "CSS" },
  json: { label: "{}", dot: "bg-amber-400", lang: "JSON" },
  html: { label: "HTM", dot: "bg-orange-400", lang: "HTML" },
  md: { label: "MD", dot: "bg-slate-400", lang: "Markdown" },
  other: { label: "TXT", dot: "bg-slate-500", lang: "Plain text" },
};

/** Exported so FileTree can reuse the same icon style in its rows */
export function getFileIcon(filePath: string) {
  const { label, dot } = KIND_META[getFileKind(filePath)];
  const textColor = dot.replace("bg-", "text-").replace("/10", "");
  return (
    <span
      className={`inline-flex items-center justify-center rounded text-[8px] font-bold font-mono shrink-0 px-1 h-[15px] ${textColor} bg-white/5`}
    >
      {label}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────
   Language extension picker
───────────────────────────────────────────────────────── */
function getLanguageExtension(fileName: string) {
  if (
    fileName.endsWith(".jsx") ||
    fileName.endsWith(".tsx") ||
    fileName.endsWith(".js") ||
    fileName.endsWith(".ts")
  )
    return [javascript({ jsx: true, typescript: true })];
  if (fileName.endsWith(".css")) return [css()];
  if (fileName.endsWith(".html")) return [html()];
  return [];
}

/* ─────────────────────────────────────────────────────────
   basicSetup config — defined outside component so the
   object reference is stable across every render.
───────────────────────────────────────────────────────── */
const BASIC_SETUP = {
  lineNumbers: true,
  foldGutter: true,
  dropCursor: true,
  allowMultipleSelections: true,
  indentOnInput: true,
  bracketMatching: true,
  closeBrackets: true,
  autocompletion: true,
  rectangularSelection: true,
  crosshairCursor: false,
  highlightActiveLine: true,
  highlightSelectionMatches: true,
  closeBracketsKeymap: true,
  defaultKeymap: true,
  searchKeymap: true,
  historyKeymap: true,
  foldKeymap: true,
  completionKeymap: true,
  lintKeymap: true,
} as const;

/* ─────────────────────────────────────────────────────────
   Props
───────────────────────────────────────────────────────── */
interface CodeEditorProps {
  files: WorkspaceFiles;
  activeFile: string;
  onUpdateFile: (path: string, content: string) => void;
  onSelectFile: (name: string) => void;
  openTabs: string[];
  onCloseTab: (name: string) => void;
  selectedElementId?: string | null;
}

/* ─────────────────────────────────────────────────────────
   Main component
───────────────────────────────────────────────────────── */
export const CodeEditor: React.FC<CodeEditorProps> = ({
  files,
  activeFile,
  onUpdateFile,
  onSelectFile,
  openTabs,
  onCloseTab,
  selectedElementId,
}) => {
  const currentFile = files[activeFile];
  const [ready, setReady] = React.useState(false);
  const [cursorPos, setCursorPos] = React.useState({ line: 1, col: 1 });
  const editorRef = React.useRef<ReactCodeMirrorRef>(null);
  const tabsRef = React.useRef<HTMLDivElement>(null);

  /* Hydration guard */
  React.useEffect(() => {
    setReady(true);
  }, []);

  /* Scroll active tab into view */
  React.useEffect(() => {
    tabsRef.current
      ?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeFile]);

  /* Jump to selected element in CodeMirror */
  React.useEffect(() => {
    if (!selectedElementId || !editorRef.current?.view) return;
    const view = editorRef.current.view;
    const doc = view.state.doc.toString();
    const target = `data-id="${selectedElementId}"`;
    const idx = doc.indexOf(target);
    if (idx !== -1) {
      view.dispatch({
        selection: { anchor: idx, head: idx + target.length },
        scrollIntoView: true,
      });
      view.focus();
    }
  }, [selectedElementId, activeFile]);

  /* Stable language extensions — only recompute when file type changes */
  const extensions = React.useMemo(
    () => getLanguageExtension(activeFile),
    [activeFile],
  );

  /* Cursor position tracking via onUpdate */
  const handleUpdate = React.useCallback(
    (vu: {
      selectionSet: boolean;
      state: {
        selection: { main: { head: number } };
        doc: { lineAt: (n: number) => { number: number; from: number } };
      };
    }) => {
      if (!vu.selectionSet) return;
      const head = vu.state.selection.main.head;
      const line = vu.state.doc.lineAt(head);
      setCursorPos({ line: line.number, col: head - line.from + 1 });
    },
    [],
  );

  const handleChange = React.useCallback(
    (value: string) => onUpdateFile(activeFile, value),
    [activeFile, onUpdateFile],
  );

  /* Derived info for status bar */
  const content = currentFile?.content ?? "";
  const activeFileMeta = React.useMemo<ComponentMeta | null>(() => {
    if (!currentFile) return null;
    return parseComponentMetaFromSource(activeFile, currentFile.content);
  }, [activeFile, currentFile?.content]);
  const lineCount = content.length ? content.split("\n").length : 0;
  const charCount = content.length;
  const langLabel = KIND_META[getFileKind(activeFile)].lang;

  /* Breadcrumb segments */
  const pathParts = activeFile ? activeFile.split("/") : [];

  /* ── Render ── */
  return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ background: '#1c1c1c' }}>
      {/* ────── Zed-style Tab strip ──────────────────────── */}
      <div
        ref={tabsRef}
        className="flex-none flex items-stretch overflow-x-auto overflow-y-hidden"
        style={{
          height: '36px',
          scrollbarWidth: 'none',
          background: '#181818',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
        role="tablist"
      >
        {openTabs.map((tab) => {
          const isActive = tab === activeFile;
          const fileName = tab.split('/').pop() ?? tab;
          const { dot } = KIND_META[getFileKind(tab)];

          return (
            <button
              key={tab}
              role="tab"
              type="button"
              data-active={isActive}
              aria-selected={isActive}
              onClick={() => onSelectFile(tab)}
              className="group relative flex-none flex items-center gap-1.5 pl-3 pr-2 h-full cursor-pointer transition-colors outline-none"
              style={{
                minWidth: 0,
                maxWidth: '180px',
                borderRight: '1px solid rgba(255,255,255,0.05)',
                color: isActive ? '#e2e8f0' : 'rgba(148,163,184,0.45)',
                background: isActive ? '#1c1c1c' : 'transparent',
              }}
            >
              {/* Zed-style: 2px colored square instead of round dot */}
              <span
                className="shrink-0"
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '1px',
                  background: isActive ? dot.replace('bg-','').replace('-400','') : 'transparent',
                  border: `1px solid ${isActive ? 'transparent' : 'rgba(148,163,184,0.2)'}`,
                }}
              />

              <span className="text-[12px] font-normal truncate leading-none flex-1 text-left" style={{ fontFamily: "var(--font-jetbrains-mono), monospace" }}>
                {fileName}
              </span>

              {/* Close button — shows on hover */}
              {openTabs.length > 1 && (
                <span
                  role="button"
                  tabIndex={-1}
                  onClick={(e) => { e.stopPropagation(); onCloseTab(tab); }}
                  onKeyDown={(e) => e.key === 'Enter' && (e.stopPropagation(), onCloseTab(tab))}
                  className={`flex-none flex items-center justify-center w-4 h-4 rounded ml-0.5 shrink-0 transition-all ${
                    isActive
                      ? 'opacity-40 hover:opacity-100'
                      : 'opacity-0 group-hover:opacity-40 hover:opacity-100'
                  }`}
                  title="Close tab"
                  style={{ color: 'rgba(148,163,184,0.7)' }}
                >
                  <X size={10} strokeWidth={2} />
                </span>
              )}

              {/* Bottom active bar */}
              {isActive && (
                <span
                  className="absolute bottom-0 left-0 right-0"
                  style={{ height: '1.5px', background: '#a855f7' }}
                />
              )}
            </button>
          );
        })}

        <div className="flex-1" />
      </div>

      {/* ────── Zed-style breadcrumb (inline, minimal) ─────── */}
      {pathParts.length > 0 && (
        <div
          className="flex-none flex items-center gap-0.5 px-3 overflow-x-auto"
          style={{
            height: '24px',
            scrollbarWidth: 'none',
            background: '#1c1c1c',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
          }}
        >
          {pathParts.map((part, i) => (
            <React.Fragment key={i}>
              {i > 0 && (
                <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: '10px', margin: '0 1px' }}>›</span>
              )}
              <span
                style={{
                  fontSize: '11px',
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  whiteSpace: 'nowrap',
                  color: i === pathParts.length - 1 ? 'rgba(171,178,191,0.8)' : 'rgba(255,255,255,0.25)',
                }}
              >
                {part}
              </span>
            </React.Fragment>
          ))}
        </div>
      )}

      {activeFileMeta && (
        <div className="flex-none flex flex-col gap-2 px-3 py-3 bg-slate-950/95 border-t border-white/[0.06] border-b border-white/[0.04]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-purple-500/10 text-purple-200 px-2 py-0.5 text-[11px] font-semibold">
              Generated component
            </span>
            <span className="rounded-full bg-white/5 text-slate-200 px-2 py-0.5 text-[10px] uppercase tracking-[0.15em]">
              {activeFileMeta.name}
            </span>
            <span className="rounded-full bg-purple-500/10 text-purple-200 px-2 py-0.5 text-[10px]">
              {activeFileMeta.category}
            </span>
          </div>
          {activeFileMeta.description ? (
            <p className="text-[10px] text-slate-400 leading-snug">
              {activeFileMeta.description}
            </p>
          ) : null}
          {activeFileMeta.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {activeFileMeta.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      )}

      {/* ────── Editor (Zed Dark) ─────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {currentFile && ready ? (
          <CodeMirror
            ref={editorRef}
            value={currentFile.content}
            theme={zedDark}
            height="100%"
            extensions={extensions}
            onChange={handleChange}
            onUpdate={handleUpdate as never}
            basicSetup={BASIC_SETUP}
            className="h-full"
            style={{ height: '100%', background: '#1c1c1c' }}
          />
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center gap-3 select-none"
            style={{ background: '#1c1c1c', color: 'rgba(255,255,255,0.12)' }}
          >
            <Circle size={28} strokeWidth={1} style={{ opacity: 0.2 }} />
            <p style={{ fontSize: '11px', fontFamily: "var(--font-jetbrains-mono), monospace" }}>
              Select a file to edit
            </p>
          </div>
        )}
      </div>

      {/* ────── Zed-style status bar (ultra-minimal) ───────── */}
      <div
        className="flex-none flex items-center justify-between px-3 select-none"
        style={{
          height: '20px',
          background: '#151515',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          fontFamily: "var(--font-jetbrains-mono), monospace",
        }}
      >
        <div className="flex items-center gap-3">
          <span style={{ fontSize: '10px', color: '#c678dd', letterSpacing: '0.04em' }}>
            {langLabel}
          </span>
          {lineCount > 0 && (
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.18)' }}>
              {lineCount.toLocaleString()} lines
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>
            Ln {cursorPos.line}, Col {cursorPos.col}
          </span>
          {charCount > 0 && (
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.14)' }}>
              {charCount.toLocaleString()} chars
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
