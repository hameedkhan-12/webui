"use client";

import React from "react";
import { Allotment } from "allotment";
import {
  Code2,
  Eye,
  Columns2,
  PanelLeftClose,
  PanelLeft,
  Layers,
} from "lucide-react";
import { WorkspaceFiles, SelectedElement } from "@repo/shared";
import { DEV_SERVER_PORT } from "../lib/defaultProject";
import dynamic from "next/dynamic";
import { FileTree } from "./FileTree";
import { LivePreview } from "./LivePreview";

const CodeEditor = dynamic(
  () => import("./CodeEditor").then((mod) => mod.CodeEditor),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#070913] text-slate-500 italic select-none">
        <div className="animate-pulse flex flex-col items-center gap-2">
          <span>Loading editor...</span>
        </div>
      </div>
    ),
  },
);

export type WorkbenchView = "code" | "preview" | "split";

interface WorkbenchProps {
  files: WorkspaceFiles;
  activeFile: string;
  openTabs: string[];
  view: WorkbenchView;
  onViewChange: (view: WorkbenchView) => void;
  showFileTree: boolean;
  onToggleFileTree: () => void;
  onSelectFile: (name: string) => void;
  onUpdateFile: (path: string, content: string) => void;
  onCloseTab: (name: string) => void;
  folders: string[];
  onCreateFile: (path: string) => void;
  onCreateFolder: (path: string) => void;
  onDeleteFile: (path: string) => void;
  onDeleteFolder: (path: string) => void;
  selectedElement: SelectedElement | null;
  onSelectElement: (element: SelectedElement | null) => void;
  designMode: boolean;
  onAddConsoleLine: (
    line: string,
    type: "info" | "success" | "warning" | "error",
  ) => void;
  devServerActive: boolean;
  onStartDevServer: () => void;
  onDropComponent?: (targetId: string, dragData: string) => void;
  onDeleteElement?: (elementId: string) => void;
  onRuntimeError?: (message: string) => void;
  onFixError?: () => void;
  webcontainerUrl?: string;
  webcontainerStatus?: "idle" | "booting" | "ready" | "error";
}

export const Workbench: React.FC<WorkbenchProps> = ({
  files,
  activeFile,
  openTabs,
  view,
  onViewChange,
  showFileTree,
  onToggleFileTree,
  onSelectFile,
  onUpdateFile,
  onCloseTab,
  folders,
  onCreateFile,
  onCreateFolder,
  onDeleteFile,
  onDeleteFolder,
  selectedElement,
  onSelectElement,
  designMode,
  onAddConsoleLine,
  devServerActive,
  onStartDevServer,
  onDropComponent,
  onDeleteElement,
  onRuntimeError,
  onFixError,
  webcontainerUrl,
  webcontainerStatus,
}) => {
  const showEditor = view === "code" || view === "split";
  const showPreview = view === "preview" || view === "split";

  return (
    <div className="w-full h-full flex flex-col bg-[#070913] min-h-0">
      {/* Bolt-style workbench toolbar */}
      <div className="h-10 shrink-0 border-b border-white/5 px-3 flex items-center justify-between bg-slate-950/70 select-none">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleFileTree}
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-200 hover:bg-white/5 transition-colors"
            title={showFileTree ? "Hide files" : "Show files"}
          >
            {showFileTree ? (
              <PanelLeftClose size={14} />
            ) : (
              <PanelLeft size={14} />
            )}
          </button>
          <div className="flex rounded-lg bg-slate-900/80 border border-white/5 p-0.5">
            <ViewButton
              active={view === "code"}
              onClick={() => onViewChange("code")}
              icon={<Code2 size={12} />}
              label="Code"
            />
            <ViewButton
              active={view === "split"}
              onClick={() => onViewChange("split")}
              icon={<Columns2 size={12} />}
              label="Split"
            />
            <ViewButton
              active={view === "preview"}
              onClick={() => onViewChange("preview")}
              icon={<Eye size={12} />}
              label="Preview"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          {devServerActive ? (
            <span className="flex items-center gap-1.5 text-emerald-400/90 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Next.js · :{DEV_SERVER_PORT}
            </span>
          ) : (
            <span className="text-slate-600">Run npm run dev</span>
          )}
          {designMode && (
            <span className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-300">
              <Layers size={10} />
              Inspect
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <Allotment>
          {showFileTree && (
            <Allotment.Pane minSize={140} maxSize={280} preferredSize={200}>
              <FileTree
                files={files}
                folders={folders}
                activeFile={activeFile}
                onSelectFile={onSelectFile}
                onCreateFile={onCreateFile}
                onCreateFolder={onCreateFolder}
                onDeleteFile={onDeleteFile}
                onDeleteFolder={onDeleteFolder}
              />
            </Allotment.Pane>
          )}

          {showEditor && showPreview && (
            <>
              <Allotment.Pane minSize={240}>
                <CodeEditor
                  files={files}
                  activeFile={activeFile}
                  onUpdateFile={onUpdateFile}
                  onSelectFile={onSelectFile}
                  openTabs={openTabs}
                  onCloseTab={onCloseTab}
                  selectedElementId={selectedElement?.id}
                />
              </Allotment.Pane>
              <Allotment.Pane minSize={280} preferredSize={420}>
                <LivePreview
                  files={files}
                  onSelectElement={onSelectElement}
                  selectedElement={selectedElement}
                  designMode={designMode}
                  onAddConsoleLine={onAddConsoleLine}
                  devServerActive={devServerActive}
                  onStartDevServer={onStartDevServer}
                  onDropComponent={onDropComponent}
                  onDeleteElement={onDeleteElement}
                  onRuntimeError={onRuntimeError}
                  onFixError={onFixError}
                  webcontainerUrl={webcontainerUrl}
                  webcontainerStatus={webcontainerStatus}
                />
              </Allotment.Pane>
            </>
          )}

          {showEditor && !showPreview && (
            <Allotment.Pane minSize={200}>
              <CodeEditor
                files={files}
                activeFile={activeFile}
                onUpdateFile={onUpdateFile}
                onSelectFile={onSelectFile}
                openTabs={openTabs}
                onCloseTab={onCloseTab}
                selectedElementId={selectedElement?.id}
              />
            </Allotment.Pane>
          )}

          {!showEditor && showPreview && (
            <Allotment.Pane minSize={200}>
              <LivePreview
                files={files}
                onSelectElement={onSelectElement}
                selectedElement={selectedElement}
                designMode={designMode}
                onAddConsoleLine={onAddConsoleLine}
                devServerActive={devServerActive}
                onStartDevServer={onStartDevServer}
                onDropComponent={onDropComponent}
                onDeleteElement={onDeleteElement}
                onRuntimeError={onRuntimeError}
                onFixError={onFixError}
                webcontainerUrl={webcontainerUrl}
                webcontainerStatus={webcontainerStatus}
              />
            </Allotment.Pane>
          )}
        </Allotment>
      </div>
    </div>
  );
};

function ViewButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all ${
        active
          ? "bg-purple-600/15 text-purple-300 border border-purple-500/25"
          : "text-slate-500 hover:text-slate-300 border border-transparent"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
