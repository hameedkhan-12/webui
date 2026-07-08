/**
 * ASTParser — read path.
 *
 * Operates on raw TSX source strings only.
 * No filesystem I/O. No side effects.
 */

export interface ParsedNode {
  readonly auraId: string
  /** 1-indexed line number of the opening tag */
  readonly line: number
  /** Raw opening-tag text, e.g. `<Button data-aura-id="abc" ... >` */
  readonly raw: string
}

/**
 * Build a regex that matches a JSX opening tag containing the given auraId.
 * Handles self-closing and normal tags.
 */
function buildTagRegex(auraId: string): RegExp {
  // Escape special regex chars in the auraId (UUIDs are safe, but be defensive)
  const escaped = auraId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // Match any opening tag that contains data-aura-id="<auraId>"
  return new RegExp(
    `<[A-Za-z][A-Za-z0-9.]*(?:\\s[^>]*?)?\\sdata-aura-id="${escaped}"(?:\\s[^>]*)?>`,
    's'
  )
}

/**
 * Count the number of newlines before `index` in `source` to get 1-indexed line.
 */
function lineAt(source: string, index: number): number {
  let count = 1
  for (let i = 0; i < index; i++) {
    if (source[i] === '\n') count++
  }
  return count
}

/**
 * Find the first JSX opening tag in `source` that carries the given `data-aura-id`.
 * Returns null if not found.
 */
export function findNodeByAuraId(source: string, auraId: string): ParsedNode | null {
  const regex = buildTagRegex(auraId)
  const match = regex.exec(source)
  if (!match) return null

  return {
    auraId,
    line: lineAt(source, match.index),
    raw: match[0],
  }
}

/**
 * Extract all JSX props from the tag matching `auraId` as a key→value map.
 * - Boolean props (bare attribute names) map to `true`.
 * - String props map to their string value.
 * - Ignores `data-aura-id` itself.
 */
export function extractProps(source: string, auraId: string): Record<string, unknown> {
  const node = findNodeByAuraId(source, auraId)
  if (!node) return {}

  const props: Record<string, unknown> = {}
  // Strip leading tag name to get the attribute section
  const attrSection = node.raw.replace(/^<[A-Za-z][A-Za-z0-9.]*/, '').replace(/>$/, '')

  // Match key="value", key={value}, or bare key
  const attrRegex = /([A-Za-z_][A-Za-z0-9_-]*)(?:=(?:"([^"]*)"|'([^']*)'|\{([^}]*)\}))?/g
  let m: RegExpExecArray | null
  while ((m = attrRegex.exec(attrSection)) !== null) {
    const key = m[1]!
    if (key === 'data-aura-id') continue
    if (m[2] !== undefined) {
      props[key] = m[2]              // "string value"
    } else if (m[3] !== undefined) {
      props[key] = m[3]              // 'string value'
    } else if (m[4] !== undefined) {
      // {expression} — store as raw string
      props[key] = m[4].trim()
    } else {
      props[key] = true              // bare boolean prop
    }
  }

  return props
}

/**
 * Extract the Tailwind class list from `className` of the node matching `auraId`.
 * Returns an empty array if no `className` prop is found.
 */
export function extractClasses(source: string, auraId: string): string[] {
  const props = extractProps(source, auraId)
  const className = props['className']
  if (typeof className !== 'string') return []
  return className.split(/\s+/).filter(Boolean)
}
