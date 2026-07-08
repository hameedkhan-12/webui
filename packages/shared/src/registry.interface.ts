export type RegistryLifecycle = 'UNMOUNTED' | 'BOOTING' | 'READY' | 'DISPOSED'

// Registries: dumb key-value store with reactivity. No querying.
export interface IRegistry<TValue> {
  readonly namespace: string
  readonly size: number
  readonly isEmpty: boolean

  // Lifecycle hook — called by AuraKernel.boot(), optional async init
  initialize?(): Promise<void>

  // Mutations
  register(key: string, value: TValue): void
  unregister(key: string): void

  // Retrieval
  get(key: string): TValue | undefined
  getOrThrow(key: string): TValue      // throws with registered-keys context
  has(key: string): boolean
  keys(): readonly string[]

  // Reactivity
  subscribe(key: string, cb: (value: TValue | undefined) => void): () => void
  subscribeAll(cb: (key: string, value: TValue | undefined) => void): () => void
}

// Query capability lives on services, not registries.
// Services implement this alongside holding a reference to IRegistry<TValue>.
export interface IQueryable<TValue, TQuery> {
  query(predicate: TQuery): readonly TValue[]
}