import type { IRegistry, RegistryLifecycle } from './registry.interface'

export interface IAuraKernel {
  readonly lifecycle: RegistryLifecycle
  mount<T>(registry: IRegistry<T>): void
  get<T>(namespace: string): IRegistry<T>
  boot(): Promise<void>
  dispose(): void
}
