"use client";

import React from "react";
import {
  MessageSquare, Paintbrush, Layers, MessageCircle, ChevronLeft, ChevronRight, Blocks,
} from "lucide-react";
import { WorkspaceFiles, SelectedElement, ChatSession, ChatMessage, Operation } from "@repo/shared";
import { ChatSidebar } from "./ChatSidebar";
import { LayersPanel } from "./LayersPanel";
import { StylePanel } from "./StylePanel";
import { ComponentDrawer } from "./ComponentDrawer";

export type LeftPanelTab = "agent" | "style" | "layers" | "library" | "comments";

interface BuilderLeftPanelProps {
  // Tab state
  activeTab: LeftPanelTab;
  onTabChange: (tab: LeftPanelTab) => void;

  // Common
  files: WorkspaceFiles;
  activeFile: string;
  selectedElement: SelectedElement | null;
  onSelectElement: (el: SelectedElement | null) => void;
  onUpdateElement: (
    filePath: string,
    elementId: string,
    updatedProps: { text?: string; classes?: string[] },
  ) => void;
  onUpdateArrayItemField: (
    filePath: string,
    iterableName: string,
    index: number,
    key: string,
    value: string,
  ) => void;
  onSelectLayer: (dataId: string, tag: string, classes: string[]) => void;
  onInsertComponent: (dragData: string) => void;

  // Chat / Agent
  sessions: ChatSession[];
  activeSessionId: string | null;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onCancelMessage: () => void;
  isGenerating: boolean;
  lastCompileError: string | null;
  activeModel: string;
  onSelectModel: (model: string) => void;
  onNewSession: () => void;
  onSwitchSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onFixError: () => void;
}

const TABS = [
  { id: "agent"    as LeftPanelTab, label: "Agent",     icon: MessageSquare,  shortLabel: "A" },
  { id: "style"    as LeftPanelTab, label: "Style",     icon: Paintbrush,     shortLabel: "S" },
  { id: "layers"   as LeftPanelTab, label: "Layers",    icon: Layers,         shortLabel: "L" },
  { id: "library"  as LeftPanelTab, label: "Library",   icon: Blocks,         shortLabel: "B" },
  { id: "comments" as LeftPanelTab, label: "Comments",  icon: MessageCircle,  shortLabel: "C" },
] as const;

export const BuilderLeftPanel: React.FC<BuilderLeftPanelProps> = ({
  activeTab,
  onTabChange,
  files,
  activeFile,
  selectedElement,
  onSelectElement,
  onUpdateElement,
  onUpdateArrayItemField,
  onSelectLayer,
  onInsertComponent,
  sessions,
  activeSessionId,
  messages,
  onSendMessage,
  onCancelMessage,
  isGenerating,
  lastCompileError,
  activeModel,
  onSelectModel,
  onNewSession,
  onSwitchSession,
  onDeleteSession,
  onFixError,
}) => {
  const [collapsed, setCollapsed] = React.useState(false);

  return (
    <div
      className="flex shrink-0 h-full"
      style={{
        width: collapsed ? "40px" : "280px",
        transition: "width 0.2s ease",
        minWidth: collapsed ? "40px" : "220px",
        maxWidth: collapsed ? "40px" : "360px",
      }}
    >
      {/* Icon rail */}
      <div
        className="flex flex-col items-center py-2 gap-1 border-r shrink-0"
        style={{
          width: "40px",
          background: "#141414",
          borderColor: "rgba(255,255,255,0.07)",
        }}
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              title={tab.label}
              onClick={() => {
                if (collapsed) setCollapsed(false);
                onTabChange(tab.id);
              }}
              className="relative w-8 h-8 flex items-center justify-center rounded-md transition-all"
              style={{
                color: isActive ? "#a78bfa" : "rgba(148,163,184,0.4)",
                background: isActive ? "color-mix(in oklch, var(--ring) 12%, transparent)" : "transparent",
              }}
            >
              <Icon size={14} />
              {isActive && (
                <span
                  className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r-sm"
                  style={{ background: "var(--ring)" }}
                />
              )}
            </button>
          );
        })}

        <div className="flex-1" />

        {/* Collapse toggle */}
        <button
          type="button"
          title={collapsed ? "Expand panel" : "Collapse panel"}
          onClick={() => setCollapsed((v) => !v)}
          className="w-8 h-8 flex items-center justify-center rounded-md transition-colors"
          style={{ color: "rgba(148,163,184,0.3)" }}
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      </div>

      {/* Panel content */}
      {!collapsed && (
        <div
          className="flex flex-col flex-1 min-w-0 overflow-hidden border-r"
          style={{
            background: "#1a1a1a",
            borderColor: "rgba(255,255,255,0.07)",
          }}
        >
          {/* Tab header */}
          <div
            className="shrink-0 flex items-center border-b"
            style={{ borderColor: "rgba(255,255,255,0.06)", height: "36px" }}
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  className="relative px-3 h-full text-[11px] font-medium transition-colors"
                  style={{
                    color: isActive ? "#e2e8f0" : "rgba(148,163,184,0.45)",
                  }}
                >
                  {tab.label}
                  {isActive && (
                    <span
                      className="absolute bottom-0 left-0 right-0 h-[2px]"
                      style={{ background: "var(--ring)" }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Content area */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {activeTab === "agent" && (
              <ChatSidebar
                sessions={sessions}
                activeSessionId={activeSessionId}
                messages={messages}
                onSendMessage={onSendMessage}
                onCancelMessage={onCancelMessage}
                isGenerating={isGenerating}
                lastCompileError={lastCompileError}
                activeModel={activeModel}
                onSelectModel={onSelectModel}
                onNewSession={onNewSession}
                onSwitchSession={onSwitchSession}
                onDeleteSession={onDeleteSession}
                onFixError={onFixError}
              />
            )}

            {activeTab === "style" && (
              <StylePanel
                selectedElement={selectedElement}
                onClose={() => onSelectElement(null)}
                onUpdateElement={onUpdateElement}
                onUpdateArrayItemField={onUpdateArrayItemField}
              />
            )}

            {activeTab === "layers" && (
              <LayersPanel
                files={files}
                activeFile={activeFile}
                selectedElement={selectedElement}
                onSelectLayer={onSelectLayer}
              />
            )}

            {activeTab === "library" && (
              <ComponentDrawer onInsertComponent={onInsertComponent} />
            )}

            {activeTab === "comments" && (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <MessageCircle size={24} className="text-slate-700 mb-3" />
                <p className="text-[11px] font-medium text-slate-500">Comments</p>
                <p className="text-[10px] text-slate-700 mt-1">
                  Comment threads coming soon
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
