import type { IPersistenceAdapter } from '@repo/shared'

/**
 * Phase 2 — CMS persistence adapter.
 * Connects via PersistenceService adapter slot (same IPersistenceAdapter as ASTPersistenceAdapter).
 */
export class CMSPersistenceAdapter implements IPersistenceAdapter {
  readonly name = 'cms'

  async updateProp(): Promise<void> {
    throw new Error('CMSPersistenceAdapter: not implemented in Phase 1')
  }

  async updateStyle(): Promise<void> {
    throw new Error('CMSPersistenceAdapter: not implemented in Phase 1')
  }

  async updateChildren(): Promise<void> {
    throw new Error('CMSPersistenceAdapter: not implemented in Phase 1')
  }

  async addClass(): Promise<void> {
    throw new Error('CMSPersistenceAdapter: not implemented in Phase 1')
  }

  async removeClass(): Promise<void> {
    throw new Error('CMSPersistenceAdapter: not implemented in Phase 1')
  }
}

/** Phase 2 — Collection registry for CMS-managed content collections. */
export interface ICollectionRegistry {
  readonly namespace: 'collections'
  registerCollection(_key: string): void
  getCollection(_key: string): unknown
}

export class CollectionRegistryStub implements ICollectionRegistry {
  readonly namespace = 'collections' as const

  registerCollection(_key: string): void {
    throw new Error('CollectionRegistryStub: not implemented in Phase 1')
  }

  getCollection(_key: string): unknown {
    throw new Error('CollectionRegistryStub: not implemented in Phase 1')
  }
}
