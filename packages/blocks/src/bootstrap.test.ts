import { describe, it, expect, beforeEach } from 'vitest'
import { bootstrapAura, __resetAuraRuntimeForTests } from './bootstrap.js'
import { BUILT_IN_BLOCKS } from './registry.js'

describe('bootstrapAura', () => {
    beforeEach(() => {
        __resetAuraRuntimeForTests()
    })

    it('registers every built-in block into the component and schema registries', async () => {
        const runtime = await bootstrapAura()

        expect(runtime.components.size).toBe(BUILT_IN_BLOCKS.length)
        expect(runtime.schemas.size).toBe(BUILT_IN_BLOCKS.length)

        for (const block of BUILT_IN_BLOCKS) {
            expect(runtime.components.has(block.meta!.schemaKey)).toBe(true)
            expect(runtime.schemas.has(block.schema!.key)).toBe(true)
        }
    })

    it('exposes a working component lookup for every registered block', async () => {
        const runtime = await bootstrapAura()

        for (const block of BUILT_IN_BLOCKS) {
            expect(runtime.getComponent(block.meta!.schemaKey)).toBe(block.component)
        }
        expect(runtime.getComponent('DoesNotExist')).toBeUndefined()
    })

    it('boots the kernel to READY', async () => {
        const runtime = await bootstrapAura()
        expect(runtime.kernel.lifecycle).toBe('READY')
    })

    it('is idempotent -- a second call returns the same runtime instead of re-mounting', async () => {
        const first = await bootstrapAura()
        const second = await bootstrapAura()
        expect(second).toBe(first)
    })

    it('rejects a block whose meta.schemaKey does not match its schema.key', async () => {
        const malformed = [
            {
                blockType: 'Broken',
                displayName: 'Broken',
                category: 'Layout',
                defaultProps: {},
                component: () => null,
                meta: { ...BUILT_IN_BLOCKS[0]!.meta!, schemaKey: 'Mismatched' },
                schema: BUILT_IN_BLOCKS[0]!.schema!
            }
        ]

        await expect(bootstrapAura(malformed as never)).rejects.toThrow(/mismatched keys/i)
    })
})