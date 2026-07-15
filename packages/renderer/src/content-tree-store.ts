import { useCallback, useSyncExternalStore } from 'react'
import { validateField, type ValidationError } from '@aura/schema-engine'
import type { AuraRuntime } from '@aura/blocks'
import { findNodeById, type ContentNode } from './content-node.js'

export interface ContentTreeStore {
  getSnapshot(): readonly ContentNode[]
  subscribe(listener: () => void): () => void
  /**
   * Validates `value` against the node's schema field, and only applies
   * the change if valid. Returns an empty array on success, or the list
   * of validation errors otherwise -- the caller (typically the
   * inspector panel) is responsible for surfacing those to the user.
   *
   * This is the click-editor's write path: a single in-memory tree
   * update, synchronous, no file I/O, no WebContainer round-trip. There
   * is nothing here that can silently fail the way regex-based source
   * injection could.
   */
  updateProp(nodeId: string, propKey: string, value: unknown): readonly ValidationError[]
}

/**
 * Creates a tree store bound to a specific AuraRuntime, so every prop
 * write is checked against that block's real schema before it's applied.
 * One store per open page/document; pass the same instance into
 * useContentTree() from every component that needs to read or write it
 * (Canvas, InspectorPanel, etc.) so they stay in sync.
 */
export function createContentTreeStore(
  initialNodes: readonly ContentNode[],
  runtime: AuraRuntime
): ContentTreeStore {
  let nodes = initialNodes
  const listeners = new Set<() => void>()

  function notify(): void {
    for (const listener of listeners) listener()
  }

  function replaceNode(
    list: readonly ContentNode[],
    id: string,
    updater: (node: ContentNode) => ContentNode
  ): readonly ContentNode[] {
    let changed = false
    const next = list.map(node => {
      if (node.id === id) {
        changed = true
        return updater(node)
      }
      if (node.children) {
        const nextChildren = replaceNode(node.children, id, updater)
        if (nextChildren !== node.children) {
          changed = true
          return { ...node, children: nextChildren }
        }
      }
      return node
    })
    return changed ? next : list
  }

  return {
    getSnapshot: () => nodes,

    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    updateProp(nodeId, propKey, value) {
      const node = findNodeById(nodes, nodeId)
      if (!node) {
        return [{ field: propKey, message: `Node "${nodeId}" was not found in the tree.` }]
      }

      const schema = runtime.schemas.get(node.type)
      const field = schema?.fields.find(f => f.key === propKey)
      if (!field) {
        return [
          {
            field: propKey,
            message: `"${propKey}" is not an editable field on block type "${node.type}".`
          }
        ]
      }

      const errors = validateField(field, value)
      if (errors.length > 0) return errors

      nodes = replaceNode(nodes, nodeId, current => ({
        ...current,
        props: { ...current.props, [propKey]: value }
      }))
      notify()
      return []
    }
  }
}

/**
 * React binding for a ContentTreeStore, via useSyncExternalStore so reads
 * stay correct under concurrent rendering even with multiple subscribers
 * (Canvas rendering the tree, InspectorPanel editing it) sharing one store.
 */
export function useContentTree(store: ContentTreeStore) {
  const nodes = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)

  const updateProp = useCallback(
    (nodeId: string, propKey: string, value: unknown) => store.updateProp(nodeId, propKey, value),
    [store]
  )

  return { nodes, updateProp }
}