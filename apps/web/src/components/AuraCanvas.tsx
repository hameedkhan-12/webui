'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { bootstrapAura, type AuraRuntime } from '@aura/blocks'
import {
  AuraRuntimeProvider,
  Canvas,
  DesignModeProvider,
  createContentTreeStore,
  useContentTree,
  type ContentTreeStore,
} from '@aura/renderer'
import { SchemaInspectorPanel } from '@/components/SchemaInspectorPanel'

// ─── Demo content tree ────────────────────────────────────────────────────────
// Nav > Hero > Grid[Card, Card, Card] > Footer
// Ids are stable constants — never regenerated at render time.

import type { ContentNode } from '@aura/renderer'

const DEMO_NODES: readonly ContentNode[] = [
  {
    id: 'demo-nav',
    type: 'Nav',
    props: {
      brand: 'Aura Studio',
      links: [
        { label: 'Features', href: '#features' },
        { label: 'Docs', href: '#docs' },
        { label: 'Pricing', href: '#pricing' },
      ],
    },
  },
  {
    id: 'demo-hero',
    type: 'Hero',
    props: {
      title: 'Build beautiful pages, visually.',
      subtitle:
        'Drag, drop, and configure blocks — the canvas updates instantly, with no code required.',
      ctaLabel: 'Get started free',
    },
  },
  {
    id: 'demo-grid',
    type: 'Grid',
    props: { columns: 3, gap: 'md' },
    children: [
      {
        id: 'demo-card-1',
        type: 'Card',
        props: {
          title: 'Component Library',
          description:
            '12 production-ready blocks, each with typed props and a generated schema.',
          elevated: true,
        },
        slot: 'children',
      },
      {
        id: 'demo-card-2',
        type: 'Card',
        props: {
          title: 'Click-to-select',
          description:
            'Click any block on the canvas to inspect and edit its props in real time.',
          elevated: true,
        },
        slot: 'children',
      },
      {
        id: 'demo-card-3',
        type: 'Card',
        props: {
          title: 'Schema-validated',
          description:
            'Every prop write is validated against its field schema before being applied.',
          elevated: true,
        },
        slot: 'children',
      },
    ],
  },
  {
    id: 'demo-footer',
    type: 'Footer',
    props: {
      copyrightText: '© 2025 Aura Studio. All rights reserved.',
      links: [
        { label: 'Privacy', href: '#privacy' },
        { label: 'Terms', href: '#terms' },
      ],
    },
  },
]

// ─── Inner canvas + inspector layout ─────────────────────────────────────────

function CanvasInner({ runtime }: { readonly runtime: AuraRuntime }) {
  // Store is stable for this component's lifetime (runtime is the module singleton).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const store: ContentTreeStore = useMemo(() => createContentTreeStore(DEMO_NODES, runtime), [])
  const { nodes, updateProp } = useContentTree(store)

  // Stable callback: wraps updateProp so its reference doesn't change on every
  // tree update, preventing SchemaInspectorPanel from re-mounting constantly.
  const stableUpdateProp = useCallback(
    (nodeId: string, propKey: string, value: unknown) =>
      updateProp(nodeId, propKey, value),
    [updateProp]
  )

  return (
    // Full-height split-pane: canvas on the left, inspector on the right.
    <div className="flex h-screen overflow-hidden bg-gray-100">

      {/* ── Canvas pane ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        {/*
          AuraRuntimeProvider + DesignModeProvider WRAP BOTH the Canvas and
          SchemaInspectorPanel so they share the same selectedId context.
          The inspector reads selectedId via useDesignMode() internally.
        */}
        <AuraRuntimeProvider runtime={runtime}>
          <DesignModeProvider enabled>
            {/* canvas */}
            <div className="min-h-full">
              <Canvas
                nodes={nodes}
                className="min-h-screen bg-white shadow-sm"
              />
            </div>

            {/* ── Inspector pane ───────────────────────────────────────── */}
            <aside className="fixed right-0 top-0 flex h-screen w-72 flex-col border-l border-gray-200 bg-white shadow-lg">
              {/* Inspector header */}
              <div className="shrink-0 border-b border-gray-200 px-4 py-3">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                  Inspector
                </h2>
              </div>

              {/* Inspector body — scrollable */}
              <div className="flex flex-1 flex-col overflow-hidden">
                <SchemaInspectorPanel nodes={nodes} updateProp={stableUpdateProp} />
              </div>
            </aside>
          </DesignModeProvider>
        </AuraRuntimeProvider>
      </div>
    </div>
  )
}

// ─── Async boot wrapper ───────────────────────────────────────────────────────

/**
 * Calls bootstrapAura() (idempotent — returns the cached singleton on repeat
 * calls) to obtain the AuraRuntime, then mounts the canvas+inspector layout.
 */
export function AuraCanvas() {
  const [runtime, setRuntime] = useState<AuraRuntime | null>(null)
  const [error, setError] = useState<string | null>(null)
  const booted = useRef(false)

  useEffect(() => {
    if (booted.current) return
    booted.current = true

    bootstrapAura()
      .then(setRuntime)
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err)
        setError(msg)
        console.error('[AuraCanvas] boot failed:', err)
      })
  }, [])

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-red-50">
        <div className="max-w-md rounded-xl border border-red-200 bg-white p-6 text-center shadow">
          <p className="text-sm font-semibold text-red-600">Canvas boot failed</p>
          <p className="mt-2 font-mono text-xs text-red-400">{error}</p>
        </div>
      </div>
    )
  }

  if (!runtime) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#070913]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-indigo-500" />
          <p className="text-xs uppercase tracking-widest text-slate-500">
            Booting Aura runtime…
          </p>
        </div>
      </div>
    )
  }

  return <CanvasInner runtime={runtime} />
}
