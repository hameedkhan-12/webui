import type { ReactNode } from 'react'
import { useAuraRuntime } from './aura-runtime-context.js'
import { groupChildrenBySlot, type ContentNode } from './content-node.js'

export function BlockRenderer({ node }: { readonly node: ContentNode }) {
  const runtime = useAuraRuntime()
  const Component = runtime.getComponent(node.type)

  if (!Component) {
    return <UnknownBlock node={node} />
  }

  const slotProps = buildSlotProps(node.children)

  // node.props is untyped data from the content tree; the block component
  // is responsible for validating/defaulting its own fields against its
  // schema (Phase 3's persistence layer validates on write, so by the
  // time a node reaches here its props should already be schema-valid).
  return <Component {...node.props} {...slotProps} auraId={node.id} />
}

function buildSlotProps(
  children: readonly ContentNode[] | undefined
): Record<string, ReactNode> {
  const bySlot = groupChildrenBySlot(children)
  const slotProps: Record<string, ReactNode> = {}

  for (const [slot, nodes] of bySlot) {
    slotProps[slot] =
      nodes.length === 1 ? (
        <BlockRenderer key={nodes[0]!.id} node={nodes[0]!} />
      ) : (
        <>
          {nodes.map(child => (
            <BlockRenderer key={child.id} node={child} />
          ))}
        </>
      )
  }

  return slotProps
}

/**
 * Renders instead of a block whose `type` isn't registered -- e.g. an AI
 * response referenced a block that doesn't exist yet, or a schema/version
 * mismatch. Crucially this STILL carries data-aura-id, so the node stays
 * visible and selectable in the canvas instead of silently disappearing.
 */
function UnknownBlock({ node }: { readonly node: ContentNode }) {
  return (
    <div
      data-aura-id={node.id}
      data-aura-type={node.type}
      className="rounded border border-dashed border-red-400 bg-red-50 px-3 py-2 text-xs text-red-600"
    >
      Unknown block type: <code>{node.type}</code>
    </div>
  )
}