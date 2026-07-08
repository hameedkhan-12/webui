# Bridge Layer Integration Plan

Purpose
-------
This document describes the minimal "bridge layer" to connect the LLM-driven code generation pipeline into the Aura subsystem runtime (kernel + registries + preview). It maps the existing flow, lists exact files/lines to touch, and proposes concise integration snippets for immediate runtime registration and backend persistence.

Current flow summary
--------------------
- AI generation streams files to the frontend using `streamAiGeneration`.
- The frontend `useAI` handler applies incoming file updates via `executeTransaction` (CREATE_FILE ops), which updates the in-memory `files` workspace.
- `executeTransaction` calls `syncOperationToWebContainer(op)` for each operation; that function writes files into the WebContainer FS using `writeWebContainerFile` when a WebContainer is mounted.
- The preview is an `<iframe>` shown by `LivePreview`. Two modes:
  - WebContainer/dev-server iframe (points to dev server URL) — relies on HMR for live updates.
  - In-browser `srcDoc` iframe (client-side compiled) — reloaded by `LivePreview` when `files` change.
- Files are persisted to backend via `saveWorkspaceApi` (autosave) and to localStorage via `usePersistentWorkspace`.

Key files and references
------------------------
- AI streaming entry: `apps/web/src/lib/aiStreamingApi.ts`
- AI handler that applies files: `apps/web/src/hooks/useAI.ts`
  - CREATE_FILE apply: around the `executeTransaction` call that writes generated files (see the `file` message handler)
- Transaction runner and executeTransaction: `apps/web/src/lib/transactionManager.ts` and `apps/web/src/hooks/useWorkspace.ts`
  - `executeTransaction` implementation: updates state and calls `syncOperationToWebContainer` (the ideal hook point)
- WebContainer write helper: `apps/web/src/lib/webcontainer.ts` (`writeWebContainerFile`)
- Preview iframe: `apps/web/src/components/LivePreview.tsx`
- Autosave and persistence: `apps/web/src/hooks/useWorkspace.ts` (`saveWorkspaceApi`) and `apps/web/src/hooks/usePersistentWorkspace.ts`

Exact edit points (suggested)
-----------------------------
Primary integration strategy: when the AI creates a component file, publish a lightweight metadata record to the runtime registries so the rest of the Aura stack (component/schema registries) become aware immediately.

Two useful delivery mechanisms (pick both for best UX):

1) Immediate runtime registration (fast, in-memory): postMessage to the preview iframe so the running app (dev server or srcDoc iframe) can register the component with its local runtime registry.

  Where to add:
  - In `executeTransaction` after the `ops.forEach` loop that currently calls `syncOperationToWebContainer(op)`.
    File: `apps/web/src/hooks/useWorkspace.ts`
    Suggested location: inside the `ops.forEach((op) => { ... })` block, after `void syncOperationToWebContainer(op);` (see `syncOperationToWebContainer` usage).

  Minimal snippet (concept):

  ```ts
  // inside ops.forEach loop in executeTransaction
  void syncOperationToWebContainer(op);

  if (op.type === 'CREATE_FILE') {
    const path = op.payload.path as string;
    const content = op.payload.template as string;
    if (isLikelyComponentFile(path)) {
      // send to preview iframe for runtime registration
      const iframe = document.querySelector('iframe[title="App preview"]') as HTMLIFrameElement | null;
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage({
          type: 'REGISTER_GENERATED_COMPONENT',
          path,
          content
        }, '*');
      }
    }
  }

  function isLikelyComponentFile(path: string) {
    return /\.(tsx|jsx|ts|js)$/.test(path) && /src\/components|src\/app|app\/.+page\.(tsx|jsx)$/.test(path);
  }
  ```

  On the preview side (in `srcDoc` iframe bootstrap or dev server app), add a small `message` listener to accept `REGISTER_GENERATED_COMPONENT` and call the local runtime registration API (or a client-side `AuraKernel` instance if the preview app exposes it). Example listener (iframe script):

  ```js
  window.addEventListener('message', (e) => {
    const msg = e.data;
    if (msg?.type === 'REGISTER_GENERATED_COMPONENT') {
      const { path, content } = msg;
      // compile/parse metadata and register into runtime registries
      // e.g. window.__aura?.registerComponentMeta(meta)
    }
  });
  ```

2) Persistent registry update (backend-backed): call a backend registration endpoint once generation completes so other services (kernel, schema engine, AI indexing) can pick it up.

  Where to add:
  - Prefer to call this after streaming completes or after `saveImmediately()` in `useAI`.
  - File: `apps/web/src/hooks/useAI.ts` — after the streaming loop completes and before final `saveImmediately()` call.

  Minimal snippet (concept):

  ```ts
  // after generation finishes in useAI
  if (createdFileCount > 0) {
    // collect simple metadata per generated file
    const comps = newTabs.filter(p => isLikelyComponentFile(p)).map(p => ({ path: p, entry: p }));
    // POST to a backend route that registers metadata into Aura's registries
    await fetch('/api/aura/register-generated', { method: 'POST', body: JSON.stringify({ projectId, components: comps }) });
  }
  ```

  On the backend, implement a small controller that validates component metadata and writes it into the persistent storage (DB) or into the `@aura/*` registries if you run a kernel instance server-side. This will make the registration durable and available to other consumers (AI indexing, marketplace, etc.).

Why both mechanisms?
- `postMessage` provides instant runtime feedback in the preview for a great authoring UX.
- Backend registration makes the metadata durable and available to other subsystems and future boots of the kernel.

Files/lines you already saw (quick pointer)
- AI streaming: `apps/web/src/lib/aiStreamingApi.ts`
- AI handler file write: `apps/web/src/hooks/useAI.ts` (CREATE_FILE handler where `executeTransaction` is called)
- `executeTransaction` + ops.forEach: `apps/web/src/hooks/useWorkspace.ts` (around lines where `ops.forEach(op => { ... void syncOperationToWebContainer(op); })`)
- WebContainer writer: `apps/web/src/lib/webcontainer.ts` (`writeWebContainerFile`)
- Preview reload and `iframe` code: `apps/web/src/components/LivePreview.tsx`
- Autosave/persist: `apps/web/src/hooks/useWorkspace.ts` (autosave effect) and `apps/web/src/hooks/usePersistentWorkspace.ts`

Next steps (options)
--------------------
- Option A — Implement `postMessage` runtime registration: I can apply a small patch to `apps/web/src/hooks/useWorkspace.ts` to post messages for generated component files, and add a small listener in `LivePreview` `srcDoc` script to register them in the running preview. This yields immediate visual availability.
- Option B — Add backend registration endpoint and client call from `useAI` after generation completes. I can scaffold a lightweight API route and a client POST call.
- Option C — Do both (recommended): instant preview + durable backend record.

If you want, I will apply the chosen option now and run the editor tests. Tell me which option to implement.

---
Generated by the repository analysis; edit as needed.
