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

      const existingDataId = node.attributes.find(
        (attr): attr is t.JSXAttribute =>
          t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name) && attr.name.name === 'data-id'
      )
      // A `data-id` attribute with a NON-literal value (e.g. an app-authored
      // `data-id={`card-glow-${i}`}`, unrelated to this tagging system) can
      // never be resolved by findOpeningElement anyway (it requires a plain
      // StringLiteral -- see ast.parser.ts), so treating it as "already
      // tagged" and skipping was silently leaving such elements permanently
      // unselectable/uneditable, with no error until someone actually tried
      // to click one (surfaces downstream as "could not find any file
      // containing data-id=...", since the runtime value never appears
      // literally in source). Only a STRING-LITERAL data-id genuinely means
      // "already tagged, respect it."
      const alreadyTagged =
        (existingDataId != null && t.isStringLiteral(existingDataId.value)) ||
        node.attributes.some(
          (attr) =>
            t.isJSXAttribute(attr) &&
            t.isJSXIdentifier(attr.name) &&
            attr.name.name === 'data-aura-id' &&
            t.isStringLiteral(attr.value)
        )
      if (alreadyTagged) return

      const id = `el-${counter++}`
      const insertAt = node.selfClosing ? node.end! - 2 : node.end! - 1
      // If there's a foreign, non-literal `data-id` already present, tag via
      // the separate `data-aura-id` attribute instead of `data-id` -- adding
      // a SECOND `data-id` would either be invalid or (since JSX attributes
      // behave like object properties -- last one wins) silently overwrite
      // the app's own dynamic value at runtime, breaking whatever the
      // generated app was using it for. `data-aura-id` never collides with
      // app-authored code because it's not a real HTML/React convention
      // anything would organically write.
      const attrName = existingDataId ? 'data-aura-id' : 'data-id'
      insertions.push({ at: insertAt, text: ` ${attrName}="${id}"` })
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