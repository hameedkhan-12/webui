import { useRef, type MouseEvent } from 'react'
import { BlockRenderer } from './BlockRenderer.js'
import { SelectionOverlay } from './SelectionOverlay.js'
import { useDesignMode } from './design-mode-context.js'
import type { ContentNode } from './content-node.js'

function closestAuraId(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null
  return target.closest('[data-aura-id]')?.getAttribute('data-aura-id') ?? null
}

/**
 * Renders a page's block tree and, when design mode is enabled, makes
 * every block clickable/selectable via ONE delegated listener on the
 * container -- rather than wiring selection logic into each block or
 * (the old approach) injecting a script that has to go find elements
 * after the fact. Because every block's data-aura-id comes from
 * BlockRenderer itself, this works unconditionally for any tree built
 * from registered blocks.
 */
export function Canvas({
  nodes,
  className
}: {
  readonly nodes: readonly ContentNode[]
  readonly className?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { enabled, hoveredId, selectedId, hover, select } = useDesignMode()

  const handleClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!enabled) return
    const id = closestAuraId(event.target)
    if (!id) {
      // Clicked the canvas background — clear selection.
      select(null)
      return
    }
    // Swallow the block's own interaction (link navigation, button
    // onClick, form submit) while in design mode -- we're selecting it,
    // not using it.
    event.preventDefault()
    event.stopPropagation()
    select(id)
  }

  const handleMouseOver = (event: MouseEvent<HTMLDivElement>) => {
    if (!enabled) return
    const id = closestAuraId(event.target)
    if (id) hover(id)
  }

  const handleMouseOut = (event: MouseEvent<HTMLDivElement>) => {
    if (!enabled) return
    const leavingId = closestAuraId(event.target)
    const enteringId = closestAuraId(event.relatedTarget as EventTarget | null)
    // Only clear hover when actually leaving the hovered block's
    // boundary, not when moving between its own children.
    if (leavingId !== enteringId) hover(enteringId)
  }

  return (
    <div
      ref={containerRef}
      className={['relative', className ?? ''].join(' ')}
      onClickCapture={handleClickCapture}
      onMouseOver={handleMouseOver}
      onMouseOut={handleMouseOut}
    >
      <div className="flex flex-col gap-6">
        {nodes.map(node => (
          <BlockRenderer key={node.id} node={node} />
        ))}
      </div>

      {enabled ? (
        <SelectionOverlay
          containerRef={containerRef}
          hoveredId={hoveredId}
          selectedId={selectedId}
        />
      ) : null}
    </div>
  )
}