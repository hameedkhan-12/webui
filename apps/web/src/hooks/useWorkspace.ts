import React from "react";
import { useAuth } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import {
  WorkspaceFiles,
  TerminalLine,
  SelectedElement,
  Operation,
  OperationSource,
  HistoryEntry,
} from "@repo/shared";
import { WebContainer } from "@webcontainer/api";
import {
  APP_ENTRY,
  DEFAULT_FILES,
  DEFAULT_OPEN_TABS,
  BOLT_STACK_LABEL,
  PACKAGE_JSON,
  parsePackageDeps,
} from "../lib/defaultProject";
import {
  DEFAULT_PROJECT_ID,
  fetchWorkspace as fetchWorkspaceApi,
  saveWorkspace as saveWorkspaceApi,
  createFolderApi,
  getBootstrapWorkspace,
} from "../lib/workspaceApi";
import { fetchProjectById } from "../lib/projectsApi";
import { runTransaction, ReducerResult } from "../lib/transactionManager";
import { syncCoordinator } from "../lib/syncCoordinator";
import {
  getWebContainer,
  filesToWebContainerTree,
  writeWebContainerFile,
  deleteWebContainerPath,
} from "../lib/webcontainer";
import { workspaceBridgeOnTransaction } from '@aura/component-registry';
import {
  saveSnapshot,
  loadSnapshot,
  deleteProjectSnapshots,
} from "../lib/nodeModulesCache";
import { usePersistentWorkspace } from "./usePersistentWorkspace";

// NOTE: `persistentCache.ts` (localStorage install-flag tracking) has been
// removed from this file's imports. It was dead code — only cacheInstallState
// was called and nothing gated on it — left over from before the IndexedDB
// snapshot approach. `nodeModulesCache.ts`, keyed on the package.json hash,
// is the single source of truth for "do we need npm install". Delete
// lib/persistentCache.ts from the repo; nothing references it anymore.

export function useWorkspace() {
  const { getToken } = useAuth();
  const params = useParams();
  const projectId = (params?.projectId as string) || DEFAULT_PROJECT_ID;

  const [files, setFiles] = React.useState<WorkspaceFiles>(DEFAULT_FILES);
  const [folders, setFolders] = React.useState<string[]>([]);
  const [projectName, setProjectName] = React.useState<string>("AI Project");
  const [workspaceReady, setWorkspaceReady] = React.useState(false);
  const [activeFile, setActiveFile] = React.useState<string>(APP_ENTRY);
  const [openTabs, setOpenTabs] = React.useState<string[]>(DEFAULT_OPEN_TABS);
  const [workbenchView, setWorkbenchView] = React.useState<
    "split" | "code" | "preview"
  >("split");
  const [showFileTree, setShowFileTree] = React.useState(true);
  const [showInspector, setShowInspector] = React.useState(false);
  const [selectedElement, setSelectedElement] =
    React.useState<SelectedElement | null>(null);
  const [elementCounter, setElementCounter] = React.useState(10);
  const [historyStack, setHistoryStack] = React.useState<HistoryEntry[]>([]);

  const [consoleLines, setConsoleLines] = React.useState<TerminalLine[]>([
    { text: `${BOLT_STACK_LABEL} project loaded`, type: "info" },
  ]);

  const [terminalHistory, setTerminalHistory] = React.useState<TerminalLine[]>([
    { text: "Aura IDE Shell — WebContainer Terminal Powered", type: "info" },
    { text: "", type: "info" },
  ]);

  const [devServerActive, setDevServerActive] = React.useState(false);
  const [lastCompileError, setLastCompileError] = React.useState<string | null>(
    null,
  );

  const webcontainerRef = React.useRef<WebContainer | null>(null);
  const [webcontainerUrl, setWebcontainerUrl] = React.useState<string>("");
  const [webcontainerStatus, setWebcontainerStatus] = React.useState<
    "idle" | "booting" | "ready" | "error"
  >("idle");
  const isInstallingRef = React.useRef(false);
  const devServerStartedRef = React.useRef(false);
  const serverReadyRegisteredRef = React.useRef(false);
  const filesRef = React.useRef(files);
  filesRef.current = files;

  // Track package.json hash to detect dep changes while dev server is running
  const packageJsonHashRef = React.useRef<string>("");

  // Suppress autosave while AI is streaming to avoid partial-file saves
  const isAiGeneratingRef = React.useRef(false);

  // Persistent workspace storage
  const { persistWorkspace, restoreWorkspace, clearWorkspace } =
    usePersistentWorkspace(projectId);

  const appendTerminalOutput = React.useCallback(
    (text: string, type: TerminalLine["type"] = "info") => {
      const stripAnsi = (str: string) => {
        return str.replace(
          /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
          "",
        );
      };

      let detectedError: string | null = null;
      let shouldClearError = false;

      setTerminalHistory((prev) => {
        const next = [...prev];
        const isLineOverwrite =
          text.includes("\r") ||
          text.includes("\u001b[1G") ||
          text.includes("\u001b[G");
        const chunks = text.split("\n");

        chunks.forEach((chunk, index) => {
          const cleanText = stripAnsi(chunk).replace(/\r/g, "");
          if (!cleanText.trim() && chunk !== "") return;

          const lower = cleanText.toLowerCase();
          if (
            lower.includes("failed to compile") ||
            lower.includes("compile error") ||
            lower.includes("module not found") ||
            lower.includes("can't resolve")
          ) {
            detectedError = cleanText;
          } else if (
            lower.includes("compiled successfully") ||
            lower.includes("ready in") ||
            lower.includes("✓ ready")
          ) {
            shouldClearError = true;
          }

          if (isLineOverwrite && index === 0 && next.length > 0) {
            const lastLine = next[next.length - 1];
            if (lastLine.type !== "input") {
              next[next.length - 1] = { text: cleanText, type };
              return;
            }
          }

          next.push({ text: cleanText, type });
        });

        return next;
      });

      if (detectedError) {
        setLastCompileError((prev) => {
          if (prev && prev.includes(detectedError!)) return prev;
          return prev ? `${prev}\n${detectedError}` : detectedError;
        });
      } else if (shouldClearError) {
        setLastCompileError(null);
      }
    },
    [],
  );

  // Helper to compute hash of package.json for detecting changes
  const computePackageJsonHash = (content: string): string => {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  };

  const registerServerReadyHandler = (wc: WebContainer) => {
    if (serverReadyRegisteredRef.current) return;
    serverReadyRegisteredRef.current = true;

    wc.on("server-ready", (port, url) => {
      setWebcontainerUrl(url);
      setDevServerActive(true);
      devServerStartedRef.current = true;
      appendTerminalOutput(`🚀 Next.js server ready at ${url}`, "success");
      setConsoleLines((prev) => [
        ...prev,
        { text: `Next.js App Router live on port ${port}`, type: "success" },
      ]);
    });
  };

  const runInstallAndDev = async (wc: WebContainer) => {
    // Guard against concurrent installs — e.g. the boot effect's install still
    // running while handleStartDevServer fires from a user action.
    if (devServerStartedRef.current || isInstallingRef.current) return;
    isInstallingRef.current = true;

    try {
      registerServerReadyHandler(wc);

      const currentPkgJson = filesRef.current[PACKAGE_JSON]?.content || "";
      const currentHash = computePackageJsonHash(currentPkgJson);
      packageJsonHashRef.current = currentHash;

      // ── Step 1: Try to restore node_modules from IndexedDB snapshot ──────────
      // WebContainer always boots with an empty filesystem, so we can never rely
      // on readdir("node_modules"). Instead we persist a binary snapshot of
      // node_modules to IndexedDB after each successful install, keyed by the
      // package.json hash. On reload we mount it directly — this takes a few
      // seconds instead of a full npm install.
      //
      // IMPORTANT: the snapshot is exported scoped to "node_modules", so the
      // blob's root IS the contents of node_modules (react/, next/, etc. sit
      // at the top level of the blob, not nested under a node_modules/
      // folder). It must be mounted at mountPoint: "node_modules" — mounting
      // at "/" dumps packages into the project root instead, breaking module
      // resolution while still reporting a "successful" cache restore.
      let restoredFromCache = false;
      try {
        appendTerminalOutput("🔍 Checking node_modules snapshot cache...", "info");
        const snapshot = await loadSnapshot(projectId, currentHash);
        if (snapshot) {
          const sizeMb = (snapshot.byteLength / 1024 / 1024).toFixed(1);
          appendTerminalOutput(
            `⚡ Restoring node_modules from cache (${sizeMb} MB)…`,
            "info",
          );
          const t0 = Date.now();

          // mount() throws if the target directory doesn't exist yet
          await wc.fs.mkdir("node_modules", { recursive: true });
          await wc.mount(snapshot, { mountPoint: "node_modules" });

          const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
          appendTerminalOutput(
            `✅ node_modules restored in ${elapsed}s — skipping npm install.`,
            "success",
          );
          restoredFromCache = true;
        }
      } catch (cacheErr: any) {
        // Snapshot restore failed — fall through to a full install.
        appendTerminalOutput(
          `⚠️ Snapshot restore failed (${cacheErr?.message ?? cacheErr}) — running npm install.`,
          "warning",
        );
      }

      // ── Step 2: Full npm install (only if cache miss) ─────────────────────────
      if (!restoredFromCache) {
        appendTerminalOutput(
          "~/project $ npm install --prefer-offline --no-audit --no-fund",
          "input",
        );
        const installProc = await wc.spawn("npm", [
          "install",
          "--prefer-offline",
          "--no-audit",
          "--no-fund",
        ]);

        void installProc.output.pipeTo(
          new WritableStream({
            write(data) {
              appendTerminalOutput(data, "info");
            },
          }),
        );

        const code = await installProc.exit;
        if (code !== 0) {
          throw new Error(`npm install failed with exit code ${code}`);
        }

        appendTerminalOutput("✅ Dependencies installed.", "success");

        // ── Step 3: Export node_modules and persist to IndexedDB ─────────────
        appendTerminalOutput("💾 Saving node_modules snapshot to cache…", "info");
        try {
          // Requires @webcontainer/api >= 1.4.0 for export(). Confirmed
          // present at ^1.5.1 in this project's package.json.
          const snapshot = await wc.export("node_modules", { format: "binary" });
          const result = await saveSnapshot(projectId, currentHash, snapshot);

          if (result.status === "saved") {
            appendTerminalOutput(
              `✅ Snapshot saved (${(result.sizeBytes / 1024 / 1024).toFixed(1)} MB) — future reloads will be instant.`,
              "success",
            );
          } else if (result.status === "too_large") {
            // Surfaced here instead of only console.warn — this is exactly
            // the case that was silently forcing a full install on every
            // reload before the cap was raised.
            appendTerminalOutput(
              `⚠️ node_modules snapshot (${(result.sizeBytes / 1024 / 1024).toFixed(1)} MB) exceeds the ${(result.maxBytes / 1024 / 1024).toFixed(0)} MB cache limit — will reinstall next reload.`,
              "warning",
            );
          } else {
            appendTerminalOutput(`⚠️ Could not save snapshot.`, "warning");
          }
        } catch (exportErr: any) {
          // Non-fatal — app still works, just won't skip install next time.
          appendTerminalOutput(
            `⚠️ Could not save snapshot: ${exportErr?.message ?? exportErr}`,
            "warning",
          );
        }
      }

      if (devServerStartedRef.current) return;

      appendTerminalOutput("~/project $ npm run dev", "input");
      const devProc = await wc.spawn("npm", ["run", "dev"]);
      void devProc.output.pipeTo(
        new WritableStream({
          write(data) {
            appendTerminalOutput(data, "info");
          },
        }),
      );
    } catch (err: any) {
      appendTerminalOutput(`❌ Execution failed: ${err.message}`, "error");
      setWebcontainerStatus("error");
      simulateTerminalBuildAndStart(filesRef.current);
    } finally {
      isInstallingRef.current = false;
    }
  };

  // Boot WebContainer when workspace is ready
  React.useEffect(() => {
    if (!workspaceReady) return;

    let cancelled = false;

    async function initWebContainer() {
      try {
        setWebcontainerStatus("booting");
        appendTerminalOutput("⚙️ Booting StackBlitz WebContainer...", "info");

        const wc = await getWebContainer();
        if (cancelled) return;

        webcontainerRef.current = wc;
        setWebcontainerStatus("ready");
        appendTerminalOutput("🚀 WebContainer booted.", "success");
        appendTerminalOutput("Mounting workspace files...", "info");

        const tree = filesToWebContainerTree(filesRef.current);
        await wc.mount(tree);

        appendTerminalOutput("📂 Workspace files mounted.", "success");
        void runInstallAndDev(wc);
      } catch (err: any) {
        console.error("WebContainer boot failed:", err);
        setWebcontainerStatus("error");
        appendTerminalOutput(
          `❌ WebContainer boot failed: ${err.message}`,
          "error",
        );
        appendTerminalOutput("Falling back to in-browser preview.", "warning");
        simulateTerminalBuildAndStart(filesRef.current);
      }
    }

    void initWebContainer();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceReady]);

  // Monitor package.json changes — debounced, guarded against concurrent installs
  const lastPackageJsonRef = React.useRef<string>("");
  const pkgDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  React.useEffect(() => {
    const pkg = files[PACKAGE_JSON]?.content;
    if (!pkg || !webcontainerRef.current || webcontainerStatus !== "ready")
      return;

    if (lastPackageJsonRef.current && lastPackageJsonRef.current !== pkg) {
      if (pkgDebounceRef.current) clearTimeout(pkgDebounceRef.current);

      // Reset the hash to trigger install on next runInstallAndDev
      packageJsonHashRef.current = "";

      pkgDebounceRef.current = setTimeout(async () => {
        if (isInstallingRef.current) return;
        isInstallingRef.current = true;
        appendTerminalOutput(
          "\n📦 package.json changed — running npm install...",
          "info",
        );
        try {
          // Invalidate the old snapshot — deps are changing
          void deleteProjectSnapshots(projectId);

          const installProc = await webcontainerRef.current!.spawn("npm", [
            "install",
            "--prefer-offline",
            "--no-audit",
            "--no-fund",
          ]);
          void installProc.output.pipeTo(
            new WritableStream({
              write(data) {
                appendTerminalOutput(data, "info");
              },
            }),
          );
          const code = await installProc.exit;
          if (code === 0) {
            const newHash = computePackageJsonHash(pkg);
            packageJsonHashRef.current = newHash;

            // Re-export updated node_modules snapshot
            appendTerminalOutput("💾 Updating node_modules snapshot cache…", "info");
            try {
              const wc = webcontainerRef.current!;
              const snapshot = await wc.export("node_modules", { format: "binary" });
              const result = await saveSnapshot(projectId, newHash, snapshot);
              if (result.status === "saved") {
                appendTerminalOutput(
                  `✅ Snapshot updated (${(result.sizeBytes / 1024 / 1024).toFixed(1)} MB).`,
                  "success",
                );
              } else if (result.status === "too_large") {
                appendTerminalOutput(
                  `⚠️ Snapshot (${(result.sizeBytes / 1024 / 1024).toFixed(1)} MB) exceeds cache limit — will reinstall next reload.`,
                  "warning",
                );
              }
            } catch (exportErr: any) {
              appendTerminalOutput(
                `⚠️ Snapshot export failed: ${exportErr?.message ?? exportErr}`,
                "warning",
              );
            }
          }
          appendTerminalOutput(
            code === 0
              ? "✅ Dependencies updated."
              : `❌ npm install failed (code ${code})`,
            code === 0 ? "success" : "error",
          );
        } catch (err: any) {
          appendTerminalOutput(`❌ Failed: ${err.message}`, "error");
        } finally {
          isInstallingRef.current = false;
        }
      }, 4000); // 4-second debounce — avoids spamming on every AI file write
    }

    lastPackageJsonRef.current = pkg;
  }, [files[PACKAGE_JSON]?.content, webcontainerStatus]);

  const simulateTerminalBuildAndStart = (currentFiles: WorkspaceFiles) => {
    const pkgJson = currentFiles[PACKAGE_JSON];
    const deps = pkgJson ? parsePackageDeps(pkgJson.content) : {};
    const depNames = Object.keys(deps);

    setTerminalHistory((prev) => {
      const next = [...prev];
      next.push({ text: "~/project $ npm install", type: "input" });
      next.push({
        text: "Installing dependencies from package.json...",
        type: "info",
      });

      if (depNames.length > 0) {
        depNames.forEach((name) => {
          next.push({ text: `+ ${name}@${deps[name]}`, type: "success" });
        });
        next.push({
          text: `added ${depNames.length} packages, audited ${depNames.length + 12} packages in 1.4s`,
          type: "success",
        });
      } else {
        next.push({
          text: "No dependencies listed in package.json",
          type: "warning",
        });
      }

      next.push({ text: "~/project $ npm run dev", type: "input" });
      next.push({ text: "> next dev", type: "info" });
      next.push({ text: "   ▲ Next.js 15.4", type: "info" });
      next.push({
        text: "   - Local:        http://localhost:3000",
        type: "success",
      });
      next.push({ text: "   ✓ Ready in 0.8s", type: "success" });
      return next;
    });

    setDevServerActive(true);
  };

  // Initial Load
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await getToken({ skipCache: true });
      if (projectId && projectId !== DEFAULT_PROJECT_ID) {
        try {
          const project = await fetchProjectById(projectId, token);
          if (project && !cancelled) {
            setProjectName(project.name);
          }
        } catch (e) {
          console.error("Failed to fetch project name:", e);
        }
      } else {
        setProjectName("Default Project");
      }

      // Reset in-memory install tracking when switching projects.
      // NOTE: We do NOT clear the IndexedDB snapshot here — it's keyed by
      // hash so stale data is naturally evicted when package.json changes.
      // Clearing it on every load was the root cause of npm install running
      // on every browser reload.
      packageJsonHashRef.current = "";
      devServerStartedRef.current = false;
      serverReadyRegisteredRef.current = false;

      const remote = await fetchWorkspaceApi(projectId, token);
      if (cancelled) return;
      if (remote) {
        setFiles(remote.files);
        setFolders(remote.folders);
        setConsoleLines((prev) => [
          ...prev,
          {
            text: `Workspace loaded for project: ${projectId}`,
            type: "success",
          },
        ]);
      } else {
        // Try to restore from persistent storage first
        const persisted = restoreWorkspace();
        if (persisted) {
          setFiles(persisted);
          setConsoleLines((prev) => [
            ...prev,
            { text: "Workspace restored from local cache", type: "success" },
          ]);
        } else {
          const local = getBootstrapWorkspace();
          setFiles(local.files);
          setFolders(local.folders);
          setConsoleLines((prev) => [
            ...prev,
            {
              text: "Using local workspace (database unavailable)",
              type: "warning",
            },
          ]);
        }
      }
      setWorkspaceReady(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Autosave to backend and persist locally
  // Debounce is 5s (not 1.2s) to avoid saving while AI is still streaming files
  React.useEffect(() => {
    if (!workspaceReady) return;
    const timer = setTimeout(async () => {
      // Skip autosave while AI is actively generating — a forced save fires after completion
      if (isAiGeneratingRef.current) return;
      const token = await getToken({ skipCache: true });
      void saveWorkspaceApi(files, folders, projectId, token);
      // Also persist to localStorage for offline access
      persistWorkspace(files);
    }, 5000);
    return () => clearTimeout(timer);
  }, [files, folders, workspaceReady, projectId, persistWorkspace]);

  /** Force a full save right now — called by useAI after streaming completes */
  const saveImmediately = React.useCallback(async () => {
    const token = await getToken({ skipCache: true });
    await saveWorkspaceApi(
      filesRef.current,
      foldersRef.current,
      projectId,
      token,
    );
    persistWorkspace(filesRef.current);
  }, [projectId, persistWorkspace]);

  const pushHistory = (entry: HistoryEntry) => {
    setHistoryStack((prev) => [...prev, entry]);
  };

  const syncOperationToWebContainer = async (op: Operation) => {
    const wc = webcontainerRef.current;
    if (!wc) return;

    try {
      if (op.type === "CREATE_FILE") {
        await writeWebContainerFile(wc, op.payload.path, op.payload.template);
      } else if (op.type === "UPDATE_FILE_RAW") {
        await writeWebContainerFile(wc, op.payload.path, op.payload.content);
      } else if (op.type === "DELETE_FILE") {
        await deleteWebContainerPath(wc, op.payload.path);
      } else if (op.type === "CREATE_FOLDER") {
        await wc.fs.mkdir(op.payload.path, { recursive: true });
      } else if (op.type === "DELETE_FOLDER") {
        await deleteWebContainerPath(wc, op.payload.path);
      }
    } catch (e) {
      console.error("Failed to sync operation to WebContainer:", e);
    }
  };

  const foldersRef = React.useRef(folders);
  foldersRef.current = folders;
  const elementCounterRef = React.useRef(elementCounter);
  elementCounterRef.current = elementCounter;

  const executeTransaction = (
    ops: Operation[],
    label: string,
    source: OperationSource,
  ) => {
    syncCoordinator.startApplying();
    try {
      // Always read from refs so async callers (e.g. AI streaming loop) see current state
      const result = runTransaction(
        ops,
        label,
        source,
        {
          files: filesRef.current,
          folders: foldersRef.current,
          elementCounter: elementCounterRef.current,
        },
        (next: ReducerResult) => {
          setFiles(next.files);
          setFolders(next.folders);
          setElementCounter(next.elementCounter);
          // Keep refs in sync immediately so the next streaming iteration sees updated state
          filesRef.current = next.files;
          foldersRef.current = next.folders;
          elementCounterRef.current = next.elementCounter;
        },
        pushHistory,
      );
      // Record writes to sync coordinator and sync to WebContainer
      ops.forEach((op) => {
        if (op.type === "UPDATE_FILE_RAW") {
          syncCoordinator.recordWrite(op.payload.path, op.payload.content);
        }
        void syncOperationToWebContainer(op);
        // Fire-and-forget bridge integration to register generated components
        void workspaceBridgeOnTransaction(op);
      });
      return result;
    } finally {
      syncCoordinator.stopApplying();
    }
  };

  const handleSelectFile = (name: string) => {
    setActiveFile(name);
    setOpenTabs((prev) => (prev.includes(name) ? prev : [...prev, name]));
  };

  const handleCloseTab = (name: string) => {
    const nextTabs = openTabs.filter((t) => t !== name);
    setOpenTabs(nextTabs);
    if (activeFile === name && nextTabs.length > 0) {
      setActiveFile(nextTabs[0] ?? APP_ENTRY);
    }
  };

  const handleCreateFile = (rawPath: string) => {
    try {
      executeTransaction(
        [{ type: "CREATE_FILE", payload: { path: rawPath, template: "" } }],
        `Create File: ${rawPath}`,
        "system",
      );
      setOpenTabs((prev) => [...prev, rawPath]);
      setActiveFile(rawPath);
      handleAddConsoleLine(`Created file ${rawPath}`, "success");
    } catch (err: any) {
      handleAddConsoleLine(err.message, "warning");
    }
  };

  const handleCreateFolder = (rawPath: string) => {
    try {
      executeTransaction(
        [{ type: "CREATE_FOLDER", payload: { path: rawPath } }],
        `Create Folder: ${rawPath}`,
        "system",
      );
      void createFolderApi(rawPath);
      handleAddConsoleLine(`Created folder ${rawPath}`, "success");
    } catch (err: any) {
      handleAddConsoleLine(err.message, "warning");
    }
  };

  const handleDeleteFile = (rawPath: string) => {
    try {
      executeTransaction(
        [{ type: "DELETE_FILE", payload: { path: rawPath } }],
        `Delete File: ${rawPath}`,
        "system",
      );
      handleCloseTab(rawPath);
      handleAddConsoleLine(`Deleted file ${rawPath}`, "info");
    } catch (err: any) {
      handleAddConsoleLine(err.message, "warning");
    }
  };

  const handleDeleteFolder = (rawPath: string) => {
    try {
      executeTransaction(
        [{ type: "DELETE_FOLDER", payload: { path: rawPath } }],
        `Delete Folder: ${rawPath}`,
        "system",
      );
      if (activeFile === rawPath || activeFile.startsWith(`${rawPath}/`)) {
        setActiveFile(APP_ENTRY);
      }
      setOpenTabs((prev) =>
        prev.filter((t) => t !== rawPath && !t.startsWith(`${rawPath}/`)),
      );
      handleAddConsoleLine(`Deleted folder ${rawPath}`, "info");
    } catch (err: any) {
      handleAddConsoleLine(err.message, "warning");
    }
  };

  const handleUpdateFile = (path: string, content: string) => {
    if (syncCoordinator.isOwnWrite(path, content)) {
      return;
    }

    setLastCompileError(null);
    executeTransaction(
      [{ type: "UPDATE_FILE_RAW", payload: { path, content } }],
      `Update File: ${path}`,
      "code_editor",
    );
  };

  const handleUpdateElement = (
    filePath: string,
    elementId: string,
    updatedProps: { text?: string; classes?: string[] },
  ) => {
    const ops: Operation[] = [];
    if (updatedProps.text !== undefined) {
      ops.push({
        type: "UPDATE_PROP",
        payload: {
          nodeId: elementId,
          filePath,
          key: "text",
          value: updatedProps.text,
        },
      });
    }
    if (updatedProps.classes !== undefined) {
      ops.push({
        type: "UPDATE_CLASS",
        payload: { nodeId: elementId, filePath, classes: updatedProps.classes },
      });
    }

    if (ops.length > 0) {
      executeTransaction(ops, `Update element props/classes`, "inspector");
      if (selectedElement?.id === elementId) {
        setSelectedElement((prev) =>
          prev
            ? {
              ...prev,
              text: updatedProps.text ?? prev.text,
              classes: updatedProps.classes ?? prev.classes,
            }
            : null,
        );
      }
    }
  };

  const handleInsertComponent = (componentCode: string) => {
    executeTransaction(
      [
        {
          type: "INSERT_COMPONENT",
          payload: {
            componentId: "",
            targetId: "",
            position: "inside",
            code: componentCode,
          },
        },
      ],
      "Insert Component",
      "drag_drop",
    );
    handleAddConsoleLine(`Inserted block into ${APP_ENTRY}`, "success");
    if (!devServerActive) handleStartDevServer();
  };

  const handleDropComponent = (targetId: string, dragData: string) => {
    if (dragData.startsWith("element-id:")) {
      const sourceId = dragData.replace("element-id:", "");
      if (sourceId === targetId) return;

      executeTransaction(
        [{ type: "MOVE_COMPONENT", payload: { nodeId: sourceId, targetId } }],
        "Move Component",
        "drag_drop",
      );
      handleAddConsoleLine(
        `Moved component ${sourceId} into ${targetId}`,
        "success",
      );
    } else {
      executeTransaction(
        [
          {
            type: "INSERT_COMPONENT",
            payload: {
              componentId: "",
              targetId,
              position: "inside",
              code: dragData,
            },
          },
        ],
        "Insert Component Drop",
        "drag_drop",
      );
      handleAddConsoleLine(`Dropped component inside ${targetId}`, "success");
    }
  };

  const handleElementDelete = (elementId: string) => {
    executeTransaction(
      [{ type: "REMOVE_COMPONENT", payload: { nodeId: elementId } }],
      "Remove Component",
      "inspector",
    );
    if (selectedElement?.id === elementId) {
      setSelectedElement(null);
    }
    handleAddConsoleLine(`Deleted element ${elementId}`, "info");
  };

  const handleClearConsole = () => setConsoleLines([]);
  const handleAddConsoleLine = (text: string, type: TerminalLine["type"]) => {
    setConsoleLines((prev) => [...prev, { text, type }]);
  };

  const handleStartDevServer = () => {
    if (webcontainerRef.current) {
      void runInstallAndDev(webcontainerRef.current);
    } else {
      setDevServerActive(true);
      setConsoleLines((prev) => [
        ...prev,
        { text: "next dev — starting Turbopack...", type: "info" },
        { text: "   ▲ Next.js 15.4", type: "success" },
        { text: "   - Local:        http://localhost:3000", type: "success" },
      ]);
      setTerminalHistory((prev) => [
        ...prev,
        { text: "~/project $ npm run dev", type: "input" },
        { text: "> next dev", type: "info" },
        { text: "   ▲ Next.js 15.4", type: "info" },
        { text: "   - Local:        http://localhost:3000", type: "success" },
        { text: "   ✓ Ready in 1.2s", type: "success" },
      ]);
    }
  };

  return {
    files,
    folders,
    workspaceReady,
    activeFile,
    openTabs,
    workbenchView,
    showFileTree,
    showInspector,
    selectedElement,
    elementCounter,
    consoleLines,
    terminalHistory,
    devServerActive,
    lastCompileError,
    webcontainerUrl,
    setFiles,
    setFolders,
    setWorkspaceReady,
    setActiveFile,
    setOpenTabs,
    setWorkbenchView,
    setShowFileTree,
    setShowInspector,
    setSelectedElement,
    setElementCounter,
    setConsoleLines,
    setTerminalHistory,
    setDevServerActive,
    setLastCompileError,
    executeTransaction,
    simulateTerminalBuildAndStart,
    handleSelectFile,
    handleCloseTab,
    handleCreateFile,
    handleCreateFolder,
    handleDeleteFile,
    handleDeleteFolder,
    handleUpdateFile,
    handleUpdateElement,
    handleInsertComponent,
    handleDropComponent,
    handleElementDelete,
    handleClearConsole,
    handleAddConsoleLine,
    handleStartDevServer,
    projectId,
    projectName,
    webcontainerStatus,
    saveImmediately,
    isAiGeneratingRef,
  };
}