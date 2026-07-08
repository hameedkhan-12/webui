/**
 * PersistenceService — orchestrates file mutations through adapters
 *
 * The PersistenceService sits between the editor/gateway and adapters.
 * It is responsible for:
 *   1. Validating operation shapes before delegation
 *   2. Delegating to the appropriate adapter method
 *   3. Emitting events after successful writes
 *   4. Providing a single async/await interface to callers
 *
 * All methods are async Promise-returning, making the service ready for
 * both sync (tests) and async (real I/O) scenarios via dependency injection.
 */

import type {
  IPersistenceAdapter,
  UpdatePropOperation,
  UpdateStyleOperation,
  UpdateChildrenOperation,
  AddClassOperation,
  RemoveClassOperation,
  BaseOperation,
} from '@repo/shared'

/**
 * Validates that an operation object has all required fields.
 * Throws if validation fails.
 */
function validateBaseOperation(op: BaseOperation): void {
  if (!op.file || typeof op.file !== 'string') {
    throw new Error(
      `PersistenceService: Operation missing required field 'file' (string). Got: ${JSON.stringify(op)}`
    )
  }
  if (typeof op.line !== 'number' || op.line < 0) {
    throw new Error(
      `PersistenceService: Operation missing required field 'line' (non-negative number). Got: ${JSON.stringify(op)}`
    )
  }
  if (!op.auraId || typeof op.auraId !== 'string') {
    throw new Error(
      `PersistenceService: Operation missing required field 'auraId' (string). Got: ${JSON.stringify(op)}`
    )
  }
}

function validateUpdatePropOperation(op: UpdatePropOperation): void {
  validateBaseOperation(op)
  if (!op.prop || typeof op.prop !== 'string') {
    throw new Error(
      `PersistenceService: UpdatePropOperation missing required field 'prop' (string). Got: ${JSON.stringify(op)}`
    )
  }
  if (op.value === undefined) {
    throw new Error(
      `PersistenceService: UpdatePropOperation missing required field 'value'. Got: ${JSON.stringify(op)}`
    )
  }
}

function validateUpdateStyleOperation(op: UpdateStyleOperation): void {
  validateBaseOperation(op)
  if (!op.oldClass || typeof op.oldClass !== 'string') {
    throw new Error(
      `PersistenceService: UpdateStyleOperation missing 'oldClass' (string). Got: ${JSON.stringify(op)}`
    )
  }
  if (!op.newClass || typeof op.newClass !== 'string') {
    throw new Error(
      `PersistenceService: UpdateStyleOperation missing 'newClass' (string). Got: ${JSON.stringify(op)}`
    )
  }
}

function validateUpdateChildrenOperation(op: UpdateChildrenOperation): void {
  validateBaseOperation(op)
  if (typeof op.value !== 'string') {
    throw new Error(
      `PersistenceService: UpdateChildrenOperation missing 'value' (string). Got: ${JSON.stringify(op)}`
    )
  }
}

function validateAddClassOperation(op: AddClassOperation): void {
  validateBaseOperation(op)
  if (!op.className || typeof op.className !== 'string') {
    throw new Error(
      `PersistenceService: AddClassOperation missing 'className' (string). Got: ${JSON.stringify(op)}`
    )
  }
}

function validateRemoveClassOperation(op: RemoveClassOperation): void {
  validateBaseOperation(op)
  if (!op.className || typeof op.className !== 'string') {
    throw new Error(
      `PersistenceService: RemoveClassOperation missing 'className' (string). Got: ${JSON.stringify(op)}`
    )
  }
}

/**
 * Event emitted after a successful write operation.
 * Consumers can subscribe to these events to react to changes (e.g., update preview, refresh UI).
 */
export interface PersistenceEvent {
  readonly type: 'PROP_UPDATED' | 'STYLE_UPDATED' | 'CHILDREN_UPDATED' | 'CLASS_ADDED' | 'CLASS_REMOVED'
  readonly file: string
  readonly auraId: string
  readonly timestamp: number
}

/**
 * Simple event emitter for persistence events.
 */
class PersistenceEventEmitter {
  private listeners = new Map<string, Set<(event: PersistenceEvent) => void>>()

  on(type: string, handler: (event: PersistenceEvent) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set())
    }
    this.listeners.get(type)!.add(handler)

    // Return unsubscribe function
    return () => {
      this.listeners.get(type)?.delete(handler)
    }
  }

  emit(event: PersistenceEvent): void {
    this.listeners.get(event.type)?.forEach(handler => {
      try {
        handler(event)
      } catch (err) {
        console.error(`PersistenceEventEmitter: Error in listener for ${event.type}:`, err)
      }
    })
  }
}

/**
 * PersistenceService — main orchestrator
 *
 * Coordinates file mutations through adapters.
 * All methods are async and validate before delegation.
 */
export class PersistenceService {
  private eventEmitter = new PersistenceEventEmitter()

  constructor(private adapter: IPersistenceAdapter) {
    if (!adapter) {
      throw new Error('PersistenceService: adapter is required')
    }
  }

  /**
   * Update a JSX prop value.
   * Validates the operation, delegates to adapter, emits event on success.
   */
  async updateProp(op: UpdatePropOperation): Promise<void> {
    validateUpdatePropOperation(op)
    await this.adapter.updateProp(op)
    this.eventEmitter.emit({
      type: 'PROP_UPDATED',
      file: op.file,
      auraId: op.auraId,
      timestamp: Date.now(),
    })
  }

  /**
   * Replace a Tailwind class with another.
   * Validates the operation, delegates to adapter, emits event on success.
   */
  async updateStyle(op: UpdateStyleOperation): Promise<void> {
    validateUpdateStyleOperation(op)
    await this.adapter.updateStyle(op)
    this.eventEmitter.emit({
      type: 'STYLE_UPDATED',
      file: op.file,
      auraId: op.auraId,
      timestamp: Date.now(),
    })
  }

  /**
   * Replace text content children of an element.
   * Validates the operation, delegates to adapter, emits event on success.
   */
  async updateChildren(op: UpdateChildrenOperation): Promise<void> {
    validateUpdateChildrenOperation(op)
    await this.adapter.updateChildren(op)
    this.eventEmitter.emit({
      type: 'CHILDREN_UPDATED',
      file: op.file,
      auraId: op.auraId,
      timestamp: Date.now(),
    })
  }

  /**
   * Append a class to the className attribute.
   * Validates the operation, delegates to adapter, emits event on success.
   */
  async addClass(op: AddClassOperation): Promise<void> {
    validateAddClassOperation(op)
    await this.adapter.addClass(op)
    this.eventEmitter.emit({
      type: 'CLASS_ADDED',
      file: op.file,
      auraId: op.auraId,
      timestamp: Date.now(),
    })
  }

  /**
   * Remove a class from the className attribute.
   * Validates the operation, delegates to adapter, emits event on success.
   */
  async removeClass(op: RemoveClassOperation): Promise<void> {
    validateRemoveClassOperation(op)
    await this.adapter.removeClass(op)
    this.eventEmitter.emit({
      type: 'CLASS_REMOVED',
      file: op.file,
      auraId: op.auraId,
      timestamp: Date.now(),
    })
  }

  /**
   * Subscribe to persistence events.
   * @param type Event type (e.g. 'PROP_UPDATED', 'STYLE_UPDATED')
   * @param handler Callback function
   * @returns Unsubscribe function
   */
  onEvent(type: string, handler: (event: PersistenceEvent) => void): () => void {
    return this.eventEmitter.on(type, handler)
  }
}
