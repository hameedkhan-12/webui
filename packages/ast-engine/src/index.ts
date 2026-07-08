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
} from './ast.writer.js'

export * as AuraIdService from './aura-id.service.js'
export { generate, tag, strip, collect } from './aura-id.service.js'
