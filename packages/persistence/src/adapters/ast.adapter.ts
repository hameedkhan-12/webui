/**
 * ASTPersistenceAdapter — Phase 1 adapter
 *
 * This adapter is the bridge between the persistence layer and the AST engine.
 * It implements IPersistenceAdapter by delegating all operations to:
 *   - AST engine functions from @aura/ast-engine (read/write on source strings)
 *   - FileWriteQueue (for serialization of concurrent writes to same file)
 *
 * The adapter does NOT directly call ts-morph or manipulate files.
 * It is NOT responsible for reading files from disk — that's handled externally
 * during initialization and via file watcher triggers.
 *
 * All operations are sync (source string transformation) or async (queue dispatch).
 */

import type {
  IPersistenceAdapter,
  UpdatePropOperation,
  UpdateStyleOperation,
  UpdateChildrenOperation,
  AddClassOperation,
  RemoveClassOperation,
} from '@repo/shared'
import {
  updateProp,
  updateStyle,
  updateChildren,
  addClass,
  removeClass,
} from '@aura/ast-engine'

/**
 * Maps file path → cached source code.
 * This is populated externally (e.g., from file watchers or on-demand loading).
 * The adapter reads from this cache; it does not read from disk.
 */
interface SourceCache {
  get(filePath: string): string | undefined
  set(filePath: string, source: string): void
  has(filePath: string): boolean
}

/**
 * Simple in-memory source cache implementation.
 */
class InMemorySourceCache implements SourceCache {
  private cache = new Map<string, string>()

  get(filePath: string): string | undefined {
    return this.cache.get(filePath)
  }

  set(filePath: string, source: string): void {
    this.cache.set(filePath, source)
  }

  has(filePath: string): boolean {
    return this.cache.has(filePath)
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }
}

/**
 * FileWriter interface — abstraction for I/O
 *
 * Allows the adapter to be testable without actually writing to disk.
 */
export interface IFileWriter {
  writeFile(filePath: string, content: string): Promise<void>
}

/**
 * ASTPersistenceAdapter — implements IPersistenceAdapter
 *
 * All methods are async and delegate to AST engine functions + FileWriteQueue.
 * The adapter does NOT perform file I/O directly — it delegates via IFileWriter.
 */
export class ASTPersistenceAdapter implements IPersistenceAdapter {
  readonly name = 'ast'

  constructor(
    private sourceCache: SourceCache,
    private fileWriter: IFileWriter,
    private fileWriteQueue: {
      enqueue(filePath: string, task: () => Promise<void>): Promise<void>
    }
  ) {
    if (!sourceCache || !fileWriter || !fileWriteQueue) {
      throw new Error('ASTPersistenceAdapter: sourceCache, fileWriter, and fileWriteQueue are required')
    }
  }

  private async applyAndWrite(
    op: UpdatePropOperation | UpdateStyleOperation | UpdateChildrenOperation | AddClassOperation | RemoveClassOperation,
    operationType: 'updateProp' | 'updateStyle' | 'updateChildren' | 'addClass' | 'removeClass'
  ): Promise<void> {
    const source = this.sourceCache.get(op.file)
    if (!source) {
      throw new Error(`ASTPersistenceAdapter: File not in cache: ${op.file}. Load file first.`)
    }

    // Apply transformation (pure function, returns new source string)
    let updated: string

    switch (operationType) {
      case 'updateProp':
        updated = updateProp(source, op as UpdatePropOperation)
        break
      case 'updateStyle':
        updated = updateStyle(source, op as UpdateStyleOperation)
        break
      case 'updateChildren':
        updated = updateChildren(source, op as UpdateChildrenOperation)
        break
      case 'addClass':
        updated = addClass(source, op as AddClassOperation)
        break
      case 'removeClass':
        updated = removeClass(source, op as RemoveClassOperation)
        break
      default:
        throw new Error(`ASTPersistenceAdapter: Unknown operation type: ${operationType}`)
    }

    if (updated === source) {
      throw new Error(
        `ASTPersistenceAdapter: Operation did not modify source (element not found?). auraId=${op.auraId}, file=${op.file}`
      )
    }

    // Enqueue for serialized write
    await this.fileWriteQueue.enqueue(op.file, async () => {
      await this.fileWriter.writeFile(op.file, updated)
      // Update cache after successful write
      this.sourceCache.set(op.file, updated)
    })
  }

  async updateProp(op: UpdatePropOperation): Promise<void> {
    return this.applyAndWrite(op, 'updateProp')
  }

  async updateStyle(op: UpdateStyleOperation): Promise<void> {
    return this.applyAndWrite(op, 'updateStyle')
  }

  async updateChildren(op: UpdateChildrenOperation): Promise<void> {
    return this.applyAndWrite(op, 'updateChildren')
  }

  async addClass(op: AddClassOperation): Promise<void> {
    return this.applyAndWrite(op, 'addClass')
  }

  async removeClass(op: RemoveClassOperation): Promise<void> {
    return this.applyAndWrite(op, 'removeClass')
  }

  /**
   * Load a file into the source cache (must be called before operations on that file).
   * This is typically called during gateway startup or when opening a project.
   */
  loadSourceFile(filePath: string, source: string): void {
    this.sourceCache.set(filePath, source)
  }

  /**
   * For testing: get current cached source for a file.
   */
  getCachedSource(filePath: string): string | undefined {
    return this.sourceCache.get(filePath)
  }
}

export { InMemorySourceCache }
