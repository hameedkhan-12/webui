import { describe, expect, it, beforeEach, vi } from 'vitest'
import type { UpdatePropOperation, UpdateStyleOperation } from '@repo/shared'
import { PersistenceService, type PersistenceEvent } from './persistence.service'
import {
  ASTPersistenceAdapter,
  InMemorySourceCache,
  type IFileWriter,
} from './adapters/ast.adapter'
import { CMSPersistenceAdapter } from './adapters/cms.adapter.stub'

// ─── Mock implementations ──────────────────────────────────────────────────

class MockFileWriter implements IFileWriter {
  private writes: Map<string, string> = new Map()

  async writeFile(filePath: string, content: string): Promise<void> {
    // Simulate I/O delay
    await new Promise(resolve => setTimeout(resolve, 0))
    this.writes.set(filePath, content)
  }

  getWrites(): Map<string, string> {
    return this.writes
  }

  clear(): void {
    this.writes.clear()
  }
}

class MockFileWriteQueue {
  async enqueue(filePath: string, task: () => Promise<void>): Promise<void> {
    return task()
  }
}

// ─── Test fixtures ────────────────────────────────────────────────────────

const EXAMPLE_SOURCE = `
import React from 'react'

export function Page() {
  return (
    <Button data-aura-id="btn-001" label="Click Me" className="bg-blue-500 text-white" />
  )
}
`

// ─── PersistenceService Tests ─────────────────────────────────────────────

describe('PersistenceService', () => {
  let service: PersistenceService
  let mockAdapter: any

  beforeEach(() => {
    mockAdapter = {
      name: 'test',
      updateProp: vi.fn().mockResolvedValue(undefined),
      updateStyle: vi.fn().mockResolvedValue(undefined),
      updateChildren: vi.fn().mockResolvedValue(undefined),
      addClass: vi.fn().mockResolvedValue(undefined),
      removeClass: vi.fn().mockResolvedValue(undefined),
    }
    service = new PersistenceService(mockAdapter)
  })

  describe('initialization', () => {
    it('throws if adapter is not provided', () => {
      expect(() => new PersistenceService(null as any)).toThrow('adapter is required')
    })
  })

  describe('updateProp', () => {
    it('validates and delegates to adapter', async () => {
      const op: UpdatePropOperation = {
        file: 'page.tsx',
        line: 5,
        auraId: 'btn-001',
        prop: 'label',
        value: 'Updated',
      }

      await service.updateProp(op)

      expect(mockAdapter.updateProp).toHaveBeenCalledWith(op)
    })

    it('throws if operation lacks required field: file', async () => {
      const op = {
        line: 5,
        auraId: 'btn-001',
        prop: 'label',
        value: 'Updated',
      } as any

      await expect(service.updateProp(op)).rejects.toThrow(/missing required field 'file'/)
    })

    it('throws if operation lacks required field: line', async () => {
      const op = {
        file: 'page.tsx',
        auraId: 'btn-001',
        prop: 'label',
        value: 'Updated',
      } as any

      await expect(service.updateProp(op)).rejects.toThrow(/missing required field 'line'/)
    })

    it('throws if operation lacks required field: auraId', async () => {
      const op = {
        file: 'page.tsx',
        line: 5,
        prop: 'label',
        value: 'Updated',
      } as any

      await expect(service.updateProp(op)).rejects.toThrow(/missing required field 'auraId'/)
    })

    it('throws if operation lacks required field: prop', async () => {
      const op = {
        file: 'page.tsx',
        line: 5,
        auraId: 'btn-001',
        value: 'Updated',
      } as any

      await expect(service.updateProp(op)).rejects.toThrow(/missing required field 'prop'/)
    })

    it('throws if operation lacks required field: value', async () => {
      const op = {
        file: 'page.tsx',
        line: 5,
        auraId: 'btn-001',
        prop: 'label',
      } as any

      await expect(service.updateProp(op)).rejects.toThrow(/missing required field 'value'/)
    })

    it('emits PROP_UPDATED event on success', async () => {
      const op: UpdatePropOperation = {
        file: 'page.tsx',
        line: 5,
        auraId: 'btn-001',
        prop: 'label',
        value: 'Updated',
      }

      const events: PersistenceEvent[] = []
      service.onEvent('PROP_UPDATED', event => events.push(event))

      await service.updateProp(op)

      expect(events).toHaveLength(1)
      expect(events[0]?.type).toBe('PROP_UPDATED')
      expect(events[0]?.file).toBe('page.tsx')
      expect(events[0]?.auraId).toBe('btn-001')
    })
  })

  describe('updateStyle', () => {
    it('validates and delegates to adapter', async () => {
      const op: UpdateStyleOperation = {
        file: 'page.tsx',
        line: 5,
        auraId: 'btn-001',
        oldClass: 'bg-blue-500',
        newClass: 'bg-red-500',
      }

      await service.updateStyle(op)

      expect(mockAdapter.updateStyle).toHaveBeenCalledWith(op)
    })

    it('throws if oldClass is missing', async () => {
      const op = {
        file: 'page.tsx',
        line: 5,
        auraId: 'btn-001',
        newClass: 'bg-red-500',
      } as any

      await expect(service.updateStyle(op)).rejects.toThrow(/missing 'oldClass'/)
    })

    it('throws if newClass is missing', async () => {
      const op = {
        file: 'page.tsx',
        line: 5,
        auraId: 'btn-001',
        oldClass: 'bg-blue-500',
      } as any

      await expect(service.updateStyle(op)).rejects.toThrow(/missing 'newClass'/)
    })

    it('emits STYLE_UPDATED event on success', async () => {
      const op: UpdateStyleOperation = {
        file: 'page.tsx',
        line: 5,
        auraId: 'btn-001',
        oldClass: 'bg-blue-500',
        newClass: 'bg-red-500',
      }

      const events: PersistenceEvent[] = []
      service.onEvent('STYLE_UPDATED', event => events.push(event))

      await service.updateStyle(op)

      expect(events).toHaveLength(1)
      expect(events[0]?.type).toBe('STYLE_UPDATED')
    })
  })

  describe('updateChildren', () => {
    it('validates and delegates', async () => {
      const op = {
        file: 'page.tsx',
        line: 5,
        auraId: 'btn-001',
        value: 'New content',
      }

      await service.updateChildren(op)

      expect(mockAdapter.updateChildren).toHaveBeenCalledWith(op)
    })

    it('throws if value is missing', async () => {
      const op = {
        file: 'page.tsx',
        line: 5,
        auraId: 'btn-001',
      } as any

      await expect(service.updateChildren(op)).rejects.toThrow(/missing 'value'/)
    })

    it('emits CHILDREN_UPDATED event', async () => {
      const op = {
        file: 'page.tsx',
        line: 5,
        auraId: 'btn-001',
        value: 'New content',
      }

      const events: PersistenceEvent[] = []
      service.onEvent('CHILDREN_UPDATED', event => events.push(event))

      await service.updateChildren(op)

      expect(events).toHaveLength(1)
      expect(events[0]?.type).toBe('CHILDREN_UPDATED')
    })
  })

  describe('addClass/removeClass', () => {
    it('addClass validates and emits CLASS_ADDED', async () => {
      const op = {
        file: 'page.tsx',
        line: 5,
        auraId: 'btn-001',
        className: 'rounded-lg',
      }

      const events: PersistenceEvent[] = []
      service.onEvent('CLASS_ADDED', event => events.push(event))

      await service.addClass(op)

      expect(mockAdapter.addClass).toHaveBeenCalledWith(op)
      expect(events[0]?.type).toBe('CLASS_ADDED')
    })

    it('removeClass validates and emits CLASS_REMOVED', async () => {
      const op = {
        file: 'page.tsx',
        line: 5,
        auraId: 'btn-001',
        className: 'text-white',
      }

      const events: PersistenceEvent[] = []
      service.onEvent('CLASS_REMOVED', event => events.push(event))

      await service.removeClass(op)

      expect(mockAdapter.removeClass).toHaveBeenCalledWith(op)
      expect(events[0]?.type).toBe('CLASS_REMOVED')
    })
  })

  describe('event subscriptions', () => {
    it('onEvent returns unsubscribe function', async () => {
      const handler = vi.fn()
      const unsubscribe = service.onEvent('PROP_UPDATED', handler)

      const op: UpdatePropOperation = {
        file: 'page.tsx',
        line: 5,
        auraId: 'btn-001',
        prop: 'label',
        value: 'Test',
      }

      await service.updateProp(op)
      expect(handler).toHaveBeenCalledTimes(1)

      unsubscribe()

      await service.updateProp(op)
      expect(handler).toHaveBeenCalledTimes(1) // still 1, not called again
    })

    it('multiple subscriptions work independently', async () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      service.onEvent('PROP_UPDATED', handler1)
      service.onEvent('PROP_UPDATED', handler2)

      const op: UpdatePropOperation = {
        file: 'page.tsx',
        line: 5,
        auraId: 'btn-001',
        prop: 'label',
        value: 'Test',
      }

      await service.updateProp(op)

      expect(handler1).toHaveBeenCalledTimes(1)
      expect(handler2).toHaveBeenCalledTimes(1)
    })
  })
})

// ─── ASTPersistenceAdapter Tests ──────────────────────────────────────────

describe('ASTPersistenceAdapter', () => {
  let adapter: ASTPersistenceAdapter
  let sourceCache: InMemorySourceCache
  let fileWriter: MockFileWriter
  let fileWriteQueue: MockFileWriteQueue

  beforeEach(() => {
    sourceCache = new InMemorySourceCache()
    fileWriter = new MockFileWriter()
    fileWriteQueue = new MockFileWriteQueue()
    adapter = new ASTPersistenceAdapter(sourceCache, fileWriter, fileWriteQueue)
    sourceCache.set('page.tsx', EXAMPLE_SOURCE)
  })

  describe('initialization', () => {
    it('throws if any dependency is missing', () => {
      expect(() => new ASTPersistenceAdapter(null as any, fileWriter, fileWriteQueue)).toThrow(
        'required'
      )
      expect(() => new ASTPersistenceAdapter(sourceCache, null as any, fileWriteQueue)).toThrow(
        'required'
      )
      expect(() => new ASTPersistenceAdapter(sourceCache, fileWriter, null as any)).toThrow(
        'required'
      )
    })

    it('has correct name property', () => {
      expect(adapter.name).toBe('ast')
    })
  })

  describe('updateProp', () => {
    it('applies AST transformation and writes to file', async () => {
      const op: UpdatePropOperation = {
        file: 'page.tsx',
        line: 5,
        auraId: 'btn-001',
        prop: 'label',
        value: 'Updated Label',
      }

      await adapter.updateProp(op)

      const writes = fileWriter.getWrites()
      expect(writes.has('page.tsx')).toBe(true)
      const updated = writes.get('page.tsx')!
      expect(updated).toContain('label="Updated Label"')
      expect(updated).not.toContain('label="Click Me"')
    })

    it('updates source cache after successful write', async () => {
      const op: UpdatePropOperation = {
        file: 'page.tsx',
        line: 5,
        auraId: 'btn-001',
        prop: 'label',
        value: 'Updated Label',
      }

      await adapter.updateProp(op)

      const cached = adapter.getCachedSource('page.tsx')!
      expect(cached).toContain('label="Updated Label"')
    })

    it('throws if file not in cache', async () => {
      const op: UpdatePropOperation = {
        file: 'missing.tsx',
        line: 5,
        auraId: 'btn-001',
        prop: 'label',
        value: 'Test',
      }

      await expect(adapter.updateProp(op)).rejects.toThrow(/not in cache/)
    })

    it('throws if element not found (no transformation)', async () => {
      const op: UpdatePropOperation = {
        file: 'page.tsx',
        line: 5,
        auraId: 'does-not-exist',
        prop: 'label',
        value: 'Test',
      }

      await expect(adapter.updateProp(op)).rejects.toThrow(/did not modify source/)
    })
  })

  describe('updateStyle', () => {
    it('replaces Tailwind class and writes file', async () => {
      const op = {
        file: 'page.tsx',
        line: 5,
        auraId: 'btn-001',
        oldClass: 'bg-blue-500',
        newClass: 'bg-red-500',
      }

      await adapter.updateStyle(op)

      const updated = fileWriter.getWrites().get('page.tsx')!
      expect(updated).toContain('bg-red-500')
      expect(updated).not.toContain('bg-blue-500')
    })
  })

  describe('addClass', () => {
    it('appends class to className', async () => {
      const op = {
        file: 'page.tsx',
        line: 5,
        auraId: 'btn-001',
        className: 'hover:bg-blue-600',
      }

      await adapter.addClass(op)

      const updated = fileWriter.getWrites().get('page.tsx')!
      expect(updated).toContain('hover:bg-blue-600')
      expect(updated).toContain('bg-blue-500') // original preserved
    })
  })

  describe('removeClass', () => {
    it('removes specific class from className', async () => {
      const op = {
        file: 'page.tsx',
        line: 5,
        auraId: 'btn-001',
        className: 'text-white',
      }

      await adapter.removeClass(op)

      const updated = fileWriter.getWrites().get('page.tsx')!
      expect(updated).not.toContain('text-white')
      expect(updated).toContain('bg-blue-500') // others preserved
    })
  })

  describe('file operations', () => {
    it('loadSourceFile adds file to cache', () => {
      adapter.loadSourceFile('new.tsx', 'const x = 1')
      expect(adapter.getCachedSource('new.tsx')).toBe('const x = 1')
    })

    it('getCachedSource returns undefined for missing file', () => {
      expect(adapter.getCachedSource('missing.tsx')).toBeUndefined()
    })
  })
})

// ─── CMSPersistenceAdapter Stub Tests ──────────────────────────────────────

describe('CMSPersistenceAdapter', () => {
  let adapter: CMSPersistenceAdapter

  beforeEach(() => {
    adapter = new CMSPersistenceAdapter()
  })

  it('has correct name property', () => {
    expect(adapter.name).toBe('cms')
  })

  it('throws NotImplementedError on updateProp', async () => {
    const op: UpdatePropOperation = {
      file: 'page.tsx',
      line: 5,
      auraId: 'btn-001',
      prop: 'label',
      value: 'Test',
    }

    await expect(adapter.updateProp(op)).rejects.toThrow(/not implemented in Phase 1/)
  })

  it('throws NotImplementedError on updateStyle', async () => {
    const op = {
      file: 'page.tsx',
      line: 5,
      auraId: 'btn-001',
      oldClass: 'old',
      newClass: 'new',
    }

    await expect(adapter.updateStyle(op)).rejects.toThrow(/not implemented in Phase 1/)
  })

  it('throws NotImplementedError on updateChildren', async () => {
    await expect(
      adapter.updateChildren({
        file: 'page.tsx',
        line: 5,
        auraId: 'btn-001',
        value: 'test',
      })
    ).rejects.toThrow(/not implemented in Phase 1/)
  })

  it('throws NotImplementedError on addClass', async () => {
    await expect(
      adapter.addClass({
        file: 'page.tsx',
        line: 5,
        auraId: 'btn-001',
        className: 'test',
      })
    ).rejects.toThrow(/not implemented in Phase 1/)
  })

  it('throws NotImplementedError on removeClass', async () => {
    await expect(
      adapter.removeClass({
        file: 'page.tsx',
        line: 5,
        auraId: 'btn-001',
        className: 'test',
      })
    ).rejects.toThrow(/not implemented in Phase 1/)
  })
})
