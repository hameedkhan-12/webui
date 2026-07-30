// packages/ast-engine/src/ast.tagger.ts
/**
 * ASTTagger — assigns stable `data-id` attributes to untagged JSX elements.
 *
 * Replaces TWO previous implementations that both had real problems:
 * - apps/web/src/lib/jsxUtils.ts's tagJSXCode: regex-based (same nesting-depth
 *   blindness as everything else in that file).
 * - packages/ast-engine/src/aura-id.service.ts's tag(): used Node's
 *   `crypto.randomUUID()`, which does not exist in browser bundle code --
 *   this file is imported by apps/web/src/lib/operationReducer.ts, which runs
 *   client-side. That function would have broken the browser build the
 *   moment anything actually called it.
 *
 * This version is real Babel, browser-safe (no node: imports), and preserves
 * the counter-based `el-N` id scheme + `{code, newCounter}` contract that
 * apps/web's reducer state (`elementCounter`) already depends on.
 */

import * as t from '@babel/types'
import { traverse } from './babel-interop.js'
import { parseSource } from './ast.parser.js'

export interface TagResult {
  readonly code: string
  readonly newCounter: number
}

/**
 * Assign `data-id="el-N"` to every JSX element in `source` that doesn't
 * already have a `data-id`, starting from `startCounter`. Lowercase
 * intrinsic HTML tags (div, span, p...) are tagged too by default, matching
 * jsxUtils.ts's previous behavior for AI-generated/inserted snippets --
 * pass `includeIntrinsic: false` to only tag capitalized component tags.
 */
export function tagWithCounter(
  source: string,
  startCounter: number,
  includeIntrinsic = true
): TagResult {
  const ast = parseSource(source)
  if (!ast) return { code: source, newCounter: startCounter }

  let counter = startCounter
  // Collect (position, id) pairs during traversal, then apply them to the
  // source string in a single right-to-left splice pass -- mutating the
  // string while traversing would invalidate every subsequent node's
  // start/end offsets.
  const insertions: Array<{ at: number; text: string }> = []

  traverse(ast, {
    JSXOpeningElement(path) {
      const node = path.node
      const nameNode = node.name
      const tagName = t.isJSXIdentifier(nameNode) ? nameNode.name : null
      if (!tagName) return

      const isIntrinsic = tagName[0] === tagName[0]!.toLowerCase()
      if (isIntrinsic && !includeIntrinsic) return

      const alreadyTagged = node.attributes.some(
        (attr) => t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name) && attr.name.name === 'data-id'
      )
      if (alreadyTagged) return

      const id = `el-${counter++}`
      const insertAt = node.selfClosing ? node.end! - 2 : node.end! - 1
      insertions.push({ at: insertAt, text: ` data-id="${id}"` })
    },
  })

  // Apply right-to-left so earlier insertions don't shift later offsets.
  insertions.sort((a, b) => b.at - a.at)
  let result = source
  for (const { at, text } of insertions) {
    result = result.slice(0, at) + text + result.slice(at)
  }

  return { code: result, newCounter: counter }
}