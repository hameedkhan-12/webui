"use client";

import React from "react";
import {
  ChevronRight,
  ChevronDown,
  FilePlus,
  FolderPlus,
  Trash2,
  X,
  Folder,
  FolderOpen,
} from "lucide-react";
import { WorkspaceFiles } from "@repo/shared";
import { parseComponentMetaFromSource } from "@aura/component-registry";
import { PROTECTED_FILES } from "../lib/defaultProject";
import { getAllFolderPaths, normalizePath } from "../lib/workspaceFs";

/* ─────────────────────────────────────────────────────────
   File icon — exported so CodeEditor can reuse it in tabs
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

const FILE_ICON_STYLES: Record<
  FileKind,
  { label: string; color: string; bg: string }
> = {
  tsx: { label: "TSX", color: "text-blue-400", bg: "bg-blue-500/10" },
  ts: { label: "TS", color: "text-blue-400", bg: "bg-blue-500/10" },
  jsx: { label: "JSX", color: "text-sky-400", bg: "bg-sky-500/10" },
  js: { label: "JS", color: "text-yellow-400", bg: "bg-yellow-500/10" },
  css: { label: "CSS", color: "text-cyan-400", bg: "bg-cyan-500/10" },
  json: { label: "{}", color: "text-amber-400", bg: "bg-amber-500/10" },
  html: { label: "HTM", color: "text-orange-400", bg: "bg-orange-500/10" },
  md: { label: "MD", color: "text-slate-400", bg: "bg-slate-500/10" },
  other: { label: "TXT", color: "text-slate-500", bg: "bg-slate-600/10" },
};

export function getFileIcon(filePath: string) {
  const kind = getFileKind(filePath);
  const { label, color, bg } = FILE_ICON_STYLES[kind];
  return (
    <span
      className={`inline-flex items-center justify-center w-[30px] h-[16px] rounded text-[8px] font-bold font-mono shrink-0 ${color} ${bg}`}
    >
      {label}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────
   Tree building
───────────────────────────────────────────────────────── */
type FolderNode = {
  type: "folder";
  name: string;
  path: string;
  children: TreeNode[];
};
type FileNode = { type: "file"; path: string };
type TreeNode = FolderNode | FileNode;

function buildTree(
  files: WorkspaceFiles,
  explicitFolders: string[],
): TreeNode[] {
  const root: TreeNode[] = [];
  const filePaths = Object.keys(files).map(normalizePath);

  const addPath = (path: string, isFile: boolean) => {
    const parts = path.split("/").filter(Boolean);
    if (parts.length === 0) return;
    let level = root;
    let currentPath = "";
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!;
      const isLast = i === parts.length - 1;
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      if (isLast && isFile) {
        if (!level.some((n) => n.type === "file" && n.path === path)) {
          level.push({ type: "file", path });
        }
        return;
      }
      let folder = level.find((n) => n.type === "folder" && n.name === part) as
        | FolderNode
        | undefined;
      if (!folder) {
        folder = {
          type: "folder",
          name: part,
          path: currentPath,
          children: [],
        };
        level.push(folder);
      }
      level = folder.children;
    }
  };

  for (const fp of filePaths) addPath(fp, true);
  const allFolders = getAllFolderPaths(files, explicitFolders);
  for (const folderPath of allFolders) {
    if (!filePaths.some((fp) => fp === folderPath)) addPath(folderPath, false);
  }

  const sort = (nodes: TreeNode[]): TreeNode[] =>
    nodes
      .map((n) =>
        n.type === "folder" ? { ...n, children: sort(n.children) } : n,
      )
      .sort((a, b) => {
        if (a.type === "folder" && b.type === "file") return -1;
        if (a.type === "file" && b.type === "folder") return 1;
        const aName = a.type === "folder" ? a.name : a.path.split("/").pop()!;
        const bName = b.type === "folder" ? b.name : b.path.split("/").pop()!;
        return aName.localeCompare(bName);
      });

  return sort(root);
}

function folderIsProtected(files: WorkspaceFiles, folderPath: string): boolean {
  const root = normalizePath(folderPath);
  return Object.keys(files).some((p) => {
    const np = normalizePath(p);
    return (
      PROTECTED_FILES.has(np) && (np === root || np.startsWith(`${root}/`))
    );
  });
}

/* ─────────────────────────────────────────────────────────
   Recursive tree items
───────────────────────────────────────────────────────── */
function TreeItems({
  nodes,
  activeFile,
  depth,
  collapsed,
  onToggleFolder,
  onSelectFile,
  onDeleteFile,
  onDeleteFolder,
  onCreateInFolder,
  files,
}: {
  nodes: TreeNode[];
  activeFile: string;
  depth: number;
  collapsed: Set<string>;
  onToggleFolder: (path: string) => void;
  onSelectFile: (path: string) => void;
  onDeleteFile: (path: string) => void;
  onDeleteFolder: (path: string) => void;
  onCreateInFolder: (folderPath: string, kind: "file" | "folder") => void;
  files: WorkspaceFiles;
}) {
  return (
    <>
      {nodes.map((node) => {
        if (node.type === "folder") {
          const isOpen = !collapsed.has(node.path);
          const isProtected = folderIsProtected(files, node.path);

          return (
            <div key={node.path}>
              {/* Folder row */}
              <div
                className="group/folder relative flex items-center gap-0 pr-1 h-7 rounded-md hover:bg-white/[0.04] cursor-pointer select-none"
                style={{ paddingLeft: `${depth * 12 + 6}px` }}
              >
                {/* Indent guide */}
                {depth > 0 && (
                  <span
                    className="absolute left-0 top-0 bottom-0 w-px bg-white/[0.05]"
                    style={{ left: `${depth * 12}px` }}
                  />
                )}

                <button
                  type="button"
                  onClick={() => onToggleFolder(node.path)}
                  className="flex-1 flex items-center gap-1.5 min-w-0 py-1"
                >
                  <span className="text-slate-600 shrink-0">
                    {isOpen ? (
                      <ChevronDown size={11} />
                    ) : (
                      <ChevronRight size={11} />
                    )}
                  </span>
                  <span className="shrink-0">
                    {isOpen ? (
                      <FolderOpen size={13} className="text-amber-400/90" />
                    ) : (
                      <Folder size={13} className="text-amber-500/70" />
                    )}
                  </span>
                  <span className="text-[11px] font-medium text-slate-400 group-hover/folder:text-slate-200 transition-colors truncate">
                    {node.name}
                  </span>
                </button>

                {/* Folder actions (hover) */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover/folder:opacity-100 transition-opacity shrink-0">
                  <ActionBtn
                    title="New file"
                    onClick={() => onCreateInFolder(node.path, "file")}
                  >
                    <FilePlus size={10} />
                  </ActionBtn>
                  <ActionBtn
                    title="New folder"
                    onClick={() => onCreateInFolder(node.path, "folder")}
                  >
                    <FolderPlus size={10} />
                  </ActionBtn>
                  {!isProtected && (
                    <ActionBtn
                      title="Delete folder"
                      danger
                      onClick={() => onDeleteFolder(node.path)}
                    >
                      <Trash2 size={10} />
                    </ActionBtn>
                  )}
                </div>
              </div>

              {/* Children */}
              {isOpen && node.children.length > 0 && (
                <div className="relative">
                  {/* Continuous indent guide line */}
                  <span
                    className="absolute top-0 bottom-0 w-px bg-white/[0.04]"
                    style={{ left: `${(depth + 1) * 12}px` }}
                  />
                  <TreeItems
                    nodes={node.children}
                    activeFile={activeFile}
                    depth={depth + 1}
                    collapsed={collapsed}
                    onToggleFolder={onToggleFolder}
                    onSelectFile={onSelectFile}
                    onDeleteFile={onDeleteFile}
                    onDeleteFolder={onDeleteFolder}
                    onCreateInFolder={onCreateInFolder}
                    files={files}
                  />
                </div>
              )}
            </div>
          );
        }

        /* File row */
        const isActive = activeFile === node.path;
        const isProtected = PROTECTED_FILES.has(node.path);
        const fileName = node.path.split("/").pop() ?? node.path;
        const isGeneratedComponent = Boolean(
          files[node.path] &&
            parseComponentMetaFromSource(node.path, files[node.path].content),
        );

        return (
          <div
            key={node.path}
            onClick={() => onSelectFile(node.path)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && onSelectFile(node.path)}
            className={[
              "group relative flex items-center gap-2 pr-2 h-7 rounded-md cursor-pointer select-none transition-colors duration-75",
              isActive
                ? "bg-purple-500/10 text-slate-100"
                : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]",
            ].join(" ")}
            style={{ paddingLeft: `${depth * 12 + 22}px` }}
          >
            {/* Indent guide */}
            {depth > 0 && (
              <span
                className="absolute top-0 bottom-0 w-px bg-white/[0.04]"
                style={{ left: `${depth * 12}px` }}
              />
            )}

            {/* Active file left accent */}
            {isActive && (
              <span className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-purple-500" />
            )}

            {getFileIcon(node.path)}

            <span
              className={`text-[11px] font-medium truncate flex-1 ${isActive ? "text-slate-200" : ""}`}
            >
              {fileName}
            </span>

            {!isProtected && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteFile(node.path);
                }}
                className="flex-none opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-700 hover:text-rose-400 transition-colors"
                title="Delete file"
              >
                <Trash2 size={10} />
              </button>
            )}
          </div>
        );
      })}
    </>
  );
}

/* Tiny action button used in folder rows */
function ActionBtn({
  children,
  title,
  danger = false,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`p-0.5 rounded transition-colors ${
        danger
          ? "text-slate-700 hover:text-rose-400"
          : "text-slate-700 hover:text-purple-400"
      }`}
    >
      {children}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────
   FileTree root
───────────────────────────────────────────────────────── */
interface FileTreeProps {
  files: WorkspaceFiles;
  folders: string[];
  activeFile: string;
  onSelectFile: (path: string) => void;
  onCreateFile: (path: string) => void;
  onCreateFolder: (path: string) => void;
  onDeleteFile: (path: string) => void;
  onDeleteFolder: (path: string) => void;
}

export const FileTree: React.FC<FileTreeProps> = ({
  files,
  folders,
  activeFile,
  onSelectFile,
  onCreateFile,
  onCreateFolder,
  onDeleteFile,
  onDeleteFolder,
}) => {
  const [createMode, setCreateMode] = React.useState<"file" | "folder" | null>(
    null,
  );
  const [newPath, setNewPath] = React.useState("");
  const [baseFolder, setBaseFolder] = React.useState("");
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());
  const inputRef = React.useRef<HTMLInputElement>(null);

  const tree = buildTree(files, folders);
  const fileCount = Object.keys(files).length;

  const openCreate = (mode: "file" | "folder", folder = "") => {
    setCreateMode(mode);
    setBaseFolder(folder);
    setNewPath("");
  };

  React.useEffect(() => {
    if (createMode) inputRef.current?.focus();
  }, [createMode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newPath.trim();
    if (!name) return;
    const fullPath = baseFolder
      ? `${normalizePath(baseFolder)}/${normalizePath(name)}`
      : normalizePath(name);
    if (createMode === "folder") onCreateFolder(fullPath);
    else onCreateFile(fullPath);
    setNewPath("");
    setCreateMode(null);
    setBaseFolder("");
  };

  const cancelCreate = () => {
    setCreateMode(null);
    setBaseFolder("");
    setNewPath("");
  };

  const toggleFolder = (path: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#040810] border-r border-white/[0.06] select-none overflow-hidden">
      {/* ── Header ── */}
      <div className="flex-none flex items-center justify-between px-3 h-10 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 min-w-0">
          <FolderOpen size={13} className="text-purple-400/80 shrink-0" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            Files
          </span>
          <span className="text-[9px] text-slate-700 font-mono ml-0.5">
            {fileCount}
          </span>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <ActionBtn title="New file" onClick={() => openCreate("file")}>
            <FilePlus size={13} />
          </ActionBtn>
          <ActionBtn title="New folder" onClick={() => openCreate("folder")}>
            <FolderPlus size={13} />
          </ActionBtn>
        </div>
      </div>

      {/* ── Inline create form ── */}
      {createMode && (
        <form
          onSubmit={handleSubmit}
          className="flex-none px-2 py-2 border-b border-white/[0.06] bg-[#070913]/60"
        >
          <div className="flex items-center gap-1 mb-1.5">
            <span className="text-[9px] font-semibold uppercase tracking-widest text-purple-400/80">
              {createMode === "folder" ? "New folder" : "New file"}
            </span>
            {baseFolder && (
              <span className="text-[9px] text-slate-600 truncate">
                in {baseFolder}/
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 bg-[#070913] border border-white/[0.08] rounded-lg px-2.5 py-1.5 focus-within:border-purple-500/40 transition-colors">
            {baseFolder && (
              <span className="text-[10px] text-slate-600 shrink-0 font-mono">
                {baseFolder}/
              </span>
            )}
            <input
              ref={inputRef}
              type="text"
              value={newPath}
              onChange={(e) => setNewPath(e.target.value)}
              placeholder={
                createMode === "folder" ? "components" : "Button.tsx"
              }
              className="flex-1 bg-transparent text-[11px] text-white outline-none placeholder:text-slate-700 font-mono min-w-0"
              onKeyDown={(e) => e.key === "Escape" && cancelCreate()}
            />
            <button
              type="button"
              onClick={cancelCreate}
              className="text-slate-700 hover:text-slate-400 transition-colors shrink-0"
            >
              <X size={11} />
            </button>
          </div>
        </form>
      )}

      {/* ── Tree ── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-1.5 px-1.5 space-y-px aura-scroll">
        {tree.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-slate-700">
            <FolderOpen size={24} strokeWidth={1} />
            <span className="text-[10px]">No files yet</span>
          </div>
        ) : (
          <TreeItems
            nodes={tree}
            activeFile={activeFile}
            depth={0}
            collapsed={collapsed}
            onToggleFolder={toggleFolder}
            onSelectFile={onSelectFile}
            onDeleteFile={onDeleteFile}
            onDeleteFolder={onDeleteFolder}
            onCreateInFolder={(folder, kind) => openCreate(kind, folder)}
            files={files}
          />
        )}
      </div>
    </div>
  );
};
