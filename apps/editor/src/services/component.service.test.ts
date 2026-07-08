import { describe, expect, it } from 'vitest'
import { ComponentService } from './component.service'
import type { IAuraKernel, IRegistry, ComponentMeta } from '@repo/shared'

const createMockRegistry = (): IRegistry<ComponentMeta> => {
  const store = new Map<string, ComponentMeta>()
  return {
    namespace: 'components',
    register: (key, val) => store.set(key, val),
    unregister: (key) => store.delete(key),
    get: (key) => store.get(key),
    has: (key) => store.has(key),
    keys: () => Array.from(store.keys()),
    subscribe: () => () => {},
  }
}

describe('ComponentService', () => {
  const mockMeta1: ComponentMeta = {
    name: 'HeroSection',
    displayName: 'Hero Section',
    description: 'A marketing hero block',
    icon: 'layout',
    category: 'marketing',
    tags: ['hero', 'marketing'],
    slots: [],
    variants: [],
    events: [],
    permissions: [],
    documentation: '',
    aiHints: [],
    schemaKey: 'HeroSection',
  }

  const mockMeta2: ComponentMeta = {
    name: 'Button',
    displayName: 'Click Button',
    description: 'Interactive button component',
    icon: 'click',
    category: 'navigation',
    tags: ['button', 'navigation'],
    slots: [],
    variants: [],
    events: [],
    permissions: [],
    documentation: '',
    aiHints: [],
    schemaKey: 'Button',
  }

  it('should query registries via ComponentService correctly', async () => {
    const registry = createMockRegistry()
    registry.register('HeroSection', mockMeta1)
    registry.register('Button', mockMeta2)

    const kernel: IAuraKernel = {
      lifecycle: 'READY',
      mount: () => {},
      get: <T>(ns: string): IRegistry<T> => {
        if (ns === 'components') return registry as unknown as IRegistry<T>
        throw new Error('Not found')
      },
      boot: async () => {},
      dispose: () => {},
    }

    const service = new ComponentService(kernel)

    expect(service.getAll()).toEqual([mockMeta1, mockMeta2])

    expect(service.getByCategory('marketing')).toEqual([mockMeta1])
    expect(service.getByCategory('navigation')).toEqual([mockMeta2])

    expect(service.getByKey('HeroSection')).toBe(mockMeta1)
    expect(service.getByKey('Button')).toBe(mockMeta2)
    expect(service.getByKey('NonExistent')).toBeUndefined()

    expect(service.search('hero')).toEqual([mockMeta1])
    expect(service.search('button')).toEqual([mockMeta2])
    expect(service.search('click')).toEqual([mockMeta2])
    expect(service.search('interactive')).toEqual([mockMeta2])
    expect(service.search('nonexistent')).toEqual([])
  })
})
