/**
 * Phase 4 — Plugin marketplace for third-party registries and field types.
 * Extends Aura via new packages mounted on AuraKernel at boot time (OCP).
 */
export interface IPluginMarketplace {
  installPlugin(_pluginId: string): Promise<void>
  uninstallPlugin(_pluginId: string): Promise<void>
  listInstalled(): readonly string[]
}

export class PluginMarketplaceStub implements IPluginMarketplace {
  async installPlugin(_pluginId: string): Promise<void> {
    throw new Error('PluginMarketplaceStub: not implemented in Phase 1')
  }

  async uninstallPlugin(_pluginId: string): Promise<void> {
    throw new Error('PluginMarketplaceStub: not implemented in Phase 1')
  }

  listInstalled(): readonly string[] {
    throw new Error('PluginMarketplaceStub: not implemented in Phase 1')
  }
}
