/**
 * A ContentNode is one block instance in a page. `type` must match a
 * registered block's schemaKey (see @aura/blocks BUILT_IN_BLOCKS).
 *
 * `id` is the STABLE identity of this node -- it is what gets stamped
 * onto the DOM as data-aura-id, what the click-editor targets, and what
 * persistence operations (Phase 3) reference. It must never change for
 * the lifetime of the node; regenerating it on every render is exactly
 * the kind of instability that made the old regex-injection approach
 * unreliable.
 *
 * `slot` labels which named slot of the PARENT this node fills (e.g. a
 * Button node with slot: "cta" underneath a Hero node fills Hero's `cta`
 * prop). Children without a `slot` are treated as slot "children" and
 * are not consumed by any of today's three blocks, but keeps this data
 * shape ready for container-style blocks (Section, Grid) added later.
 */
export interface ContentNode {
  readonly id: string
  readonly type: string
  readonly props: Readonly<Record<string, unknown>>
  readonly children?: readonly ContentNode[]
  readonly slot?: string
}

const DEFAULT_SLOT = 'children'

/**
 * Groups a node's children by slot name. Single-child slots resolve to
 * that child alone (not wrapped in an array) since most slot-consuming
 * props (e.g. Hero's `cta`) expect a single ReactNode, not a list.
 */
export function groupChildrenBySlot(
  children: readonly ContentNode[] | undefined
): ReadonlyMap<string, readonly ContentNode[]> {
  const bySlot = new Map<string, ContentNode[]>()
  if (!children) return bySlot

  for (const child of children) {
    const slot = child.slot ?? DEFAULT_SLOT
    const bucket = bySlot.get(slot)
    if (bucket) {
      bucket.push(child)
    } else {
      bySlot.set(slot, [child])
    }
  }

  return bySlot
}

/** Depth-first walk, useful for flattening a tree to find a node by id. */
export function findNodeById(
  nodes: readonly ContentNode[],
  id: string
): ContentNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.children) {
      const found = findNodeById(node.children, id)
      if (found) return found
    }
  }
  return undefined
}