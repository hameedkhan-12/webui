import { describe, it, expect } from 'vitest'
import { BUILT_IN_BLOCKS, BLOCK_DEFINITIONS_BY_KEY, getBlock, getAllBlocks } from './registry.js'

const EXPECTED_BLOCK_TYPES = [
    'Button',
    'TextBlock',
    'Hero',
    'Section',
    'Container',
    'Grid',
    'Card',
    'Image',
    'Nav',
    'Footer',
    'Form',
    'Spacer'
]

describe('BUILT_IN_BLOCKS', () => {
    it('registers exactly the expected first-wave block palette', () => {
        const types = BUILT_IN_BLOCKS.map((b) => b.blockType).sort()
        expect(types).toEqual([...EXPECTED_BLOCK_TYPES].sort())
    })

    it('has no duplicate blockType entries', () => {
        const types = BUILT_IN_BLOCKS.map((b) => b.blockType)
        expect(new Set(types).size).toBe(types.length)
    })

    for (const type of EXPECTED_BLOCK_TYPES) {
        it(`"${type}" has a well-formed BlockDefinition`, () => {
            const block = getBlock(type)
            expect(block).toBeDefined()
            expect(block!.component).toBeTypeOf('function')
            expect(block!.displayName).toBeTypeOf('string')
            expect(block!.displayName.length).toBeGreaterThan(0)
            expect(block!.category).toBeTypeOf('string')
            expect(block!.defaultProps).toBeTypeOf('object')
        })

        it(`"${type}" has meta and schema with matching keys`, () => {
            const block = getBlock(type)
            expect(block!.meta).toBeDefined()
            expect(block!.schema).toBeDefined()
            expect(block!.meta!.schemaKey).toBe(block!.schema!.key)
            expect(block!.meta!.name).toBe(type)
        })

        it(`"${type}" schema fields all have key, type, and label`, () => {
            const block = getBlock(type)
            for (const field of block!.schema!.fields) {
                expect(field.key, `${type} field missing key`).toBeTruthy()
                expect(field.type, `${type} field "${field.key}" missing type`).toBeTruthy()
                expect(field.label, `${type} field "${field.key}" missing label`).toBeTruthy()
            }
        })

        it(`"${type}" select fields declare non-empty options`, () => {
            const block = getBlock(type)
            for (const field of block!.schema!.fields) {
                if (field.type === 'select') {
                    expect(field.options?.length ?? 0).toBeGreaterThan(0)
                }
            }
        })
    }

    it('BLOCK_DEFINITIONS_BY_KEY is kept in sync with BUILT_IN_BLOCKS', () => {
        expect(BLOCK_DEFINITIONS_BY_KEY.size).toBe(BUILT_IN_BLOCKS.length)
        for (const block of BUILT_IN_BLOCKS) {
            expect(BLOCK_DEFINITIONS_BY_KEY.get(block.blockType)).toBe(block)
        }
    })

    it('getAllBlocks() returns every registered block', () => {
        expect(getAllBlocks().length).toBe(EXPECTED_BLOCK_TYPES.length)
    })
})