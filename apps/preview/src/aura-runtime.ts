/** Aura Runtime - Client-side runtime for click interception and element selection */

/** Message sent to parent window when element is selected */
export interface AuraSelectMessage {
  type: 'AURA_SELECT'
  auraId: string
  file: string
  line: string
  componentName: string
  rect: DOMRect
  computedClasses: string
}

/** Message sent to parent window when element is deselected */
export interface AuraDeselectMessage {
  type: 'AURA_DESELECT'
}

/** Message sent to parent window when element is hovered */
export interface AuraHoverMessage {
  type: 'AURA_HOVER'
  auraId: string
  rect: DOMRect
}

/** Union of all message types */
export type AuraMessage = AuraSelectMessage | AuraDeselectMessage | AuraHoverMessage

/** Find closest ancestor with data-aura-id attribute */
function findAuraElement(element: Element | null): Element | null {
  let current = element
  while (current) {
    if (current instanceof Element && current.hasAttribute('data-aura-id')) {
      return current
    }
    current = current.parentElement
  }
  return null
}

/** Get DOMRect from element */
function getElementRect(element: Element): DOMRect {
  return element.getBoundingClientRect()
}

/** Get computed classes from element */
function getComputedClasses(element: Element): string {
  return element.className || ''
}

/** Create AURA_SELECT message */
function createSelectMessage(element: Element): AuraSelectMessage {
  const auraId = element.getAttribute('data-aura-id') ?? ''
  const file = element.getAttribute('data-aura-file') ?? ''
  const line = element.getAttribute('data-aura-line') ?? ''
  const componentName = element.getAttribute('data-aura-component') ?? ''
  const rect = getElementRect(element)
  const computedClasses = getComputedClasses(element)

  return {
    type: 'AURA_SELECT',
    auraId,
    file,
    line,
    componentName,
    rect,
    computedClasses,
  }
}

/** Aura Runtime Interface */
export interface AuraRuntime {
  /** Initialize runtime - start listening for interactions */
  init(): void
  /** Dispose runtime - stop listening for interactions */
  dispose(): void
}

/** Global runtime instance */
let runtimeInstance: {
  clickHandler: ((e: MouseEvent) => void) | null
  keyHandler: ((e: KeyboardEvent) => void) | null
  hoverHandler: ((e: MouseEvent) => void) | null
  hoverTimeout: number | null
  lastHoveredElement: Element | null
} | null = null

/**
 * Initialize the Aura runtime
 * - Intercepts all clicks in capture phase
 * - Walks up DOM to find closest [data-aura-id]
 * - Sends AURA_SELECT message to parent
 * - Handles Escape key for deselection
 * - Handles mouseover for hover with debouncing
 */
export function init(): void {
  if (runtimeInstance !== null) {
    // Already initialized
    return
  }

  runtimeInstance = {
    clickHandler: null,
    keyHandler: null,
    hoverHandler: null,
    hoverTimeout: null,
    lastHoveredElement: null,
  }

  // Handle click events
  const clickHandler = (e: MouseEvent) => {
    const target = e.target as Element | null
    const auraElement = findAuraElement(target)

    if (auraElement) {
      e.preventDefault()
      e.stopPropagation()

      const message = createSelectMessage(auraElement)
      window.parent.postMessage(message, '*')
    }
  }

  // Handle keyboard events
  const keyHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape' || e.key === 'Esc') {
      const message: AuraDeselectMessage = { type: 'AURA_DESELECT' }
      window.parent.postMessage(message, '*')
    }
  }

  // Handle hover events (debounced 50ms)
  const hoverHandler = (e: MouseEvent) => {
    const target = e.target as Element | null
    const auraElement = findAuraElement(target)

    if (auraElement) {
      // Clear previous timeout
      if (runtimeInstance!.hoverTimeout !== null) {
        clearTimeout(runtimeInstance!.hoverTimeout)
      }

      // Only send hover if element is different from last hover
      if (auraElement !== runtimeInstance!.lastHoveredElement) {
        runtimeInstance!.lastHoveredElement = auraElement

        runtimeInstance!.hoverTimeout = window.setTimeout(() => {
          const auraId = auraElement.getAttribute('data-aura-id') ?? ''
          const rect = getElementRect(auraElement)

          const message: AuraHoverMessage = {
            type: 'AURA_HOVER',
            auraId,
            rect,
          }

          window.parent.postMessage(message, '*')
          runtimeInstance!.hoverTimeout = null
        }, 50) as unknown as number
      }
    }
  }

  // Attach event listeners in capture phase
  document.addEventListener('click', clickHandler, { capture: true })
  document.addEventListener('keydown', keyHandler, { capture: true })
  document.addEventListener('mouseover', hoverHandler, { capture: true })

  runtimeInstance.clickHandler = clickHandler
  runtimeInstance.keyHandler = keyHandler
  runtimeInstance.hoverHandler = hoverHandler
}

/**
 * Dispose the Aura runtime
 * - Remove all event listeners
 * - Clear timers
 * - Reset state
 */
export function dispose(): void {
  if (runtimeInstance === null) {
    // Not initialized
    return
  }

  const { clickHandler, keyHandler, hoverHandler, hoverTimeout } = runtimeInstance

  // Remove event listeners
  if (clickHandler) {
    document.removeEventListener('click', clickHandler, { capture: true })
  }
  if (keyHandler) {
    document.removeEventListener('keydown', keyHandler, { capture: true })
  }
  if (hoverHandler) {
    document.removeEventListener('mouseover', hoverHandler, { capture: true })
  }

  // Clear timeout
  if (hoverTimeout !== null) {
    clearTimeout(hoverTimeout)
  }

  // Reset instance
  runtimeInstance = null
}

/** Export as default object */
export default { init, dispose } as AuraRuntime
