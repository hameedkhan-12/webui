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
          (attr.name.name === 'data-id' || attr.name.name === 'data-aura-id') &&
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
    if (key === 'data-id' || key === 'data-aura-id') continue

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

export interface RepeatContext {
  /** True if this JSX node is written once in source but rendered N times at runtime. */
  readonly isRepeated: boolean
  /** Name of the array/iterable being mapped, if statically determinable (e.g. "products"). */
  readonly iterableName: string | null
  /** The map callback's first (item) parameter name, e.g. "f" in `products.map(f => ...)`. */
  readonly paramName: string | null
}

/**
 * Detect whether the element matching `auraId` sits inside a `.map()` /
 * `.flatMap()` callback -- i.e. its `data-id` is a single AST location that
 * fans out to multiple DOM nodes at runtime (one per array item).
 *
 * This matters because every write in ast.writer.ts locates nodes by auraId
 * and mutates ONE AST location. For a repeated node that's the CORRECT
 * behavior for template-level edits (e.g. "make every card's border
 * rounder"), but it means there is no way to edit a single instance's text
 * through this id -- the text is almost always bound to `item.someField`,
 * not a static string, and even a static literal is shared by every
 * instance. Callers (the inspector UI) should surface this distinction to
 * the user instead of silently applying an edit that looks like it only
 * targeted the clicked card.
 */
export function getRepeatContext(source: string, auraId: string): RepeatContext {
  const result = findOpeningElement(source, auraId)
  if (!result) return { isRepeated: false, iterableName: null, paramName: null }

  const mapCall = result.path.findParent((p) => {
    if (!p.isCallExpression()) return false
    const callee = p.node.callee
    return (
      t.isMemberExpression(callee) &&
      t.isIdentifier(callee.property) &&
      (callee.property.name === 'map' || callee.property.name === 'flatMap')
    )
  })

  if (!mapCall) return { isRepeated: false, iterableName: null, paramName: null }

  const callExpr = mapCall.node as t.CallExpression
  const callee = callExpr.callee as t.MemberExpression
  const iterableName = t.isIdentifier(callee.object) ? callee.object.name : null

  const callback = callExpr.arguments[0]
  let paramName: string | null = null
  if (
    callback &&
    (t.isArrowFunctionExpression(callback) || t.isFunctionExpression(callback))
  ) {
    const firstParam = callback.params[0]
    if (firstParam && t.isIdentifier(firstParam)) paramName = firstParam.name
  }

  return { isRepeated: true, iterableName, paramName }
}

/**
 * Given a node that's inside a `.map()` (per getRepeatContext) and the map
 * callback's item parameter name, determine which single field of the item
 * this SPECIFIC node's text renders -- e.g. for `<h3 data-id="el-9">{f.title}</h3>`
 * with paramName "f", returns "title".
 *
 * Deliberately narrow: only matches a node whose sole meaningful child is
 * `{<paramName>.<field>}` with no other content, no computed access
 * (`f[key]`), no chained/nested access (`f.meta.title`), and no surrounding
 * template/expression. Anything looser risks guessing wrong about which
 * field a click-to-edit action should touch -- returning null here (falling
 * back to "not individually editable") is always safer than a wrong guess.
 */
export function getBoundField(
  source: string,
  auraId: string,
  paramName: string,
): string | null {
  const result = findOpeningElement(source, auraId)
  if (!result) return null

  const parent = result.path.parentPath
  if (!parent || !t.isJSXElement(parent.node)) return null

  const meaningfulChildren = parent.node.children.filter(
    (c) => !(t.isJSXText(c) && c.value.trim() === ''),
  )
  if (meaningfulChildren.length !== 1) return null

  const child = meaningfulChildren[0]
  if (!t.isJSXExpressionContainer(child)) return null

  const expr = child.expression
  if (
    t.isMemberExpression(expr) &&
    !expr.computed &&
    t.isIdentifier(expr.object) &&
    expr.object.name === paramName &&
    t.isIdentifier(expr.property)
  ) {
    return expr.property.name
  }

  return null
}

export type StaticArrayFieldValue = string | number | boolean

export interface StaticArrayItem {
  readonly index: number
  /** field name -> value, only for fields whose value is a plain string/number/boolean literal */
  readonly fields: Readonly<Record<string, StaticArrayFieldValue>>
}

export interface StaticArrayInfo {
  /** True only if EVERY element of the array is an object literal (so every index is safely addressable). */
  readonly editable: boolean
  readonly itemCount: number
  readonly items: readonly StaticArrayItem[]
}

/**
 * Locate `const/let/var <iterableName> = [ ... ]` in `source` and, if every
 * element is an object-literal expression, extract each item's plain-literal
 * fields. Returns null if no such declaration exists in this file at all
 * (e.g. the array is a prop, an import, fetched data, or declared in a
 * different file) -- that's the common case that means per-item editing
 * isn't possible through static source rewriting, and callers should fall
 * back to explaining that instead of guessing.
 */
export function getStaticArrayInfo(
  source: string,
  iterableName: string,
): StaticArrayInfo | null {
  const ast = parseSource(source)
  if (!ast) return null

  let arrayNode: t.ArrayExpression | null = null
  traverse(ast, {
    VariableDeclarator(path) {
      if (arrayNode) return
      if (
        t.isIdentifier(path.node.id) &&
        path.node.id.name === iterableName &&
        path.node.init &&
        t.isArrayExpression(path.node.init)
      ) {
        arrayNode = path.node.init
      }
    },
  })

  if (!arrayNode) return null
  const elements = (arrayNode as t.ArrayExpression).elements

  let editable = true
  const items: StaticArrayItem[] = elements.map((el, index) => {
    if (!el || !t.isObjectExpression(el)) {
      editable = false
      return { index, fields: {} }
    }
    const fields: Record<string, StaticArrayFieldValue> = {}
    for (const prop of el.properties) {
      if (!t.isObjectProperty(prop)) continue
      const key = t.isIdentifier(prop.key)
        ? prop.key.name
        : t.isStringLiteral(prop.key)
          ? prop.key.value
          : null
      if (key == null) continue

      const value = prop.value
      if (t.isStringLiteral(value)) fields[key] = value.value
      else if (t.isNumericLiteral(value)) fields[key] = value.value
      else if (t.isBooleanLiteral(value)) fields[key] = value.value
      // Non-literal field values (nested objects, expressions, JSX) are
      // simply omitted -- they don't block other fields on the same item
      // from being editable.
    }
    return { index, fields }
  })

  return { editable, itemCount: elements.length, items }
}