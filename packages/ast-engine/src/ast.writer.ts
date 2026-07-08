/**
 * ASTWriter — write path.
 *
 * All methods accept a source string and return a NEW source string.
 * Nothing is mutated. No filesystem I/O. No side effects.
 *
 * All operations target the JSX opening tag identified by `auraId`.
 */

import type {
  UpdatePropOperation,
  UpdateStyleOperation,
  UpdateChildrenOperation,
  AddClassOperation,
  RemoveClassOperation,
} from '@repo/shared'

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Build a regex matching the full opening tag that carries `auraId`. */
function buildTagRegex(auraId: string): RegExp {
  const escaped = auraId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(
    `(<[A-Za-z][A-Za-z0-9.]*(?:\\s[^>]*?)?\\sdata-aura-id="${escaped}"(?:\\s[^>]*)?>)`,
    's'
  )
}

/**
 * Replace the opening tag matching `auraId` in `source` with a new tag string.
 * Returns the original source unchanged if the tag isn't found.
 */
function replaceTag(source: string, auraId: string, newTag: string): string {
  const regex = buildTagRegex(auraId)
  return source.replace(regex, newTag)
}

/**
 * Within a tag string, rewrite (or add) a prop `key` to `newValue`.
 * newValue should already be formatted as the attribute string, e.g.
 * `"hello"`, `{42}`, `{true}`.
 */
function rewritePropInTag(tag: string, prop: string, newValue: string): string {
  // Try to replace existing: key="..." / key='...' / key={...}
  const existingRegex = new RegExp(
    `(\\s${prop}\\s*=\\s*)(?:"[^"]*"|'[^']*'|\\{[^}]*\\})`,
  )
  if (existingRegex.test(tag)) {
    return tag.replace(existingRegex, `$1${newValue}`)
  }
  // Prop doesn't exist yet — inject before the closing `>` or `/>`
  return tag.replace(/(\s*\/?>)$/, ` ${prop}=${newValue}$1`)
}

/**
 * Extract the className string from a tag, or '' if not present.
 */
function extractClassNameFromTag(tag: string): string {
  const m = /className\s*=\s*"([^"]*)"/.exec(tag)
  return m ? (m[1] ?? '') : ''
}

/**
 * Replace or insert className in a tag.
 */
function setClassNameInTag(tag: string, classes: string): string {
  if (/className\s*=\s*"/.test(tag)) {
    return tag.replace(/className\s*=\s*"[^"]*"/, `className="${classes}"`)
  }
  return tag.replace(/(\s*\/?>)$/, ` className="${classes}"$1`)
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Rewrite a JSX prop value on the node identified by `op.auraId`.
 * String values are quoted; all other values are wrapped in `{}`.
 */
export function updateProp(source: string, op: UpdatePropOperation): string {
  const regex = buildTagRegex(op.auraId)
  const match = regex.exec(source)
  if (!match) return source

  const originalTag = match[1]!
  const formatted =
    typeof op.value === 'string' ? `"${op.value}"` : `{${String(op.value)}}`
  const newTag = rewritePropInTag(originalTag, op.prop, formatted)
  return replaceTag(source, op.auraId, newTag)
}

/**
 * Replace `op.oldClass` with `op.newClass` inside `className` of the target node.
 */
export function updateStyle(source: string, op: UpdateStyleOperation): string {
  const regex = buildTagRegex(op.auraId)
  const match = regex.exec(source)
  if (!match) return source

  const originalTag = match[1]!
  const currentClasses = extractClassNameFromTag(originalTag)
  const updatedClasses = currentClasses
    .split(/\s+/)
    .map(cls => (cls === op.oldClass ? op.newClass : cls))
    .join(' ')
    .trim()

  const newTag = setClassNameInTag(originalTag, updatedClasses)
  return replaceTag(source, op.auraId, newTag)
}

/**
 * Replace the text children of the node identified by `op.auraId`.
 * Replaces the content between the matching opening and its next closing tag.
 */
export function updateChildren(source: string, op: UpdateChildrenOperation): string {
  const tagRegex = buildTagRegex(op.auraId)
  const tagMatch = tagRegex.exec(source)
  if (!tagMatch) return source

  const afterTagStart = tagMatch.index + tagMatch[0].length

  // Find closing tag: look for </TagName> after the opening tag
  const tagNameMatch = /^<([A-Za-z][A-Za-z0-9.]*)/.exec(tagMatch[1]!)
  if (!tagNameMatch) return source
  const tagName = tagNameMatch[1]!

  const closingRegex = new RegExp(`</${tagName}>`, 's')
  const rest = source.slice(afterTagStart)
  const closingMatch = closingRegex.exec(rest)
  if (!closingMatch) return source

  return (
    source.slice(0, afterTagStart) +
    op.value +
    source.slice(afterTagStart + closingMatch.index)
  )
}

/**
 * Append `op.className` to the `className` prop of the target node.
 * If `className` doesn't exist, it is created.
 */
export function addClass(source: string, op: AddClassOperation): string {
  const regex = buildTagRegex(op.auraId)
  const match = regex.exec(source)
  if (!match) return source

  const originalTag = match[1]!
  const currentClasses = extractClassNameFromTag(originalTag)
  const classes = currentClasses
    ? `${currentClasses} ${op.className}`
    : op.className
  const newTag = setClassNameInTag(originalTag, classes.trim())
  return replaceTag(source, op.auraId, newTag)
}

/**
 * Remove `op.className` from the `className` prop of the target node.
 */
export function removeClass(source: string, op: RemoveClassOperation): string {
  const regex = buildTagRegex(op.auraId)
  const match = regex.exec(source)
  if (!match) return source

  const originalTag = match[1]!
  const currentClasses = extractClassNameFromTag(originalTag)
  const classes = currentClasses
    .split(/\s+/)
    .filter(cls => cls !== op.className)
    .join(' ')
    .trim()

  const newTag = setClassNameInTag(originalTag, classes)
  return replaceTag(source, op.auraId, newTag)
}
