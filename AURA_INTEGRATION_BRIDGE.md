# Aura Integration Bridge

## Connecting existing workspace pipeline to Aura subsystems                     ## System map
EXISTING PIPELINE                        AURA SUBSYSTEMS
─────────────────────────────────────────────────────────────────
useAI.ts                                 AuraKernel
  └─ streamAiGeneration()                  └─ ComponentRegistry
       └─ executeTransaction()               └─ SchemaRegistry
            └─ CREATE_FILE op                └─ AIRegistry (stub)
                 ├─ WorkspaceFiles state
                 ├─ WebContainer FS write     AST Engine (gateway)
                 └─ backend/localStorage      └─ PersistenceService
                                                   └─ ASTPersistenceAdapter

LivePreview.tsx                          aura-runtime.ts
  └─ <iframe>                              └─ click intercept
       ├─ Mode A: webcontainerUrl               └─ postMessage AURA_SELECT
       └─ Mode B: srcDoc
                                         EditorCanvas (apps/editor)
                                           └─ SelectionOverlay
                                           └─ Sidebar panels ## Gap 1 — executeTransaction → ComponentRegistry
                                           
                                           ### Problem
                                           
                                           When the AI generates a component, `executeTransaction` writes it to `WorkspaceFiles`
                                           state and WebContainer FS. The ComponentRegistry never hears about it.
                                           The Sidebar has no components to show. The AI layer has no registry to query.
                                           
                                           ### Integration point
                                           
                                           `useWorkspace.ts` — the `executeTransaction` function, specifically the
                                           `CREATE_FILE` branch.
                                           
                                           ### Solution: WorkspaceRegistryBridge
                                           
                                           A single observer that sits between `executeTransaction` and the registries.
                                           It does NOT modify `executeTransaction` — it hooks in as a post-commit listener. // packages/shared/src/workspace-bridge.interface.ts
export interface IWorkspaceBridgeEvent {
  type: 'CREATE_FILE' | 'UPDATE_FILE' | 'DELETE_FILE'
  path: string
  content: string
  timestamp: number
}

export interface IWorkspaceBridge {
  onTransaction(event: IWorkspaceBridgeEvent): Promise<void>
}

// packages/component-registry/src/workspace-bridge.ts
import type { IWorkspaceBridge, IWorkspaceBridgeEvent } from '@repo/shared'
import type { IRegistry } from '@repo/shared'
import type { ComponentMeta } from '@repo/shared'
import { parseComponentMeta } from './meta-parser'

export class WorkspaceRegistryBridge implements IWorkspaceBridge {
  constructor(
    private readonly componentRegistry: IRegistry<ComponentMeta>,
  ) {}

  async onTransaction(event: IWorkspaceBridgeEvent): Promise<void> {
    // Only care about .tsx/.ts files in components directory
    if (!this.isComponentFile(event.path)) return

    switch (event.type) {
      case 'CREATE_FILE':
      case 'UPDATE_FILE': {
        const meta = await parseComponentMeta(event.path, event.content)
        if (!meta) return
        // UPDATE_FILE: unregister first if already exists
        if (this.componentRegistry.has(meta.name)) {
          this.componentRegistry.unregister(meta.name)
        }
        this.componentRegistry.register(meta.name, meta)
        break
      }
      case 'DELETE_FILE': {
        const name = this.extractComponentName(event.path)
        if (name && this.componentRegistry.has(name)) {
          this.componentRegistry.unregister(name)
        }
        break
      }
    }
  }

  private isComponentFile(path: string): boolean {
    return (
      (path.endsWith('.tsx') || path.endsWith('.ts')) &&
      !path.includes('node_modules') &&
      !path.includes('.aura/')
    )
  }

  private extractComponentName(path: string): string | undefined {
    const match = path.match(/([A-Z][a-zA-Z0-9]*)\.tsx?$/)
    return match?.[1]
  }
}

// packages/component-registry/src/meta-parser.ts
// Parses ComponentMeta from .tsx file content
// Looks for exported ComponentMeta object first,
// then falls back to inferring from the component's name + export signature

import { parse } from '@babel/parser'
import traverse from '@babel/traverse'
import type { ComponentMeta } from '@repo/shared'

export async function parseComponentMeta(
  path: string,
  content: string,
): Promise<ComponentMeta | null> {
  try {
    const ast = parse(content, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx'],
    })

    // Strategy 1: explicit ComponentMeta export
    // Looks for: export const HeroSectionMeta: ComponentMeta = { ... }
    const explicit = extractExplicitMeta(ast)
    if (explicit) return explicit

    // Strategy 2: infer from component export
    // Looks for: export default function HeroSection() or export function HeroSection()
    return inferMetaFromExport(ast, path)
  } catch {
    // Unparseable file — not a valid component, skip silently
    return null
  }
}

function extractExplicitMeta(ast: unknown): ComponentMeta | null {
  // traverse AST looking for VariableDeclaration with type annotation ComponentMeta
  // implementation detail: use @babel/traverse
  return null // placeholder — implement with traverse
}

function inferMetaFromExport(ast: unknown, path: string): ComponentMeta | null {
  // Minimal inferred meta from filename + default export name
  const nameMatch = path.match(/([A-Z][a-zA-Z0-9]*)\.tsx?$/)
  if (!nameMatch) return null

  const name = nameMatch[1]!
  return {
    name,
    displayName: name.replace(/([A-Z])/g, ' $1').trim(),
    description: `Auto-discovered component: ${name}`,
    icon: 'box',
    category: 'layout',
    tags: [],
    slots: [],
    variants: [],
    events: [],
    permissions: [],
    documentation: '',
    aiHints: [],
    schemaKey: name,
  }
}

// useWorkspace.ts — minimal patch, add after line 566
// Do NOT modify executeTransaction's core logic

// After the existing files state update:
const applyTransaction = useCallback(async (ops: WorkspaceOperation[]) => {
  // ...existing executeTransaction logic...

  // Bridge: fire-and-forget, never blocks the transaction
  for (const op of ops) {
    if (op.type === 'CREATE_FILE' || op.type === 'UPDATE_FILE') {
      workspaceBridge.onTransaction({
        type: op.type,
        path: op.path,
        content: op.content,
        timestamp: Date.now(),
      }).catch(console.error) // never throws into workspace pipeline
    }
    if (op.type === 'DELETE_FILE') {
      workspaceBridge.onTransaction({
        type: 'DELETE_FILE',
        path: op.path,
        content: '',
        timestamp: Date.now(),
      }).catch(console.error)
    }
  }
}, [workspaceBridge]) **Key design rule:** The bridge is fire-and-forget. It never throws into
`executeTransaction`. A registry failure must never crash file creation. ## Gap 2 — LivePreview iframe → aura-runtime click intercept

### Problem

The iframe renders the preview but has no click intercept installed.
Clicking elements does nothing for the visual editor.

### Two-mode strategy

**Mode A: WebContainer + dev-server (preferred for visual editing)**

The WebContainer runs a real Vite dev server. The `vite-plugin-aura` injects
`data-aura-id` attributes at build time. The `aura-runtime.ts` script is
injected into the entry point.// apps/preview/src/main.tsx — add at top
import { init as initAuraRuntime } from '@repo/aura-runtime'

if (import.meta.env.DEV) {
  initAuraRuntime()
} // vite.config.ts inside WebContainer project
import { vitePluginAura } from '@repo/plugins'

export default defineConfig({
  plugins: [
    react(),
    vitePluginAura({ enabled: true }),
  ],
}) When the WebContainer boots, these are already in the project files.
Write them as part of the WebContainer scaffold when the project initializes.

**Mode B: srcDoc iframe (fallback)**

No Vite pipeline runs. Must inject aura-runtime as a script tag into the
compiled srcDoc HTML output before it is set on the iframe.// In LivePreview.tsx — wrap srcDoc generation
function injectAuraRuntime(srcDoc: string): string {
  const runtimeScript = `<script type="module">
    // Inline aura-runtime for srcDoc mode
    // data-aura-id injection happens via runtime DOM walk instead of build-time
    (function() {
      let _selectedId = null;

      function walkAndInstrument(root) {
        // Walk rendered DOM, assign data-aura-id based on component display name
        // This is best-effort — no AST line numbers available in srcDoc mode
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT)
        let node;
        let idx = 0;
        while ((node = walker.nextNode())) {
          if (!node.dataset.auraId) {
            node.dataset.auraId = 'srcDoc:' + idx++
            node.dataset.auraComponent = node.tagName.toLowerCase()
            node.dataset.auraMode = 'srcDoc'
          }
        }
      }

      document.addEventListener('DOMContentLoaded', () => walkAndInstrument(document.body))

      document.addEventListener('click', (e) => {
        const target = e.target.closest('[data-aura-id]')
        if (!target) return
        e.preventDefault()
        e.stopPropagation()
        window.parent.postMessage({
          type: 'AURA_SELECT',
          auraId: target.dataset.auraId,
          file: null,           // not available in srcDoc mode
          line: null,           // not available in srcDoc mode
          componentName: target.dataset.auraComponent,
          mode: 'srcDoc',
          rect: (() => {
            const r = target.getBoundingClientRect()
            return { top: r.top, left: r.left, width: r.width, height: r.height }
          })(),
          computedClasses: (target.className || '').split(' ').filter(Boolean),
        }, '*')
      }, true)

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') window.parent.postMessage({ type: 'AURA_DESELECT' }, '*')
      })
    })()
  </script>`

  // Inject before closing </head> or at start of <body>
  return srcDoc.replace('</head>', runtimeScript + '</head>')
} // LivePreview.tsx — patch the srcDoc assignment
// Before (line ~706):
// <iframe srcDoc={compiledSrcDoc} ... />

// After:
<iframe
  srcDoc={previewMode === 'srcDoc' ? injectAuraRuntime(compiledSrcDoc) : undefined}
  src={previewMode === 'webcontainer' ? webcontainerUrl : undefined}
  // ...rest of props
/> // LivePreview.tsx or EditorCanvas.tsx — add postMessage listener
useEffect(() => {
  const handler = (e: MessageEvent) => {
    if (e.data?.type === 'AURA_SELECT') {
      selectionStore.setSelection({
        auraId: e.data.auraId,
        file: e.data.file,        // null in srcDoc mode
        line: e.data.line,        // null in srcDoc mode
        componentName: e.data.componentName,
        rect: e.data.rect,
        computedTailwindClasses: e.data.computedClasses,
        mode: e.data.mode ?? 'webcontainer',
        resolvedMeta: null,       // resolved async after selection
        resolvedSchema: null,
      })
    }
    if (e.data?.type === 'AURA_DESELECT') {
      selectionStore.clearSelection()
    }
  }

  window.addEventListener('message', handler)
  return () => window.removeEventListener('message', handler)
}, []) ## Gap 3 — SelectionState → Sidebar panels

### Problem

After AURA_SELECT fires and selectionStore is populated, the Sidebar needs to:

1. Resolve ComponentMeta from ComponentRegistry (by componentName)
2. Resolve ComponentSchema from SchemaRegistry (by meta.schemaKey)
3. Render the correct panels

### Solution: useSelectionResolution hook // apps/editor/src/hooks/useSelectionResolution.ts
import { useEffect } from 'react'
import { useSelectionStore } from '../stores/selection.store'
import { useSchemaStore } from '../stores/schema.store'
import { useComponentService } from './useComponentService'
import { useSchemaService } from './useSchemaService'

export function useSelectionResolution(): void {
  const { selection, setResolvedMeta, setResolvedSchema } = useSelectionStore()
  const componentService = useComponentService()
  const schemaService = useSchemaService()

  useEffect(() => {
    if (!selection.componentName) {
      setResolvedMeta(null)
      setResolvedSchema(null)
      return
    }

    // Resolve meta from ComponentRegistry via ComponentService
    const meta = componentService.getByKey(selection.componentName)
    setResolvedMeta(meta ?? null)

    if (!meta) return

    // Resolve schema from SchemaRegistry via SchemaService
    const schema = schemaService.resolveForSelection(selection)
    setResolvedSchema(schema)
  }, [selection.componentName, selection.auraId])
} // apps/editor/src/components/Sidebar/Sidebar.tsx
export function Sidebar() {
  // This hook wires selection → meta → schema automatically
  useSelectionResolution()

  const { selection } = useSelectionStore()
  const { currentSchema, currentMeta } = useSchemaStore()

  if (!selection.auraId) {
    return <SidebarEmpty />
  }

  return (
    <SidebarShell meta={currentMeta}>
      <TabPanel />
    </SidebarShell>
  )
} ## Gap 4 — Sidebar field changes → persistence pipeline

### Problem

In srcDoc mode, there is no real file to write to — ts-morph cannot
operate on in-memory strings (it needs a real filesystem path).
In WebContainer mode, the file exists in the WebContainer FS —
but the gateway runs outside the WebContainer.

### Solution: dual persistence strategy // packages/shared/src/persistence.interface.ts — add mode discriminator
export type PersistenceMode = 'ast' | 'workspace-state' | 'cms'

// packages/persistence/src/persistence.service.ts
export class PersistenceService {
  constructor(
    private readonly adapters: Map<PersistenceMode, IPersistenceAdapter>,
    private readonly activeMode: PersistenceMode,
  ) {}

  private get adapter(): IPersistenceAdapter {
    const a = this.adapters.get(this.activeMode)
    if (!a) throw new Error(`No adapter registered for mode: ${this.activeMode}`)
    return a
  }

  async updateProp(op: UpdatePropOperation): Promise<void> {
    await this.adapter.updateProp(op)
  }
  // ...rest delegate to this.adapter
} **Mode A (WebContainer):** Use the existing `WorkspaceFiles` state as the
write target. Create a `WorkspaceStatePersistenceAdapter` that calls
`executeTransaction(UPDATE_FILE)` — this writes to WebContainer FS and
triggers HMR automatically. No gateway needed. // packages/persistence/src/adapters/workspace-state.adapter.ts
export class WorkspaceStatePersistenceAdapter implements IPersistenceAdapter {
  readonly name = 'workspace-state'

  constructor(
    private readonly executeTransaction: (ops: WorkspaceOperation[]) => void,
    private readonly getFileContent: (path: string) => string | undefined,
    private readonly astEngine: ASTEngineInMemory, // operates on strings, not files
  ) {}

  async updateProp(op: UpdatePropOperation): Promise<void> {
    const content = this.getFileContent(op.file)
    if (!content) throw new Error(`File not found in workspace: ${op.file}`)

    // ASTEngineInMemory operates on the string content, not filesystem
    const updated = await this.astEngine.updateProp(content, op)

    this.executeTransaction([{
      type: 'UPDATE_FILE',
      path: op.file,
      content: updated,
    }])
    // executeTransaction → WorkspaceFiles state update → WebContainer FS → HMR
    // The existing pipeline handles the rest
  }
} **Mode B (srcDoc):** Visual edits update `WorkspaceFiles` state directly.
The srcDoc recompiles and the iframe reloads via the existing debounce mechanism.
No AST needed — for srcDoc, edits can be string-level prop replacements
(acceptable tradeoff since srcDoc has no real file to preserve formatting on).

**Mode selection:** Set at session start based on whether WebContainer is available. // kernel.bootstrap.ts
const activeMode: PersistenceMode = webcontainerAvailable ? 'ast' : 'workspace-state'
const persistence = new PersistenceService(adapters, activeMode) ## Complete integration sequence

Execute in this order. Each step is independently testable.

### Step 1 — Wire WorkspaceRegistryBridge (1-2 hours)

- Create `WorkspaceRegistryBridge` in `packages/component-registry/`
- Create `meta-parser.ts` (Strategy 1: explicit meta, Strategy 2: inferred)
- Add bridge call after `executeTransaction` in `useWorkspace.ts`
- Test: generate a component via AI → open browser devtools → verify
`kernel.get('components').keys()` includes the new component name

### Step 2 — Inject aura-runtime into preview iframe (2-3 hours)

- Mode A: add `initAuraRuntime()` to WebContainer project scaffold
- Mode B: add `injectAuraRuntime(srcDoc)` wrapper in `LivePreview.tsx`
- Add `postMessage` listener in `LivePreview.tsx`
- Wire to `selectionStore.setSelection()`
- Test: click any element in preview → console.log the selection store state

### Step 3 — Wire Sidebar to selection (1-2 hours)

- Add `useSelectionResolution()` hook
- Wire to `Sidebar.tsx`
- Test: click a component → Sidebar shows component name and schema-driven fields

### Step 4 — Wire Sidebar field changes to persistence (2-4 hours)

- Create `WorkspaceStatePersistenceAdapter`
- Create `ASTEngineInMemory` (string-based AST ops, no filesystem)
- Wire field change → persistence → `executeTransaction(UPDATE_FILE)` → HMR
- Test: change a text field → preview updates live

### Step 5 — Full integration test

- Generate a component via AI
- Click it in the preview
- Edit a field in the sidebar
- Verify the preview updates
- Verify `WorkspaceFiles` state contains the updated content

---

## What does NOT need to change

- `streamAiGeneration` — untouched
- `executeTransaction` core logic — only a post-commit hook added
- `LivePreview` iframe rendering logic — only srcDoc wrapping added
- WebContainer boot sequence — only `main.tsx` and `vite.config.ts` in scaffold
- Backend persistence (`saveWorkspaceApi`) — untouched
- localStorage persistence (`usePersistentWorkspace`) — untouched

The bridge is additive. The existing pipeline is preserved exactly.
