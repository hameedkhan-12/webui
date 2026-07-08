/**
 * FileWriteQueue — per-file write serialization
 *
 * Each file path gets its own p-queue instance (concurrency: 1).
 * This ensures that concurrent write operations to the same file are serialized,
 * preventing race conditions and file corruption.
 *
 * Multiple files can be written concurrently — only writes to the same file are serialized.
 */

import PQueue from 'p-queue'

/**
 * Global registry of per-file write queues.
 * Maps: absolute file path → PQueue with concurrency = 1
 */
class FileWriteQueueRegistry {
  private queues = new Map<string, PQueue>()

  /**
   * Get or create a queue for the given file path.
   */
  private getOrCreateQueue(filePath: string): PQueue {
    if (!this.queues.has(filePath)) {
      // Concurrency = 1: only one write per file at a time
      this.queues.set(filePath, new PQueue({ concurrency: 1 }))
    }
    return this.queues.get(filePath)!
  }

  /**
   * Enqueue a task for a specific file path.
   * The task will execute serially with other tasks for the same file.
   *
   * @param filePath Absolute file path (key for serialization)
   * @param task The async operation to execute
   * @returns Promise that resolves when task completes
   */
  async enqueue(filePath: string, task: () => Promise<void>): Promise<void> {
    const queue = this.getOrCreateQueue(filePath)
    return queue.add(task)
  }

  /**
   * Clear all queues (for testing or shutdown).
   */
  clear(): void {
    this.queues.clear()
  }

  /**
   * Get the number of pending tasks for a file (for testing/debugging).
   */
  pendingCount(filePath: string): number {
    const queue = this.queues.get(filePath)
    return queue ? queue.pending : 0
  }
}

// Singleton instance
export const fileWriteQueue = new FileWriteQueueRegistry()
