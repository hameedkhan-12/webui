import type { IAuraKernel, IRegistry, RegistryLifecycle } from '@repo/shared'

export class AuraKernel implements IAuraKernel {
  private _lifecycle: RegistryLifecycle = 'BOOTING'
  private readonly registries = new Map<string, IRegistry<unknown>>()
  private readonly onLifecycleChange: ((lifecycle: RegistryLifecycle) => void) | undefined

  constructor(onLifecycleChange?: (lifecycle: RegistryLifecycle) => void) {
    this.onLifecycleChange = onLifecycleChange
    this.onLifecycleChange?.(this._lifecycle)
  }

  get lifecycle(): RegistryLifecycle {
    return this._lifecycle
  }

  private transition(next: RegistryLifecycle): void {
    this._lifecycle = next
    this.onLifecycleChange?.(next)
  }

  mount<T>(registry: IRegistry<T>): void {
    // Auto-transition on first mount — UNMOUNTED → BOOTING
    if (this._lifecycle === 'UNMOUNTED') this.transition('BOOTING')

    if (this._lifecycle !== 'BOOTING') {
      if (this._lifecycle === 'READY') {
        throw new Error('AuraKernel.mount() can only be called during BOOTING. Current: READY')
      }
      throw new Error('AuraKernel.mount() can only be called during BOOTING state.')
    }
    if (this.registries.has(registry.namespace)) {
      throw new Error(
        `AuraKernel.mount(): Registry namespace collision — '${registry.namespace}' is already registered.`
      )
    }
    this.registries.set(registry.namespace, registry as IRegistry<unknown>)
  }

  async boot(): Promise<void> {
    if (this._lifecycle !== 'BOOTING') {
      throw new Error(
        'AuraKernel.boot() can only be called during BOOTING state.'
      )
    }
    // Optional async init hook — forward-compatible for registries that need I/O at boot
    await Promise.all(
      [...this.registries.values()].map(r => r.initialize?.())
    )
    this.transition('READY')
  }

  get<T>(namespace: string): IRegistry<T> {
    if (this._lifecycle !== 'READY') {
      throw new Error(
        'AuraKernel.get() called before boot. Call kernel.boot() first.'
      )
    }
    const registry = this.registries.get(namespace)
    if (!registry) {
      throw new Error(
        `AuraKernel.get(): No registry found for namespace '${namespace}'. ` +
        `Registered namespaces: [${[...this.registries.keys()].join(', ')}]`
      )
    }
    return registry as IRegistry<T>
  }

  dispose(): void {
    if (this._lifecycle === 'DISPOSED') return   // idempotent
    this.transition('DISPOSED')
    this.registries.clear()
  }
}