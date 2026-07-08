import type { IRegistry, ComponentSchema, IAuraKernel } from '@repo/shared'

export class SchemaRegistry implements IRegistry<ComponentSchema> {
  readonly namespace = 'schemas'
  private readonly storage = new Map<string, ComponentSchema>()
  private readonly listeners = new Map<string, Set<(value: ComponentSchema | undefined) => void>>()
  private readonly allListeners = new Set<(key: string, value: ComponentSchema | undefined) => void>()

  constructor(private readonly kernel?: IAuraKernel | undefined) {}

  register(key: string, value: ComponentSchema): void {
    if (!value.key || !value.fields || !Array.isArray(value.fields)) {
      throw new Error(`SchemaRegistry.register(): Invalid schema structure for key '${key}'. Schema must contain 'key' and 'fields' array.`)
    }

    for (const field of value.fields) {
      if (!field.key || !field.type || !field.label) {
        throw new Error(`SchemaRegistry.register(): Invalid field definition in schema '${key}'. Field must have 'key', 'type', and 'label'.`)
      }
    }

    if (this.storage.has(key)) {
      throw new Error(`SchemaRegistry.register(): Schema with key '${key}' is already registered.`)
    }

    this.storage.set(key, value)

    const keyListeners = this.listeners.get(key)
    if (keyListeners) {
      for (const cb of keyListeners) {
        cb(value)
      }
    }
    for (const cb of this.allListeners) {
      cb(key, value)
    }
  }

  unregister(key: string): void {
    const existed = this.storage.get(key)
    if (!existed) return

    this.storage.delete(key)

    const keyListeners = this.listeners.get(key)
    if (keyListeners) {
      for (const cb of keyListeners) {
        cb(undefined)
      }
    }
    for (const cb of this.allListeners) {
      cb(key, undefined)
    }
  }

  get(key: string): ComponentSchema | undefined {
    return this.storage.get(key)
  }

  getOrThrow(key: string): ComponentSchema {
    const value = this.get(key)
    if (value === undefined) {
      throw new Error(`SchemaRegistry.getOrThrow(): No schema registered for key '${key}'.`)
    }
    return value
  }

  has(key: string): boolean {
    return this.storage.has(key)
  }

  get size(): number {
    return this.storage.size
  }

  get isEmpty(): boolean {
    return this.storage.size === 0
  }

  keys(): readonly string[] {
    return Array.from(this.storage.keys())
  }

  subscribe(key: string, cb: (value: ComponentSchema | undefined) => void): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set())
    }
    this.listeners.get(key)!.add(cb)

    return () => {
      const set = this.listeners.get(key)
      if (set) {
        set.delete(cb)
        if (set.size === 0) {
          this.listeners.delete(key)
        }
      }
    }
  }

  subscribeAll(cb: (key: string, value: ComponentSchema | undefined) => void): () => void {
    this.allListeners.add(cb)
    return () => {
      this.allListeners.delete(cb)
    }
  }
}
