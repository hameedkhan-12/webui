// packages/ast-engine/src/ast.parser.ts
/**
 * ASTParser — read path.
 *
 * Operates on raw TSX source strings only. No filesystem I/O. No side effects.
 *
 * IMPORTANT: this is a REAL Babel-based parser (@babel/parser + @babel/traverse),
 * not a regex/string scanner. The previous implementation of this file matched
 * JSX tags with hand-written regex, which breaks on nested elements of the same
 * tag name, template literals, and anything beyond trivial markup. This version
 * is correct for arbitrary valid TSX because it actually parses the source into
 * an AST and walks it structurally.
 */

import { parse } from '@babel/parser'
import * as t from '@babel/types'
import type { NodePath } from '@babel/traverse'
import { traverse } from './babel-interop.js'

export interface ParsedNode {
  readonly auraId: string
  /** 1-indexed line number of the opening tag */
  readonly line: number
  /** Raw opening-tag text, exactly as written in the original source */
  readonly raw: string
}

const PARSE_PLUGINS = [
  'jsx',
  'typescript',
  ['decorators', { decoratorsBeforeExport: false }],
  'classProperties',
  'classPrivateProperties',
  'classPrivateMethods',
  'logicalAssignment',
  'asyncGenerators',
  'bigInt',
  'optionalChaining',
  'nullishCoalescingOperator',
] as const

/**
 * Parse TSX source into a Babel AST. Returns null (rather than throwing) on
 * invalid/unparseable source, so callers can treat "can't parse" the same way
 * they'd treat "node not found" -- fail soft, never crash the caller.
 */
export function parseSource(source: string) {
  try {
    return parse(source, {
      sourceType: 'module',
      plugins: PARSE_PLUGINS as unknown as Parameters<typeof parse>[1] extends { plugins: infer P } ? P : never,
    })
  } catch {
    return null
  }
}

export interface FoundElement {
  readonly path: NodePath<t.JSXOpeningElement>
  readonly ast: ReturnType<typeof parse>
}

/**
 * Find the JSXOpeningElement whose `data-id` attribute matches `auraId`.
 * Internal helper shared by every parser/writer function in this package --
 * this is the ONE place "how do we locate a node" is implemented.
 */
export function findOpeningElement(source: string, auraId: string): FoundElement | null {
  const ast = parseSource(source)
  if (!ast) return null

  let found: NodePath<t.JSXOpeningElement> | null = null

  traverse(ast, {
    JSXOpeningElement(path) {
      if (found) return
      const hasMatchingId = path.node.attributes.some(
        (attr): attr is t.JSXAttribute =>
          t.isJSXAttribute(attr) &&
          t.isJSXIdentifier(attr.name) &&
          attr.name.name === 'data-id' &&
          t.isStringLiteral(attr.value) &&
          attr.value.value === auraId
      )
      if (hasMatchingId) {
        found = path
      }
    },
  })

  return found ? { path: found, ast } : null
}

export function findNodeByAuraId(source: string, auraId: string): ParsedNode | null {
  const result = findOpeningElement(source, auraId)
  if (!result) return null

  const node = result.path.node
  const line = node.loc?.start.line ?? 0
  const raw =
    node.start != null && node.end != null ? source.slice(node.start, node.end) : ''

  return { auraId, line, raw }
}

/**
 * Extract all JSX props from the tag matching `auraId` as a key→value map.
 * - Bare boolean props (`disabled`) map to `true`.
 * - String literal props map to their string value.
 * - Numeric/boolean literal expression props ({42}, {true}) map to their real value.
 * - Anything more complex (function calls, ternaries, identifiers) is returned
 *   as its raw source text, since we can't reduce it to a plain JS value
 *   without evaluating code -- callers must treat these as read-only/opaque.
 */
export function extractProps(source: string, auraId: string): Record<string, unknown> {
  const result = findOpeningElement(source, auraId)
  if (!result) return {}

  const props: Record<string, unknown> = {}

  for (const attr of result.path.node.attributes) {
    if (!t.isJSXAttribute(attr) || !t.isJSXIdentifier(attr.name)) continue
    const key = attr.name.name
    if (key === 'data-id') continue

    if (attr.value == null) {
      props[key] = true
      continue
    }

    if (t.isStringLiteral(attr.value)) {
      props[key] = attr.value.value
      continue
    }

    if (t.isJSXExpressionContainer(attr.value)) {
      const expr = attr.value.expression
      if (t.isStringLiteral(expr)) {
        props[key] = expr.value
      } else if (t.isNumericLiteral(expr)) {
        props[key] = expr.value
      } else if (t.isBooleanLiteral(expr)) {
        props[key] = expr.value
      } else if (expr.start != null && expr.end != null) {
        // Opaque expression (call, ternary, identifier, template literal...) --
        // return the raw source text rather than guessing at a value.
        props[key] = source.slice(expr.start, expr.end)
      }
    }
  }

  return props
}

/**
 * Extract the Tailwind class list from `className` of the node matching `auraId`.
 * Returns an empty array if `className` is absent OR is a non-string-literal
 * expression (e.g. wrapped in cn()/clsx()) -- use extractClassNameInfo (in
 * ast.writer.ts) if you need to handle the cn()/clsx() case specifically.
 */
export function extractClasses(source: string, auraId: string): string[] {
  const props = extractProps(source, auraId)
  const className = props['className']
  if (typeof className !== 'string') return []
  return className.split(/\s+/).filter(Boolean)
}