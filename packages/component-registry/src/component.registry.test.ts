import { describe, expect, it, vi } from 'vitest'
import { ComponentRegistry } from './component.registry.js'
import { HeroSectionMeta, ButtonMeta, TextBlockMeta } from './built-in/index.js'
import type { IAuraKernel, IRegistry, ComponentMeta } from '@repo/shared'

const createMockAIRegistry = (): IRegistry<any> => {
  const store = new Map<string, any>()
  return {
    namespace: 'ai',
    get size() {
      return store.size
    },
    get isEmpty() {
      return store.size === 0
    },
    register: (key, val) => store.set(key, val),
    unregister: (key) => store.delete(key),
    get: (key) => store.get(key),
    getOrThrow: (key) => {
      const value = store.get(key)
      if (value === undefined) {
        throw new Error(`No value registered for key '${key}'.`)
      }
      return value
    },
    has: (key) => store.has(key),
    keys: () => Array.from(store.keys()),
    subscribe: () => () => {},
    subscribeAll: () => () => {},
  }
}

describe('ComponentRegistry', () => {
  it('should register, get, has, keys, and unregister components correctly', () => {
    const registry = new ComponentRegistry()
    
    expect(registry.has('HeroSection')).toBe(false)
    expect(registry.get('HeroSection')).toBeUndefined()
    expect(registry.keys()).toEqual([])

    registry.register('HeroSection', HeroSectionMeta)
    expect(registry.has('HeroSection')).toBe(true)
    expect(registry.get('HeroSection')).toBe(HeroSectionMeta)
    expect(registry.keys()).toEqual(['HeroSection'])

    registry.unregister('HeroSection')
    expect(registry.has('HeroSection')).toBe(false)
    expect(registry.get('HeroSection')).toBeUndefined()
    expect(registry.keys()).toEqual([])
  })

  it('should validate ComponentMeta requirements on registration', () => {
    const registry = new ComponentRegistry()
    const invalidMeta1 = {
      name: '',
      schemaKey: 'Invalid',
    } as any
    const invalidMeta2 = {
      name: 'Invalid',
      schemaKey: '',
    } as any

    expect(() => registry.register('Invalid', invalidMeta1)).toThrow()
    expect(() => registry.register('Invalid', invalidMeta2)).toThrow()
  })

  it('should prevent duplicate registration', () => {
    const registry = new ComponentRegistry()
    registry.register('Button', ButtonMeta)
    expect(() => registry.register('Button', ButtonMeta)).toThrowError(
      "ComponentRegistry.register(): Component 'Button' is already registered."
    )
  })

  it('should fire subscriptions on change (register and unregister)', () => {
    const registry = new ComponentRegistry()
    const callback = vi.fn()

    const unsubscribe = registry.subscribe('Button', callback)

    registry.register('Button', ButtonMeta)
    expect(callback).toHaveBeenCalledWith(ButtonMeta)

    registry.unregister('Button')
    expect(callback).toHaveBeenLastCalledWith(undefined)

    unsubscribe()
    registry.register('Button', ButtonMeta)
    expect(callback).toHaveBeenCalledTimes(2)
  })

  it('should push AI descriptors to AI Registry when kernel is READY', async () => {
    const aiRegistry = createMockAIRegistry()
    
    const kernel: IAuraKernel = {
      lifecycle: 'READY',
      mount: () => {},
      get: <T>(ns: string): IRegistry<T> => {
        if (ns === 'ai') return aiRegistry as unknown as IRegistry<T>
        throw new Error('Not found')
      },
      boot: async () => {},
      dispose: () => {},
    }

    const registry = new ComponentRegistry(kernel)
    registry.register('Button', ButtonMeta)

    expect(aiRegistry.has('Button')).toBe(true)
    const descriptor = aiRegistry.get('Button')
    expect(descriptor.componentName).toBe('Button')
    expect(descriptor.summary).toBe(ButtonMeta.description)
  })

  it('should defer AI descriptor pushes when kernel is not READY and flush later', async () => {
    const aiRegistry = createMockAIRegistry()
    let currentLifecycle: 'BOOTING' | 'READY' = 'BOOTING'

    const kernel: IAuraKernel = {
      get lifecycle() { return currentLifecycle },
      mount: () => {},
      get: <T>(ns: string): IRegistry<T> => {
        if (ns === 'ai') {
          if (currentLifecycle !== 'READY') throw new Error('Not ready yet')
          return aiRegistry as unknown as IRegistry<T>
        }
        throw new Error('Not found')
      },
      boot: async () => {},
      dispose: () => {},
    }

    const registry = new ComponentRegistry(kernel)
    
    registry.register('Button', ButtonMeta)
    expect(aiRegistry.has('Button')).toBe(false)

    currentLifecycle = 'READY'

    expect(registry.get('Button')).toBe(ButtonMeta)
    
    expect(aiRegistry.has('Button')).toBe(true)
  })
})
