"use client";

import React from "react";
import {
  Terminal as TermIcon,
  ListFilter,
  ChevronRight,
  CornerDownLeft,
} from "lucide-react";
import { WorkspaceFiles, TerminalLine } from "@repo/shared";
import { parsePackageDeps } from "../lib/defaultProject";

interface TerminalProps {
  files: WorkspaceFiles;
  consoleLines: TerminalLine[];
  onClearConsole: () => void;
  onAddConsoleLine: (
    text: string,
    type: "info" | "success" | "warning" | "error" | "input",
  ) => void;
  onUpdateFile: (path: string, content: string) => void;
  onSetDevServerActive?: (active: boolean) => void;
  terminalHistory: TerminalLine[];
  setTerminalHistory: React.Dispatch<React.SetStateAction<TerminalLine[]>>;
}

export const Terminal: React.FC<TerminalProps> = ({
  files,
  consoleLines,
  onClearConsole,
  onAddConsoleLine,
  onUpdateFile,
  onSetDevServerActive,
  terminalHistory,
  setTerminalHistory,
}) => {
  const [activeTab, setActiveTab] = React.useState<"terminal" | "console">(
    "terminal",
  );
  const [terminalInput, setTerminalInput] = React.useState("");
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [terminalHistory, consoleLines, activeTab]);

  const runNpmInstall = (pkgArg: string, history: TerminalLine[]) => {
    const pkgJson = files["package.json"];
    if (!pkgArg) {
      history.push({ text: "npm install", type: "info" });
      history.push({
        text: "Installing dependencies from package.json...",
        type: "info",
      });
      const deps = pkgJson ? parsePackageDeps(pkgJson.content) : {};
      const names = Object.keys(deps);
      if (names.length === 0) {
        history.push({
          text: "No dependencies listed in package.json",
          type: "warning",
        });
        return;
      }
      names.forEach((name) => {
        history.push({ text: `+ ${name}@${deps[name]}`, type: "success" });
      });
      history.push({
        text: `added ${names.length} packages, audited ${names.length + 12} packages in 2.1s`,
        type: "success",
      });
      return;
    }

    const packages = pkgArg.split(/\s+/).filter(Boolean);
    history.push({ text: `npm install ${packages.join(" ")}`, type: "info" });

    if (pkgJson) {
      try {
        const pkgData = JSON.parse(pkgJson.content) as {
          dependencies?: Record<string, string>;
          devDependencies?: Record<string, string>;
        };
        pkgData.dependencies = pkgData.dependencies || {};
        for (const name of packages) {
          const version =
            name.includes("@") && name.indexOf("@") > 0
              ? name.split("@").slice(1).join("@")
              : "latest";
          const pkgName = name.includes("@") ? name.split("@")[0] : name;
          if (!pkgName) continue;
          pkgData.dependencies[pkgName] = version === name ? "latest" : version;
          history.push({
            text: `+ ${pkgName}@${pkgData.dependencies[pkgName]}`,
            type: "success",
          });
        }
        onUpdateFile("package.json", JSON.stringify(pkgData, null, 2));
        history.push({ text: "updated package.json", type: "success" });
      } catch {
        history.push({ text: "Could not parse package.json", type: "error" });
      }
    }
  };

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = terminalInput.trim();
    if (!cmd) return;

    const newHistory: TerminalLine[] = [
      ...terminalHistory,
      { text: `~/project $ ${cmd}`, type: "input" },
    ];
    setTerminalInput("");

    const parts = cmd.split(/\s+/);
    const commandName = parts[0]?.toLowerCase() ?? "";
    const arg = parts.slice(1).join(" ");

    switch (commandName) {
      case "help":
        newHistory.push(
          { text: "Commands:", type: "info" },
          {
            text: "  npm install [pkg...]  — install deps (or all from package.json)",
            type: "info",
          },
          {
            text: "  npm run dev           — start Next.js dev server (port 3000)",
            type: "info",
          },
          { text: "  npm run build         — production build", type: "info" },
          { text: "  ls · cat <file> · clear", type: "info" },
        );
        break;

      case "ls":
        newHistory.push({
          text: Object.keys(files).sort().join("  "),
          type: "success",
        });
        break;

      case "cat":
        if (!arg) {
          newHistory.push({ text: "Usage: cat src/App.tsx", type: "error" });
        } else if (!files[arg]) {
          newHistory.push({ text: `No such file: ${arg}`, type: "error" });
        } else {
          files[arg].content.split("\n").forEach((line) => {
            newHistory.push({ text: line, type: "info" });
          });
        }
        break;

      case "clear":
        setTerminalHistory([]);
        return;

      case "npm": {
        const sub = parts[1]?.toLowerCase();
        if (sub === "install" || sub === "i") {
          runNpmInstall(parts.slice(2).join(" "), newHistory);
        } else if (parts[1] === "run" && parts[2] === "build") {
          newHistory.push(
            { text: "next build — compiling App Router...", type: "info" },
            { text: "✓ Compiled successfully", type: "success" },
          );
        } else if (parts[1] === "run" && parts[2] === "dev") {
          newHistory.push(
            { text: "> next dev", type: "info" },
            { text: "   ▲ Next.js 15.4", type: "info" },
            {
              text: "   - Local:        http://localhost:3000",
              type: "success",
            },
            { text: "   ✓ Ready in 1.2s", type: "success" },
          );
          onSetDevServerActive?.(true);
          onAddConsoleLine("Next.js dev server started", "success");
        } else {
          newHistory.push({
            text: "Try: npm install · npm run dev · npm run build",
            type: "warning",
          });
        }
        break;
      }

      default:
        newHistory.push({
          text: `Unknown command: ${commandName}`,
          type: "error",
        });
    }

    setTerminalHistory(newHistory);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#070913] border-t border-white/5 min-h-0">
      <div className="h-9 shrink-0 px-3 flex items-center justify-between border-b border-white/5 bg-slate-950/50 select-none">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setActiveTab("terminal")}
            className={`flex items-center gap-1 py-1.5 text-[10px] font-semibold border-b-2 transition-colors ${
              activeTab === "terminal"
                ? "border-purple-500 text-purple-400"
                : "border-transparent text-slate-500"
            }`}
          >
            <TermIcon size={11} />
            Terminal
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("console")}
            className={`flex items-center gap-1 py-1.5 text-[10px] font-semibold border-b-2 transition-colors ${
              activeTab === "console"
                ? "border-purple-500 text-purple-400"
                : "border-transparent text-slate-500"
            }`}
          >
            <ListFilter size={11} />
            Console
            {consoleLines.length > 0 && (
              <span className="ml-1 px-1 rounded bg-purple-500/15 text-purple-300 text-[9px]">
                {consoleLines.length}
              </span>
            )}
          </button>
        </div>
        <button
          type="button"
          onClick={
            activeTab === "terminal"
              ? () => setTerminalHistory([])
              : onClearConsole
          }
          className="text-[9px] font-semibold uppercase tracking-wide text-slate-600 hover:text-purple-400"
        >
          Clear
        </button>
      </div>

      <div className="flex-1 min-h-0 p-3 font-mono text-[11px] leading-relaxed overflow-y-auto bg-black/30 select-text aura-scroll">
        {activeTab === "terminal" ? (
          <div className="space-y-1">
            {terminalHistory.map((line, idx) => (
              <div
                key={idx}
                className={
                  line.type === "error"
                    ? "text-rose-400"
                    : line.type === "success"
                      ? "text-emerald-400"
                      : line.type === "warning"
                        ? "text-amber-400"
                        : line.type === "input"
                          ? "text-purple-300"
                          : "text-slate-500"
                }
              >
                {line.text}
              </div>
            ))}
            <form
              onSubmit={handleCommandSubmit}
              className="flex items-center gap-1.5 mt-2"
            >
              <ChevronRight size={12} className="text-purple-500 shrink-0" />
              <input
                type="text"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                placeholder="npm run dev"
                className="flex-1 bg-transparent text-slate-200 outline-none placeholder:text-slate-700 text-[11px]"
                autoComplete="off"
                spellCheck={false}
              />
              <CornerDownLeft size={9} className="text-slate-700 shrink-0" />
            </form>
            <div ref={bottomRef} />
          </div>
        ) : (
          <div className="space-y-1">
            {consoleLines.length === 0 ? (
              <p className="text-slate-600 italic text-center py-4">
                No console output yet
              </p>
            ) : (
              consoleLines.map((line, idx) => (
                <div
                  key={idx}
                  className={
                    line.type === "error"
                      ? "text-rose-400"
                      : line.type === "warning"
                        ? "text-amber-400"
                        : line.type === "success"
                          ? "text-emerald-400/90"
                          : "text-slate-500"
                  }
                >
                  {line.text}
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  );
};
