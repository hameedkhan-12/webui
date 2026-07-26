// packages/ast-engine/src/index.ts
export {
  findNodeByAuraId,
  extractProps,
  extractClasses,
} from './ast.parser.js'
export type { ParsedNode } from './ast.parser.js'

export {
  updateProp,
  updateStyle,
  updateChildren,
  addClass,
  removeClass,
  setClasses,
  insertElement,
  insertSibling,
  insertIntoFileRoot,
  deleteElement,
  moveElement,
  AstMutationError,
} from './ast.writer.js'
export type { InsertElementOptions } from './ast.writer.js'

export { tagWithCounter } from './ast.tagger.js'
export type { TagResult } from './ast.tagger.js'

// NOTE: generate/tag/strip/collect below are the OLD regex-based, non-browser-safe
// implementations (tag() uses node:crypto, unusable from apps/web client code).
// Use tagWithCounter() from ast.tagger.js instead for tagging. strip/collect are
// still regex-based and not yet rewritten -- treat them as lower-confidence than
// everything else in this package until they get the same real-AST treatment.
export * as AuraIdService from './aura-id.service.js'
export { generate, tag, strip, collect } from './aura-id.service.js'