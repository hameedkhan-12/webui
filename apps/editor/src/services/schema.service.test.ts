import { describe, expect, it } from 'vitest'
import { SchemaService } from './schema.service.js'
import { SchemaRegistry, ButtonSchema, HeroSectionSchema } from '@aura/schema-engine'
import type { IAuraKernel, IRegistry, ComponentSchema, ComponentMeta } from '@repo/shared'

const createMockSchemaRegistry = (): IRegistry<ComponentSchema> => {
  const store = new Map<string, ComponentSchema>()
  return {
    namespace: 'schemas',
    register: (k, v) => store.set(k, v),
    unregister: (k) => store.delete(k),
    get: (k) => store.get(k),
    has: (k) => store.has(k),
    keys: () => Array.from(store.keys()),
    subscribe: () => () => {}
  }
}

const createMockComponentRegistry = (): IRegistry<ComponentMeta> => {
  const store = new Map<string, ComponentMeta>()
  return {
    namespace: 'components',
    register: (k, v) => store.set(k, v),
    unregister: (k) => store.delete(k),
    get: (k) => store.get(k),
    has: (k) => store.has(k),
    keys: () => Array.from(store.keys()),
    subscribe: () => () => {}
  }
}

describe('SchemaService', () => {
  it('getSchema returns registered schema or undefined', () => {
    const schemas = createMockSchemaRegistry()
    schemas.register('Button', ButtonSchema)

    const kernel: IAuraKernel = {
      lifecycle: 'READY',
      mount: () => {},
      get: <T>(ns: string): IRegistry<T> => {
        if (ns === 'schemas') return schemas as unknown as IRegistry<T>
        throw new Error('Not found')
      },
      boot: async () => {},
      dispose: () => {}
    }

    const service = new SchemaService(kernel)
    expect(service.getSchema('Button')).toBe(ButtonSchema)
    expect(service.getSchema('NonExistent')).toBeUndefined()
  })

  it('validateForKey validates data against a registered schema', () => {
    const schemas = createMockSchemaRegistry()
    schemas.register('Button', ButtonSchema)

    const kernel: IAuraKernel = {
      lifecycle: 'READY',
      mount: () => {},
      get: <T>(ns: string): IRegistry<T> => {
        if (ns === 'schemas') return schemas as unknown as IRegistry<T>
        throw new Error('Not found')
      },
      boot: async () => {},
      dispose: () => {}
    }

    const service = new SchemaService(kernel)

    const valid = service.validateForKey('Button', { label: 'Click', variant: 'primary', disabled: false, href: '' })
    expect(valid?.valid).toBe(true)

    const invalid = service.validateForKey('Button', { label: '', variant: 'primary', disabled: false, href: '' })
    expect(invalid?.valid).toBe(false)

    const missing = service.validateForKey('NoSchema', {})
    expect(missing).toBeNull()
  })

  it('deriveFromMeta returns a fallback schema from component metadata', () => {
    const schemas = createMockSchemaRegistry()
    const components = createMockComponentRegistry()
    components.register('Button', {
      name: 'Button',
      displayName: 'Button',
      description: 'An interactive button',
      icon: 'click',
      category: 'navigation',
      tags: [],
      slots: [],
      variants: [],
      events: [],
      permissions: [],
      documentation: '',
      aiHints: [],
      schemaKey: 'Button'
    })

    const kernel: IAuraKernel = {
      lifecycle: 'READY',
      mount: () => {},
      get: <T>(ns: string): IRegistry<T> => {
        if (ns === 'schemas') return schemas as unknown as IRegistry<T>
        if (ns === 'components') return components as unknown as IRegistry<T>
        throw new Error('Not found')
      },
      boot: async () => {},
      dispose: () => {}
    }

    const service = new SchemaService(kernel)
    const derived = service.deriveFromMeta('Button')
    expect(derived).not.toBeNull()
    expect(derived?.key).toBe('Button')
    expect(derived?.fields.length).toBeGreaterThan(0)
  })

  it('resolveForSelection returns registered schema over derived fallback', () => {
    const schemas = createMockSchemaRegistry()
    schemas.register('HeroSection', HeroSectionSchema)
    const components = createMockComponentRegistry()

    const kernel: IAuraKernel = {
      lifecycle: 'READY',
      mount: () => {},
      get: <T>(ns: string): IRegistry<T> => {
        if (ns === 'schemas') return schemas as unknown as IRegistry<T>
        if (ns === 'components') return components as unknown as IRegistry<T>
        throw new Error('Not found')
      },
      boot: async () => {},
      dispose: () => {}
    }

    const service = new SchemaService(kernel)
    expect(service.resolveForSelection('HeroSection')).toBe(HeroSectionSchema)
    expect(service.resolveForSelection('Unknown')).toBeNull()
  })
})
