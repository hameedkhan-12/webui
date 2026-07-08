import type {
  BaseOperation,
  UpdatePropOperation,
  UpdateStyleOperation,
  UpdateChildrenOperation,
  AddClassOperation,
  RemoveClassOperation,
} from '@repo/shared'
import {
  findNodeByAuraId,
  extractProps,
  extractClasses,
  updateProp,
  updateStyle,
  updateChildren,
  addClass,
  removeClass,
} from '@aura/ast-engine'

function isUpdatePropOperation(op: unknown): op is UpdatePropOperation {
  return (
    typeof op === 'object' &&
    op !== null &&
    'prop' in op &&
    typeof (op as Record<string, unknown>).prop === 'string' &&
    Object.prototype.hasOwnProperty.call(op, 'value')
  )
}

function isUpdateStyleOperation(op: unknown): op is UpdateStyleOperation {
  return (
    typeof op === 'object' &&
    op !== null &&
    'oldClass' in op &&
    'newClass' in op &&
    typeof (op as Record<string, unknown>).oldClass === 'string' &&
    typeof (op as Record<string, unknown>).newClass === 'string'
  )
}

function isUpdateChildrenOperation(op: unknown): op is UpdateChildrenOperation {
  return (
    typeof op === 'object' &&
    op !== null &&
    Object.prototype.hasOwnProperty.call(op, 'value') &&
    typeof (op as Record<string, unknown>).value === 'string' &&
    !('prop' in (op as object))
  )
}

function isAddClassOperation(op: unknown): op is AddClassOperation {
  return (
    typeof op === 'object' &&
    op !== null &&
    'className' in op &&
    typeof (op as Record<string, unknown>).className === 'string' &&
    (op as Record<string, unknown>)['remove'] !== true
  )
}

function isRemoveClassOperation(op: unknown): op is RemoveClassOperation {
  return (
    typeof op === 'object' &&
    op !== null &&
    'className' in op &&
    typeof (op as Record<string, unknown>).className === 'string' &&
    (op as Record<string, unknown>)['remove'] === true
  )
}

/**
 * ASTService — editor-layer facade over ASTParser and ASTWriter.
 *
 * Delegates all source manipulation to the pure engine functions.
 * The service adds the operation-dispatch logic and the `readSelection` API
 * that the visual editor calls when a node is selected.
 */

export interface NodeSelection {
  readonly props: Record<string, unknown>
  readonly classes: string[]
  readonly line: number | null
}

export class ASTService {
  /**
   * Read all editable data for the selected node.
   * Returns null if the auraId is not found in the source.
   */
  readSelection(source: string, auraId: string): NodeSelection | null {
    const node = findNodeByAuraId(source, auraId)
    if (!node) return null

    return {
      props: extractProps(source, auraId),
      classes: extractClasses(source, auraId),
      line: node.line,
    }
  }

  /**
   * Dispatch a typed persistence operation to the correct ASTWriter function.
   * Returns the updated source string.
   *
   * The `kind` discriminant is determined by which optional fields are present,
   * matching the `IPersistenceAdapter` operation shapes from `@repo/shared`.
   */
  applyOp(
    source: string,
    op: BaseOperation & Record<string, unknown>
  ): string {
    if (isUpdatePropOperation(op)) {
      return updateProp(source, op)
    }
    if (isUpdateStyleOperation(op)) {
      return updateStyle(source, op)
    }
    if (isUpdateChildrenOperation(op)) {
      return updateChildren(source, op)
    }
    if (isRemoveClassOperation(op)) {
      return removeClass(source, op)
    }
    if (isAddClassOperation(op)) {
      return addClass(source, op)
    }
    // Unknown op — return source unchanged
    return source
  }
}
