import { useEffect, useState, type RefObject } from 'react'

interface Rect {
  readonly top: number
  readonly left: number
  readonly width: number
  readonly height: number
}

/**
 * Tracks the live bounding box of the element with `data-aura-id={id}`
 * inside `containerRef`, relative to that container. Re-measures on
 * ResizeObserver (element/container size changes), scroll, and window
 * resize -- so the outline stays glued to the element through layout
 * shifts, animations, and responsive breakpoints instead of the fixed
 * 800ms-poll staleness of the old implementation.
 */
function useTrackedRect(
  id: string | null,
  containerRef: RefObject<HTMLElement | null>
): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!id || !container) {
      setRect(null)
      return
    }

    const target = container.querySelector<HTMLElement>(
      `[data-aura-id="${cssEscape(id)}"]`
    )
    if (!target) {
      setRect(null)
      return
    }

    const measure = () => {
      const targetBox = target.getBoundingClientRect()
      const containerBox = container.getBoundingClientRect()
      setRect({
        top: targetBox.top - containerBox.top + container.scrollTop,
        left: targetBox.left - containerBox.left + container.scrollLeft,
        width: targetBox.width,
        height: targetBox.height
      })
    }

    measure()

    const resizeObserver = new ResizeObserver(measure)
    resizeObserver.observe(target)
    resizeObserver.observe(container)

    container.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure)

    return () => {
      resizeObserver.disconnect()
      container.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
    }
  }, [id, containerRef])

  return rect
}

function cssEscape(value: string): string {
  return typeof CSS !== 'undefined' && CSS.escape
    ? CSS.escape(value)
    : value.replace(/["\\]/g, '\\$&')
}

export function SelectionOverlay({
  containerRef,
  hoveredId,
  selectedId
}: {
  readonly containerRef: RefObject<HTMLElement | null>
  readonly hoveredId: string | null
  readonly selectedId: string | null
}) {
  const hoverRect = useTrackedRect(
    hoveredId !== selectedId ? hoveredId : null,
    containerRef
  )
  const selectedRect = useTrackedRect(selectedId, containerRef)

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {hoverRect ? <OutlineBox rect={hoverRect} variant="hover" /> : null}
      {selectedRect ? (
        <OutlineBox rect={selectedRect} variant="selected" />
      ) : null}
    </div>
  )
}

function OutlineBox({
  rect,
  variant
}: {
  readonly rect: Rect
  readonly variant: 'hover' | 'selected'
}) {
  return (
    <div
      className={
        variant === 'selected'
          ? 'absolute rounded-[2px] ring-2 ring-indigo-600'
          : 'absolute rounded-[2px] ring-1 ring-indigo-300'
      }
      style={{
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      }}
    />
  )
}