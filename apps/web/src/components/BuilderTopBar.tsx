"use client";

import React from "react";
import { Share2, GitPullRequest, GitFork, RefreshCw, ChevronRight } from "lucide-react";
import Link from "next/link";

export type TopMode = "design" | "interact" | "code";

interface BuilderTopBarProps {
  mode: TopMode;
  onModeChange: (mode: TopMode) => void;
  projectName: string;
  activeFile: string;
  devServerActive: boolean;
  webcontainerStatus?: "idle" | "booting" | "ready" | "error";
  onRefresh?: () => void;
}

export const BuilderTopBar: React.FC<BuilderTopBarProps> = ({
  mode,
  onModeChange,
  projectName,
  activeFile,
  devServerActive,
  webcontainerStatus,
  onRefresh,
}) => {
  const pathParts = activeFile ? activeFile.split("/") : [];

  return (
    <header
      className="h-10 shrink-0 flex items-stretch bg-[#1a1a1a] border-b select-none"
      style={{ borderColor: "rgba(255,255,255,0.08)" }}
    >
      {/* Left: Project name + mode switcher */}
      <div className="flex items-stretch border-r" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        {/* Project logo */}
        <Link
          href="/projects"
          className="flex items-center gap-2 px-3 hover:bg-white/5 transition-colors"
        >
          <div className="w-5 h-5 rounded bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-[9px] font-bold text-white">
            W
          </div>
          <span className="text-[11px] font-semibold text-slate-400 hidden sm:block max-w-[120px] truncate">
            {projectName}
          </span>
        </Link>

        {/* Mode tabs */}
        <div className="flex items-stretch">
          {(["design", "interact", "code"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onModeChange(m)}
              className="relative px-4 h-full text-[11px] font-medium capitalize transition-colors hover:bg-white/5"
              style={{
                color: mode === m ? "#ffffff" : "rgba(148,163,184,0.6)",
              }}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
              {mode === m && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-sm"
                  style={{ background: "#a855f7" }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Center: breadcrumb */}
      <div className="flex-1 flex items-center justify-center gap-1 min-w-0 px-4">
        <button
          type="button"
          onClick={onRefresh}
          disabled={!devServerActive}
          className="p-1 rounded hover:bg-white/5 text-slate-600 hover:text-slate-400 disabled:opacity-30 transition-colors mr-1"
          title="Reload preview"
        >
          <RefreshCw size={11} />
        </button>
        <div
          className="flex items-center gap-0.5 text-[10px] font-mono text-slate-600 min-w-0 max-w-sm truncate"
        >
          {pathParts.map((part, i) => (
            <React.Fragment key={i}>
              {i > 0 && (
                <ChevronRight size={10} className="shrink-0 text-slate-700" />
              )}
              <span
                className={
                  i === pathParts.length - 1
                    ? "text-slate-400"
                    : "text-slate-600"
                }
              >
                {part}
              </span>
            </React.Fragment>
          ))}
        </div>
        {/* Live status indicator */}
        {devServerActive && (
          <span className="ml-2 flex items-center gap-1 text-[9px] font-medium text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </span>
        )}
        {webcontainerStatus === "booting" && (
          <span className="ml-2 flex items-center gap-1 text-[9px] font-medium text-amber-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Starting
          </span>
        )}
      </div>

      {/* Right: actions */}
      <div
        className="flex items-center gap-1.5 px-3 border-l"
        style={{ borderColor: "rgba(255,255,255,0.08)" }}
      >
        <ActionBtn icon={<Share2 size={11} />} label="Share" />
        <ActionBtn icon={<GitPullRequest size={11} />} label="Review" />
        <button
          type="button"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-600 hover:bg-purple-500 text-[11px] font-semibold text-white transition-colors shadow-lg shadow-purple-500/20"
        >
          <GitFork size={11} />
          <span className="hidden sm:inline">Create Repo</span>
        </button>
      </div>
    </header>
  );
};

const ActionBtn = ({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) => (
  <button
    type="button"
    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-medium transition-all hover:bg-white/5"
    style={{
      borderColor: "rgba(255,255,255,0.08)",
      color: "rgba(148,163,184,0.7)",
    }}
  >
    {icon}
    <span className="hidden sm:inline">{label}</span>
  </button>
);
