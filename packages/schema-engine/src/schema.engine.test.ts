import { describe, expect, it } from 'vitest'
import { SchemaRegistry } from './schema.registry.js'
import { validate, validateField } from './schema.validator.js'
import {
  textField, numberField, selectField, booleanField
} from './field-types/index.js'
import { HeroSectionSchema, ButtonSchema, TextBlockSchema } from './built-in/index.js'
import type { ComponentSchema } from '@repo/shared'

// ─── SchemaRegistry ───────────────────────────────────────────────────────────

describe('SchemaRegistry', () => {
  it('should register, get, has, keys, and unregister schemas', () => {
    const registry = new SchemaRegistry()
    expect(registry.has('Button')).toBe(false)

    registry.register('Button', ButtonSchema)
    expect(registry.has('Button')).toBe(true)
    expect(registry.get('Button')).toBe(ButtonSchema)
    expect(registry.keys()).toContain('Button')

    registry.unregister('Button')
    expect(registry.has('Button')).toBe(false)
  })

  it('should throw on duplicate registration', () => {
    const registry = new SchemaRegistry()
    registry.register('Button', ButtonSchema)
    expect(() => registry.register('Button', ButtonSchema)).toThrowError(
      "SchemaRegistry.register(): Schema with key 'Button' is already registered."
    )
  })

  it('should throw on invalid schema structure (missing key)', () => {
    const registry = new SchemaRegistry()
    const badSchema = { key: '', fields: [] } as unknown as ComponentSchema
    expect(() => registry.register('bad', badSchema)).toThrow()
  })

  it('should throw on invalid field definition (missing type)', () => {
    const registry = new SchemaRegistry()
    const badSchema: ComponentSchema = {
      key: 'Test',
      fields: [{ key: 'x', type: undefined as any, label: 'X' }]
    }
    expect(() => registry.register('Test', badSchema)).toThrow()
  })

  it('should fire subscription callbacks on register and unregister', () => {
    const registry = new SchemaRegistry()
    const calls: Array<ComponentSchema | undefined> = []
    const unsub = registry.subscribe('HeroSection', (v) => calls.push(v))

    registry.register('HeroSection', HeroSectionSchema)
    expect(calls).toHaveLength(1)
    expect(calls[0]).toBe(HeroSectionSchema)

    registry.unregister('HeroSection')
    expect(calls).toHaveLength(2)
    expect(calls[1]).toBeUndefined()

    unsub()
    registry.register('HeroSection', HeroSectionSchema)
    expect(calls).toHaveLength(2) // no new calls after unsubscribe
  })
})

// ─── Field Factories ───────────────────────────────────────────────────────────

describe('Field type factories', () => {
  it('textField should produce correct shape', () => {
    const f = textField('title', 'Title')
    expect(f.key).toBe('title')
    expect(f.type).toBe('text')
    expect(f.label).toBe('Title')
    expect(f.defaultValue).toBe('')
  })

  it('numberField should produce correct shape', () => {
    const f = numberField('count', 'Count', { validation: { min: 1, max: 10 } })
    expect(f.type).toBe('number')
    expect(f.defaultValue).toBe(0)
    expect(f.validation?.min).toBe(1)
    expect(f.validation?.max).toBe(10)
  })

  it('selectField should pre-populate defaultValue from first option', () => {
    const f = selectField('size', 'Size', [
      { label: 'Small', value: 'sm' },
      { label: 'Large', value: 'lg' }
    ])
    expect(f.type).toBe('select')
    expect(f.defaultValue).toBe('sm')
    expect(f.options).toHaveLength(2)
  })
})

// ─── SchemaValidator ──────────────────────────────────────────────────────────

describe('SchemaValidator', () => {
  it('validateField: required fields fail on empty value', () => {
    const field = textField('name', 'Name', { required: true })
    expect(validateField(field, '')).toHaveLength(1)
    expect(validateField(field, undefined)).toHaveLength(1)
    expect(validateField(field, 'John')).toHaveLength(0)
  })

  it('validateField: number range validation works correctly', () => {
    const field = numberField('age', 'Age', { validation: { min: 18, max: 99 } })
    expect(validateField(field, 17)).toHaveLength(1)
    expect(validateField(field, 100)).toHaveLength(1)
    expect(validateField(field, 25)).toHaveLength(0)
  })

  it('validateField: text length validation works correctly', () => {
    const field = textField('bio', 'Bio', { validation: { min: 5, max: 10 } })
    expect(validateField(field, 'Hi')).toHaveLength(1)   // too short
    expect(validateField(field, 'Hello World!')).toHaveLength(1) // too long
    expect(validateField(field, 'Hello')).toHaveLength(0)
  })

  it('validateField: text pattern validation works correctly', () => {
    const field = textField('email', 'Email', { validation: { pattern: '^[^@]+@[^@]+$' } })
    expect(validateField(field, 'not-an-email')).toHaveLength(1)
    expect(validateField(field, 'user@example.com')).toHaveLength(0)
  })

  it('validateField: select option boundary check works correctly', () => {
    const field = selectField('variant', 'Variant', [
      { label: 'Primary', value: 'primary' },
      { label: 'Secondary', value: 'secondary' }
    ])
    expect(validateField(field, 'ghost')).toHaveLength(1)
    expect(validateField(field, 'primary')).toHaveLength(0)
  })

  it('validate: full schema validation aggregates errors', () => {
    const schema: ComponentSchema = {
      key: 'Test',
      fields: [
        textField('name', 'Name', { required: true }),
        numberField('age', 'Age', { validation: { min: 18 } })
      ]
    }
    const result = validate(schema, { name: '', age: 10 })
    expect(result.valid).toBe(false)
    expect(result.errors).toHaveLength(2)
  })

  it('validate: valid data passes full schema validation', () => {
    const result = validate(ButtonSchema, { label: 'Click Me', variant: 'primary', disabled: false, href: '' })
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })
})
