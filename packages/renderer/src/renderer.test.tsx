import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { groupChildrenBySlot, findNodeById, type ContentNode } from './content-node.js'
import { createContentTreeStore, useContentTree } from './content-tree-store.js'
import type { AuraRuntime } from '@aura/blocks'
import type { ComponentSchema } from '@repo/shared'

// ─── content-node helpers ────────────────────────────────────────────────────

describe('groupChildrenBySlot', () => {
  it('returns an empty map when called with undefined', () => {
    const result = groupChildrenBySlot(undefined)
    expect(result.size).toBe(0)
  })

  it('groups nodes by slot, defaulting to "children"', () => {
    const nodes: ContentNode[] = [
      { id: 'a', type: 'Card', props: {}, slot: 'header' },
      { id: 'b', type: 'Card', props: {}, slot: 'header' },
      { id: 'c', type: 'Card', props: {} }, // no slot → 'children'
    ]
    const result = groupChildrenBySlot(nodes)
    expect(result.get('header')).toHaveLength(2)
    expect(result.get('children')).toHaveLength(1)
    expect(result.get('children')![0]!.id).toBe('c')
  })
})

describe('findNodeById', () => {
  const tree: ContentNode[] = [
    {
      id: 'root',
      type: 'Nav',
      props: {},
      children: [
        {
          id: 'child-1',
          type: 'Hero',
          props: {},
          children: [{ id: 'grandchild', type: 'Button', props: {} }],
        },
        { id: 'child-2', type: 'Footer', props: {} },
      ],
    },
  ]

  it('finds a root node by id', () => {
    expect(findNodeById(tree, 'root')?.type).toBe('Nav')
  })

  it('finds a nested node by id (depth-first)', () => {
    expect(findNodeById(tree, 'grandchild')?.type).toBe('Button')
  })

  it('returns undefined for a missing id', () => {
    expect(findNodeById(tree, 'nonexistent')).toBeUndefined()
  })
})

// ─── createContentTreeStore ───────────────────────────────────────────────────

function makeRuntime(schema: ComponentSchema | undefined): AuraRuntime {
  return {
    kernel: {} as AuraRuntime['kernel'],
    components: { get: vi.fn() } as unknown as AuraRuntime['components'],
    schemas: {
      get: vi.fn(() => schema),
    } as unknown as AuraRuntime['schemas'],
    getComponent: vi.fn(),
  }
}

const TEXT_SCHEMA: ComponentSchema = {
  key: 'TextBlock',
  fields: [
    { key: 'text', type: 'text', label: 'Text', required: false },
  ],
}

describe('createContentTreeStore', () => {
  const initial: ContentNode[] = [
    { id: 'n1', type: 'TextBlock', props: { text: 'Hello' } },
    { id: 'n2', type: 'TextBlock', props: { text: 'World' } },
  ]

  it('getSnapshot returns the initial nodes', () => {
    const store = createContentTreeStore(initial, makeRuntime(TEXT_SCHEMA))
    expect(store.getSnapshot()).toEqual(initial)
  })

  it('notifies subscribers when a valid prop is updated', () => {
    const store = createContentTreeStore(initial, makeRuntime(TEXT_SCHEMA))
    const listener = vi.fn()
    store.subscribe(listener)
    const errors = store.updateProp('n1', 'text', 'Updated')
    expect(errors).toHaveLength(0)
    expect(listener).toHaveBeenCalledOnce()
    expect(store.getSnapshot()[0]?.props['text']).toBe('Updated')
  })

  it('returns an error (and does NOT notify) when nodeId is not found', () => {
    const store = createContentTreeStore(initial, makeRuntime(TEXT_SCHEMA))
    const listener = vi.fn()
    store.subscribe(listener)
    const errors = store.updateProp('missing', 'text', 'x')
    expect(errors.length).toBeGreaterThan(0)
    expect(listener).not.toHaveBeenCalled()
  })

  it('returns an error when propKey is not in the schema', () => {
    const store = createContentTreeStore(initial, makeRuntime(TEXT_SCHEMA))
    const errors = store.updateProp('n1', 'nonexistent', 'x')
    expect(errors.length).toBeGreaterThan(0)
    // tree is unchanged
    expect(store.getSnapshot()[0]?.props['text']).toBe('Hello')
  })

  it('unsubscribes correctly', () => {
    const store = createContentTreeStore(initial, makeRuntime(TEXT_SCHEMA))
    const listener = vi.fn()
    const unsub = store.subscribe(listener)
    unsub()
    store.updateProp('n1', 'text', 'After unsub')
    expect(listener).not.toHaveBeenCalled()
  })

  it('immutably updates only the targeted node, not siblings', () => {
    const store = createContentTreeStore(initial, makeRuntime(TEXT_SCHEMA))
    const snapshotBefore = store.getSnapshot()
    store.updateProp('n1', 'text', 'Changed')
    const snapshotAfter = store.getSnapshot()
    // n2 is the same object reference (structural sharing)
    expect(snapshotAfter[1]).toBe(snapshotBefore[1])
    // n1 is a new object
    expect(snapshotAfter[0]).not.toBe(snapshotBefore[0])
  })

  it('returns validation errors and does not update when a required field is cleared', () => {
    const requiredSchema: ComponentSchema = {
      key: 'TextBlock',
      fields: [
        { key: 'text', type: 'text', label: 'Text', required: true }
      ]
    }
    const store = createContentTreeStore(initial, makeRuntime(requiredSchema))
    const errors = store.updateProp('n1', 'text', '')
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]?.message).toContain('required')
    expect(store.getSnapshot()[0]?.props['text']).toBe('Hello') // Unchanged
  })

  it('returns validation errors and does not update when a number violates min/max limits', () => {
    const numberSchema: ComponentSchema = {
      key: 'TextBlock',
      fields: [
        {
          key: 'count',
          type: 'number',
          label: 'Count',
          required: false,
          validation: { min: 1, max: 10 }
        }
      ]
    }
    const initialWithNum: ContentNode[] = [
      { id: 'n1', type: 'TextBlock', props: { count: 5 } }
    ]
    const store = createContentTreeStore(initialWithNum, makeRuntime(numberSchema))
    
    // Test min violation
    const errorsMin = store.updateProp('n1', 'count', 0)
    expect(errorsMin.length).toBeGreaterThan(0)
    expect(store.getSnapshot()[0]?.props['count']).toBe(5)

    // Test max violation
    const errorsMax = store.updateProp('n1', 'count', 11)
    expect(errorsMax.length).toBeGreaterThan(0)
    expect(store.getSnapshot()[0]?.props['count']).toBe(5)
  })
})

// ─── useContentTree hook ──────────────────────────────────────────────────────

describe('useContentTree', () => {
  const initial: ContentNode[] = [
    { id: 'h1', type: 'Hero', props: { title: 'Initial' } },
  ]
  const HERO_SCHEMA: ComponentSchema = {
    key: 'Hero',
    fields: [{ key: 'title', type: 'text', label: 'Title', required: false }],
  }

  let store: ReturnType<typeof createContentTreeStore>

  beforeEach(() => {
    store = createContentTreeStore(initial, makeRuntime(HERO_SCHEMA))
  })

  it('returns the current nodes snapshot', () => {
    const { result } = renderHook(() => useContentTree(store))
    expect(result.current.nodes).toEqual(initial)
  })

  it('re-renders when updateProp triggers a store change', () => {
    const { result } = renderHook(() => useContentTree(store))
    act(() => {
      result.current.updateProp('h1', 'title', 'Changed')
    })
    expect(result.current.nodes[0]?.props['title']).toBe('Changed')
  })
})
