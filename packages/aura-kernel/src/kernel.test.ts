import { describe, expect, it, vi } from 'vitest'
import { AuraKernel } from './kernel.js'
import type { IRegistry } from '@repo/shared'

const createMockRegistry = (namespace: string): IRegistry<string> => ({
  namespace,
  size: 0,
  isEmpty: true,
  register: () => {},
  unregister: () => {},
  get: () => undefined,
  getOrThrow: () => {
    throw new Error(`No value registered in registry '${namespace}'.`)
  },
  has: () => false,
  keys: () => [],
  subscribe: () => () => {},
  subscribeAll: () => () => {},
})

describe('AuraKernel', () => {
  it('should transition through states on the happy path', async () => {
    const lifecycleStates: string[] = []
    const cb = vi.fn((state) => {
      lifecycleStates.push(state)
    })

    const kernel = new AuraKernel(cb)
    expect(kernel.lifecycle).toBe('BOOTING')
    expect(cb).toHaveBeenCalledWith('BOOTING')

    const mockRegistry = createMockRegistry('components')
    kernel.mount(mockRegistry)

    await kernel.boot()
    expect(kernel.lifecycle).toBe('READY')
    expect(cb).toHaveBeenLastCalledWith('READY')

    const retrieved = kernel.get<string>('components')
    expect(retrieved).toBe(mockRegistry)

    kernel.dispose()
    expect(kernel.lifecycle).toBe('DISPOSED')
    expect(cb).toHaveBeenLastCalledWith('DISPOSED')
    expect(lifecycleStates).toEqual(['BOOTING', 'READY', 'DISPOSED'])
  })

  it('should throw get() before boot() error with correct message', () => {
    const kernel = new AuraKernel()
    expect(() => kernel.get('components')).toThrowError(
      'AuraKernel.get() called before boot. Call kernel.boot() first.'
    )
  })

  it('should throw immediately and fatally on double-mount namespace collision', () => {
    const kernel = new AuraKernel()
    const reg1 = createMockRegistry('components')
    const reg2 = createMockRegistry('components')

    kernel.mount(reg1)
    expect(() => kernel.mount(reg2)).toThrowError(
      "AuraKernel.mount(): Registry namespace collision — 'components' is already registered."
    )
  })

  it('should prevent mount() when not in BOOTING state', async () => {
    const kernel = new AuraKernel()
    await kernel.boot()
    const reg = createMockRegistry('components')
    expect(() => kernel.mount(reg)).toThrowError(
      'AuraKernel.mount() can only be called during BOOTING. Current: READY'
    )

    const kernel2 = new AuraKernel()
    kernel2.dispose()
    expect(() => kernel2.mount(reg)).toThrowError(
      'AuraKernel.mount() can only be called during BOOTING state.'
    )
  })

  it('should prevent boot() when not in BOOTING state', async () => {
    const kernel = new AuraKernel()
    await kernel.boot()
    await expect(kernel.boot()).rejects.toThrowError(
      'AuraKernel.boot() can only be called during BOOTING state.'
    )
  })

  it('should prevent further get() calls after dispose() and clear registries', async () => {
    const kernel = new AuraKernel()
    const reg = createMockRegistry('components')
    kernel.mount(reg)
    await kernel.boot()

    expect(kernel.get('components')).toBe(reg)

    kernel.dispose()
    expect(() => kernel.get('components')).toThrowError(
      'AuraKernel.get() called before boot. Call kernel.boot() first.'
    )
  })

  it('should enforce compile-time generic types on get()', async () => {
    const kernel = new AuraKernel()
    const reg = createMockRegistry('components')
    kernel.mount(reg)
    await kernel.boot()

    // Generic parameter restricts type and typecheck verifies it
    const typedReg = kernel.get<string>('components')
    expect(typedReg).toBe(reg)
  })
})
