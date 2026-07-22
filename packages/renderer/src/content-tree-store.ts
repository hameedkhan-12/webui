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
  /**
   * Validates the node and its children recursively, and if valid,
   * inserts it into the tree under parentId/slot. If parentId is null,
   * it inserts it at the root of the tree.
   */
  insertNode(parentId: string | null, slot: string, node: ContentNode): readonly ValidationError[]
}

function validateNode(node: ContentNode, runtime: AuraRuntime): ValidationError[] {
  const schema = runtime.schemas.get(node.type)
  if (!schema) {
    return [{ field: 'type', message: `Block type "${node.type}" is not registered.` }]
  }

  const errors: ValidationError[] = []
  for (const field of schema.fields) {
    const value = node.props[field.key] ?? field.defaultValue
    const fieldErrors = validateField(field, value)
    errors.push(...fieldErrors.map(e => ({ ...e, field: `${node.type}.${e.field}` })))
  }

  if (node.children) {
    for (const child of node.children) {
      errors.push(...validateNode(child, runtime))
    }
  }

  return errors
}

function insertNodeInList(
  list: readonly ContentNode[],
  parentId: string,
  slot: string,
  newNode: ContentNode
): { nextList: readonly ContentNode[]; inserted: boolean } {
  let inserted = false
  const nextList = list.map(node => {
    if (node.id === parentId) {
      inserted = true
      const nextChildren = [...(node.children || []), { ...newNode, slot: slot || undefined }]
      return { ...node, children: nextChildren }
    }
    if (node.children) {
      const res = insertNodeInList(node.children, parentId, slot, newNode)
      if (res.inserted) {
        inserted = true
        return { ...node, children: res.nextList }
      }
    }
    return node
  })
  return { nextList, inserted }
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
    },

    insertNode(parentId, slot, newNode) {
      const errors = validateNode(newNode, runtime)
      if (errors.length > 0) return errors

      if (parentId === null) {
        nodes = [...nodes, { ...newNode, slot: slot || undefined }]
        notify()
        return []
      }

      const { nextList, inserted } = insertNodeInList(nodes, parentId, slot, newNode)
      if (!inserted) {
        return [{ field: 'parentId', message: `Parent node "${parentId}" was not found in the tree.` }]
      }

      nodes = nextList
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

  const insertNode = useCallback(
    (parentId: string | null, slot: string, node: ContentNode) => store.insertNode(parentId, slot, node),
    [store]
  )

  return { nodes, updateProp, insertNode }
}