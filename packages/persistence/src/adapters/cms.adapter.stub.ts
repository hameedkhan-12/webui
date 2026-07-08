/**
 * CMSPersistenceAdapter — Phase 2 stub
 *
 * This adapter implements IPersistenceAdapter but all methods throw NotImplementedError.
 *
 * **When it will be built (Phase 2):**
 * After the visual editor is working end-to-end with the AST adapter,
 * we will implement CMS persistence to allow editing structured content via CMS APIs
 * instead of direct file manipulation.
 *
 * **How it connects to Phase 1 architecture:**
 * - PersistenceService will construct this adapter via dependency injection
 * - At runtime, the gateway chooses which adapter to use (AST vs CMS) based on config
 * - Both adapters implement the same IPersistenceAdapter interface
 * - The editor and gateway never know which adapter is in use — full abstraction
 *
 * **Phase 2 implementation will:**
 * 1. Accept CMS client credentials (API key, endpoint)
 * 2. Translate UpdatePropOperation → CMS API call to update component props
 * 3. Translate UpdateStyleOperation → CMS mutation for Tailwind classes
 * 4. Handle CMS versioning/publishing workflows
 * 5. Emit events on successful CMS mutations
 */

import type {
  IPersistenceAdapter,
  UpdatePropOperation,
  UpdateStyleOperation,
  UpdateChildrenOperation,
  AddClassOperation,
  RemoveClassOperation,
} from '@repo/shared'

export class CMSPersistenceAdapter implements IPersistenceAdapter {
  readonly name = 'cms'

  private throwNotImplemented(): never {
    throw new Error(
      `CMSPersistenceAdapter: not implemented in Phase 1. This adapter will be completed in Phase 2. See adapter source for integration roadmap.`
    )
  }

  async updateProp(op: UpdatePropOperation): Promise<void> {
    this.throwNotImplemented()
  }

  async updateStyle(op: UpdateStyleOperation): Promise<void> {
    this.throwNotImplemented()
  }

  async updateChildren(op: UpdateChildrenOperation): Promise<void> {
    this.throwNotImplemented()
  }

  async addClass(op: AddClassOperation): Promise<void> {
    this.throwNotImplemented()
  }

  async removeClass(op: RemoveClassOperation): Promise<void> {
    this.throwNotImplemented()
  }
}
