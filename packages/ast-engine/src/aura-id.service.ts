/**
 * AuraIdService — JSX data-aura-id management.
 *
 * Operates on raw TSX source strings only. No I/O. No side effects.
 * IDs are UUIDs generated with Node's built-in crypto module — no external deps.
 */

import { randomUUID } from 'node:crypto'

// Matches JSX opening tags (not closing, not comments).
// Captures: full match [0], tag content before close [1]
const JSX_OPEN_TAG_RE =
  /<([A-Z][A-Za-z0-9.]*|[a-z][a-z0-9-]*)(\s[^>]*)?(\/?>)/g

const AURA_ID_ATTR = 'data-aura-id'
const AURA_ID_RE = /\sdata-aura-id="[^"]+"/g

/**
 * Generate a fresh collision-resistant aura ID.
 */
export function generate(): string {
  return randomUUID()
}

/**
 * Scan `source` and inject `data-aura-id` onto every JSX opening tag
 * that does not already have one.
 *
 * Self-closing tags (`<Foo />`) are handled correctly.
 * Skips intrinsic HTML tags (lowercase) to avoid polluting non-component nodes
 * unless `includeIntrinsic` is set to true.
 */
export function tag(source: string, includeIntrinsic = false): string {
  return source.replace(
    JSX_OPEN_TAG_RE,
    (fullMatch, tagName: string, attrs: string | undefined, close: string) => {
      // Skip lowercase intrinsic HTML tags unless opted-in
      if (!includeIntrinsic && tagName[0] === tagName[0]?.toLowerCase()) {
        return fullMatch
      }
      // Already has an aura id — leave it untouched
      if (attrs && attrs.includes(AURA_ID_ATTR)) {
        return fullMatch
      }
      const id = generate()
      const existingAttrs = attrs ?? ''
      return `<${tagName}${existingAttrs} ${AURA_ID_ATTR}="${id}"${close}`
    }
  )
}

/**
 * Remove all `data-aura-id` attributes from `source` (for clean code export).
 */
export function strip(source: string): string {
  return source.replace(AURA_ID_RE, '')
}

/**
 * Return all `data-aura-id` values present in `source`.
 */
export function collect(source: string): string[] {
  const ids: string[] = []
  const attrRegex = /data-aura-id="([^"]+)"/g
  let m: RegExpExecArray | null
  while ((m = attrRegex.exec(source)) !== null) {
    ids.push(m[1]!)
  }
  return ids
}
