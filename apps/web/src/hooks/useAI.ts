// apps/web/src/hooks/useAI.ts
import React from "react";
import { useAuth } from "@clerk/nextjs";
import {
  ChatMessage,
  ChatSession,
  WorkspaceFiles,
  Operation,
} from "@repo/shared";
import {
  startAiGeneration,
  pollAiJob,
  cancelAiJob,
  streamAiGeneration,
} from "../lib/aiStreamingApi";
import { DEFAULT_PROJECT_ID } from "../lib/workspaceApi";
import { APP_ENTRY } from "../lib/defaultProject";
import { normalizePath } from "../lib/workspaceFs";
import { tagWithCounter } from "@aura/ast-engine";

interface UseAiProps {
  files: WorkspaceFiles;
  folders: string[];
  elementCounter: number;
  devServerActive: boolean;
  lastCompileError: string | null;
  setFiles: React.Dispatch<React.SetStateAction<WorkspaceFiles>>;
  setElementCounter: React.Dispatch<React.SetStateAction<number>>;
  setOpenTabs: React.Dispatch<React.SetStateAction<string[]>>;
  setActiveFile: React.Dispatch<React.SetStateAction<string>>;
  setLastCompileError: React.Dispatch<React.SetStateAction<string | null>>;
  handleAddConsoleLine: (
    text: string,
    type: "info" | "success" | "warning" | "error" | "input",
  ) => void;
  simulateTerminalBuildAndStart: (currentFiles: WorkspaceFiles) => void;
  handleStartDevServer: () => void;
  executeTransaction: (
    ops: Operation[],
    label: string,
    source: "ai" | "drag_drop" | "inspector" | "code_editor" | "system",
  ) => void;
  workspaceReady: boolean;
  projectId: string;
  webcontainerStatus?: "idle" | "booting" | "ready" | "error";
  /** Force a full workspace save to the DB (called after AI generation finishes) */
  saveImmediately?: () => Promise<void>;
  /** Ref to suppress autosave timer while AI is streaming files */
  isAiGeneratingRef?: React.MutableRefObject<boolean>;
}

const SESSIONS_FILE = "chat-sessions.json";

function deserializeSessions(raw: string): ChatSession[] {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((s: any) => ({
      ...s,
      createdAt: new Date(s.createdAt),
      updatedAt: new Date(s.updatedAt),
      messages: (s.messages ?? []).map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp),
      })),
    }));
  } catch {
    return [];
  }
}

export function useAI({
  files,
  folders,
  elementCounter,
  devServerActive,
  lastCompileError,
  setFiles,
  setElementCounter,
  setOpenTabs,
  setActiveFile,
  setLastCompileError,
  handleAddConsoleLine,
  simulateTerminalBuildAndStart,
  handleStartDevServer,
  executeTransaction,
  workspaceReady,
  projectId,
  webcontainerStatus = "idle",
  saveImmediately,
  isAiGeneratingRef,
}: UseAiProps) {
  const { getToken } = useAuth();

  // ─── Session state ────────────────────────────────────────────────
  const [sessions, setSessionsState] = React.useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = React.useState<string | null>(
    null,
  );
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [activeModel, setActiveModel] = React.useState("Claude Sonnet");

  const lastActionWasAiRef = React.useRef(false);
  const aiAutoFixCountRef = React.useRef(0);
  const loadedRef = React.useRef(false);

  // Derived: current session messages
  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;
  const messages: ChatMessage[] = activeSession?.messages ?? [];

  // ─── Persist sessions ────────────────────────────────────────────
  const persistSessions = React.useCallback(
    (next: ChatSession[]) => {
      const content = JSON.stringify(next, null, 2);
      const exists = SESSIONS_FILE in files;
      const op = exists
        ? {
            type: "UPDATE_FILE_RAW" as const,
            payload: { path: SESSIONS_FILE, content },
          }
        : {
            type: "CREATE_FILE" as const,
            payload: { path: SESSIONS_FILE, template: content },
          };
      setTimeout(
        () => executeTransaction([op], "Save Chat Sessions", "system"),
        0,
      );
    },
    [files, executeTransaction],
  );

  const setSessions = React.useCallback(
    (update: ChatSession[] | ((prev: ChatSession[]) => ChatSession[])) => {
      setSessionsState((prev) => {
        const next = typeof update === "function" ? update(prev) : update;
        persistSessions(next);
        return next;
      });
    },
    [persistSessions],
  );

  const lastProjectIdRef = React.useRef<string>("");

  // ─── Load from workspace file ─────────────────────────────────────
  React.useEffect(() => {
    if (!workspaceReady) return;
    const isNewProject = lastProjectIdRef.current !== projectId;
    if (!isNewProject && loadedRef.current) return;

    const raw = files[SESSIONS_FILE]?.content;
    if (raw) {
      const loaded = deserializeSessions(raw);
      if (loaded.length > 0) {
        setSessionsState(loaded);
        // Activate the most recently updated session
        const latest = [...loaded].sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        )[0];
        setActiveSessionId(latest.id);
      } else {
        setSessionsState([]);
        setActiveSessionId(null);
      }
    } else {
      setSessionsState([]);
      setActiveSessionId(null);
    }
    loadedRef.current = true;
    lastProjectIdRef.current = projectId;
  }, [workspaceReady, projectId, files[SESSIONS_FILE]?.content]);

  // ─── Session management ───────────────────────────────────────────
  const createNewSession = React.useCallback(() => {
    const id = crypto.randomUUID();
    const now = new Date();
    const newSession: ChatSession = {
      id,
      title: "New chat",
      createdAt: now,
      updatedAt: now,
      messages: [],
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(id);
    return id;
  }, [setSessions]);

  const deleteSession = React.useCallback(
    (sessionId: string) => {
      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== sessionId);
        if (activeSessionId === sessionId) {
          setActiveSessionId(next[0]?.id ?? null);
        }
        return next;
      });
    },
    [setSessions, activeSessionId],
  );

  const switchSession = React.useCallback((sessionId: string) => {
    setActiveSessionId(sessionId);
  }, []);

  // ─── Message helpers ─────────────────────────────────────────────
  const appendMessageToSession = React.useCallback(
    (sessionId: string, msg: ChatMessage) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                messages: [...s.messages, msg],
                updatedAt: new Date(),
                // Set title from first user message
                title:
                  s.messages.length === 0 && msg.role === "user"
                    ? msg.content.slice(0, 60).trim() || "New chat"
                    : s.title,
              }
            : s,
        ),
      );
    },
    [setSessions],
  );

  const updateMessageInSession = React.useCallback(
    (sessionId: string, msgId: string, patch: Partial<ChatMessage>) => {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                updatedAt: new Date(),
                messages: s.messages.map((m) =>
                  m.id === msgId ? { ...m, ...patch } : m,
                ),
              }
            : s,
        ),
      );
    },
    [setSessions],
  );

  // ─── Cancel ───────────────────────────────────────────────────────
  const handleCancelMessage = async () => {
    // With streaming, we stop consuming the generator by setting isGenerating to false
    setIsGenerating(false);
    handleAddConsoleLine("Generation cancelled by user", "info");
  };

  // ─── Send message (with real-time streaming) ─────────────────────
  const handleSendMessage = async (text: string, isAutoFix = false) => {
    setLastCompileError(null);

    // Ensure there is an active session
    let sessionId = activeSessionId;
    if (!sessionId) {
      sessionId = createNewSession();
    }

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    appendMessageToSession(sessionId, userMsg);
    setIsGenerating(true);

    const statusLogs = ["🔄 Connecting to AI..."];
    const aiMsgId = crypto.randomUUID();
    const aiMsg: ChatMessage = {
      id: aiMsgId,
      role: "assistant",
      content: "⚙️ Generating code...",
      timestamp: new Date(),
      statusLogs: [...statusLogs],
    };
    appendMessageToSession(sessionId, aiMsg);

    const pushLogs = (extra: string[]) => {
      statusLogs.push(...extra);
      updateMessageInSession(sessionId!, aiMsgId, {
        statusLogs: [...statusLogs],
      });
    };

    // Signal that AI is generating — suppresses the 5s autosave debounce
    if (isAiGeneratingRef) isAiGeneratingRef.current = true;

    try {
      const token = await getToken({ skipCache: true });
      handleAddConsoleLine("🔄 AI is generating code...", "info");

      let createdFileCount = 0;
      let currentCounter = elementCounter;
      const newTabs: string[] = [];
      let hasErrors = false;
      let finalMessage = "Done.";

      // Stream file updates in real-time
      const generator = streamAiGeneration(
        text,
        files,
        folders,
        projectId,
        token,
      );

      for await (const message of generator) {
        if (message.type === "error") {
          const errData = message.data as any;
          const errMsg = errData?.message ?? "Unknown error";
          pushLogs([errMsg]);
          updateMessageInSession(sessionId, aiMsgId, { content: errMsg });
          handleAddConsoleLine(`❌ ${errMsg}`, "error");
          hasErrors = true;
          break;
        }

        if (message.type === "status") {
          const statusData = message.data as any;
          if (statusData?.message) {
            pushLogs([statusData.message]);
            updateMessageInSession(sessionId, aiMsgId, {
              statusLogs: [...statusLogs],
            });
            handleAddConsoleLine(`ℹ️ ${statusData.message}`, "info");
          }
        }

        if (message.type === "file") {
          const fileUpdate = message.data as any;
          if (!fileUpdate?.path) continue;

          const rawPath = fileUpdate.path;
          const content = fileUpdate.content || "";

          // Normalize path
          const normalized = normalizePath(rawPath);

          // Apply file to workspace in real-time (upsert — works for both new and existing files)
          let finalContent = content;
          // Tag ALL JSX/TSX files with data-id so the Canvas Inspector can select
          // any element in any component file — not just page.tsx
          if (normalized.endsWith(".tsx") || normalized.endsWith(".jsx")) {
            try {
              const tagged = tagWithCounter(finalContent, currentCounter);
              finalContent = tagged.code;
              currentCounter = tagged.newCounter;
            } catch (err) {
              // Previously this silently swallowed ALL errors -- which is
              // exactly how a real bug (traverse() throwing at runtime due to
              // a CJS/ESM interop mismatch) went undetected: every AI-written
              // file silently got zero data-id tags, with no visible error
              // anywhere. Now at least logged loudly so this can never again
              // fail invisibly.
              console.error(
                `[useAI] Failed to tag "${normalized}" with data-id attributes -- ` +
                  `this file's elements will NOT be selectable in the inspector:`,
                err,
              );
            }
          }

          // Write the file immediately — React state + WebContainer both updated
          executeTransaction(
            [
              {
                type: "CREATE_FILE",
                payload: { path: normalized, template: finalContent },
              },
            ],
            `AI Writing ${normalized}`,
            "ai",
          );

          createdFileCount++;

          // Open the tab immediately and switch to it on the first file (Bolt-style)
          if (!newTabs.includes(normalized)) {
            newTabs.push(normalized);
            setOpenTabs((prev) =>
              prev.includes(normalized) ? prev : [...prev, normalized],
            );
          }
          if (createdFileCount === 1) {
            // Switch editor to the very first file so the user sees code appear live
            setActiveFile(normalized);
          }

          // Update UI and console
          handleAddConsoleLine(`📄 Writing ${normalized}`, "success");
          pushLogs([`✅ Created ${normalized}`]);
          updateMessageInSession(sessionId, aiMsgId, {
            statusLogs: [...statusLogs],
          });
        }

        if (message.type === "done") {
          const doneData = message.data as any;
          if (doneData?.message) {
            finalMessage = doneData.message;
          }
          break;
        }
      }

      if (!hasErrors && createdFileCount > 0) {
        setElementCounter(currentCounter);

        // After all files arrive, switch to the app entry point if it was generated
        const entry = newTabs.find((t) => t === APP_ENTRY) ?? newTabs[0];
        if (entry) setActiveFile(entry);

        handleAddConsoleLine(
          newTabs.length > 0
            ? `✅ AI generated ${createdFileCount} file(s)`
            : `✅ AI applied ${createdFileCount} tree operation(s)`,
          "success",
        );

        if (webcontainerStatus === "error") {
          setFiles((prev) => {
            simulateTerminalBuildAndStart(prev);
            return prev;
          });
        }

        lastActionWasAiRef.current = true;
        if (!isAutoFix) aiAutoFixCountRef.current = 0;
      } else if (!hasErrors) {
        pushLogs(["⚠️ No files generated — check Gemini response"]);
        handleAddConsoleLine("⚠️ No files were generated", "warning");
      }

      updateMessageInSession(sessionId, aiMsgId, {
        content: finalMessage,
        statusLogs: [...statusLogs],
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Unknown error";
      handleAddConsoleLine(`❌ ${errMsg}`, "error");
      updateMessageInSession(sessionId, aiMsgId, { content: errMsg });
    } finally {
      setIsGenerating(false);
      // Mark generation done — re-enable autosave
      if (isAiGeneratingRef) isAiGeneratingRef.current = false;
      // Force a full save so generated files are persisted for this projectId
      if (saveImmediately) {
        try {
          await saveImmediately();
        } catch (e) {
          console.warn("[useAI] saveImmediately failed:", e);
        }
      }
    }
  };

  // ─── Error handling ───────────────────────────────────────────────
  const handleRuntimeError = (message: string) => {
    setLastCompileError(message);

    if (lastActionWasAiRef.current && aiAutoFixCountRef.current < 2) {
      lastActionWasAiRef.current = false;
      aiAutoFixCountRef.current += 1;
      handleAddConsoleLine(
        "⚠️ Detected compile/runtime error. Auto-correcting with AI...",
        "warning",
      );
      setTimeout(() => {
        void handleSendMessage(
          `I got a compilation/runtime error in the preview:\n\n${message}\n\nPlease analyze the code and correct the file to fix it.`,
          true,
        );
      }, 1500);
    }
  };

  const handleFixError = () => {
    if (!lastCompileError) {
      handleAddConsoleLine("No errors detected to fix", "info");
      void handleSendMessage(
        "Check the preview and let me know if there are any errors to fix.",
      );
      return;
    }

    handleAddConsoleLine("🔧 Sending error to AI for analysis...", "info");
    void handleSendMessage(
      `I got a compilation/runtime error in the preview:\n\n${lastCompileError}\n\nPlease analyze the code and fix it. Look for missing dependencies, syntax errors, or logic issues.`,
    );
  };

  return {
    // Session-level
    sessions,
    activeSessionId,
    activeSession,
    messages,
    createNewSession,
    deleteSession,
    switchSession,
    // Message-level
    isGenerating,
    activeModel,
    setActiveModel,
    handleSendMessage,
    handleCancelMessage,
    handleRuntimeError,
    handleFixError,
  };
}

export type { UseAiProps };
