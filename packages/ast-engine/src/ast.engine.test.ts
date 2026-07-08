import { describe, expect, it } from 'vitest'
import {
  findNodeByAuraId,
  extractProps,
  extractClasses,
} from './ast.parser.js'
import {
  updateProp,
  updateStyle,
  updateChildren,
  addClass,
  removeClass,
} from './ast.writer.js'
import { generate, tag, strip, collect } from './aura-id.service.js'

// ─── Fixture source ───────────────────────────────────────────────────────────

const FIXTURE = `
import React from 'react'

export function Page() {
  return (
    <div className="container mx-auto">
      <HeroSection
        data-aura-id="hero-001"
        heading="Hello World"
        className="bg-blue-500 text-white p-8"
      >
        Hero content
      </HeroSection>
      <Button data-aura-id="btn-001" variant="primary" disabled className="mt-4">
        Click Me
      </Button>
      <TextBlock data-aura-id="text-001" className="text-gray-600" />
    </div>
  )
}
`

// ─── ASTParser ────────────────────────────────────────────────────────────────

describe('ASTParser', () => {
  it('findNodeByAuraId: locates a node by its aura id', () => {
    const node = findNodeByAuraId(FIXTURE, 'hero-001')
    expect(node).not.toBeNull()
    expect(node?.auraId).toBe('hero-001')
    expect(node?.line).toBeGreaterThan(0)
    expect(node?.raw).toContain('data-aura-id="hero-001"')
  })

  it('findNodeByAuraId: returns null for missing id', () => {
    expect(findNodeByAuraId(FIXTURE, 'does-not-exist')).toBeNull()
  })

  it('extractProps: extracts all props from a node', () => {
    const props = extractProps(FIXTURE, 'hero-001')
    expect(props['heading']).toBe('Hello World')
    expect(props['className']).toBe('bg-blue-500 text-white p-8')
    expect(props['data-aura-id']).toBeUndefined() // filtered out
  })

  it('extractProps: extracts bare boolean props', () => {
    const props = extractProps(FIXTURE, 'btn-001')
    expect(props['disabled']).toBe(true)
    expect(props['variant']).toBe('primary')
  })

  it('extractClasses: returns tailwind class list', () => {
    const classes = extractClasses(FIXTURE, 'hero-001')
    expect(classes).toContain('bg-blue-500')
    expect(classes).toContain('text-white')
    expect(classes).toContain('p-8')
  })

  it('extractClasses: returns empty array when no className', () => {
    const source = `<Foo data-aura-id="no-class" />`
    expect(extractClasses(source, 'no-class')).toEqual([])
  })
})

// ─── ASTWriter ────────────────────────────────────────────────────────────────

describe('ASTWriter', () => {
  it('updateProp: replaces an existing string prop', () => {
    const result = updateProp(FIXTURE, {
      file: 'page.tsx', line: 0, auraId: 'hero-001',
      prop: 'heading', value: 'New Heading'
    })
    expect(result).toContain('heading="New Heading"')
    expect(result).not.toContain('heading="Hello World"')
  })

  it('updateProp: replaces a non-string prop with {expr}', () => {
    const result = updateProp(FIXTURE, {
      file: 'page.tsx', line: 0, auraId: 'btn-001',
      prop: 'count', value: 42
    })
    expect(result).toContain('count={42}')
  })

  it('updateProp: returns unchanged source for unknown auraId', () => {
    const result = updateProp(FIXTURE, {
      file: 'page.tsx', line: 0, auraId: 'ghost-999',
      prop: 'heading', value: 'Test'
    })
    expect(result).toBe(FIXTURE)
  })

  it('updateStyle: replaces oldClass with newClass', () => {
    const result = updateStyle(FIXTURE, {
      file: 'page.tsx', line: 0, auraId: 'hero-001',
      oldClass: 'bg-blue-500', newClass: 'bg-red-500'
    })
    expect(result).toContain('bg-red-500')
    expect(result).not.toContain('bg-blue-500')
    // Other classes untouched
    expect(result).toContain('text-white')
  })

  it('updateChildren: replaces text content between opening and closing tag', () => {
    const result = updateChildren(FIXTURE, {
      file: 'page.tsx', line: 0, auraId: 'hero-001',
      value: 'New hero content'
    })
    expect(result).toContain('New hero content')
    expect(result).not.toContain('Hero content')
  })

  it('addClass: appends a class to className', () => {
    const result = addClass(FIXTURE, {
      file: 'page.tsx', line: 0, auraId: 'btn-001',
      className: 'rounded-lg'
    })
    expect(result).toContain('rounded-lg')
    expect(result).toContain('mt-4') // existing class preserved
  })

  it('addClass: creates className if absent', () => {
    const source = `<Foo data-aura-id="no-class" />`
    const result = addClass(source, {
      file: 'f.tsx', line: 0, auraId: 'no-class', className: 'flex'
    })
    expect(result).toContain('className="flex"')
  })

  it('removeClass: removes a specific class', () => {
    const result = removeClass(FIXTURE, {
      file: 'page.tsx', line: 0, auraId: 'hero-001',
      className: 'text-white'
    })
    expect(result).not.toContain('text-white')
    expect(result).toContain('bg-blue-500') // others preserved
  })
})

// ─── AuraIdService ────────────────────────────────────────────────────────────

describe('AuraIdService', () => {
  it('generate: produces a UUID-formatted string', () => {
    const id = generate()
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })

  it('generate: produces unique IDs on every call', () => {
    const ids = Array.from({ length: 100 }, generate)
    const unique = new Set(ids)
    expect(unique.size).toBe(100)
  })

  it('tag: injects data-aura-id onto untagged PascalCase components', () => {
    const source = `<Button variant="primary">Click</Button>`
    const tagged = tag(source)
    expect(tagged).toContain('data-aura-id=')
    const ids = collect(tagged)
    expect(ids).toHaveLength(1)
    expect(ids[0]).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('tag: does not re-tag already-tagged components', () => {
    const source = `<Button data-aura-id="existing-id" />`
    const tagged = tag(source)
    expect(collect(tagged)).toEqual(['existing-id'])
  })

  it('tag: skips lowercase intrinsic HTML tags by default', () => {
    const source = `<div className="wrapper"><span>text</span></div>`
    const tagged = tag(source)
    expect(collect(tagged)).toHaveLength(0)
    expect(tagged).toBe(source) // source unchanged
  })

  it('tag: tags intrinsic HTML tags when includeIntrinsic=true', () => {
    const source = `<div className="wrapper" />`
    const tagged = tag(source, true)
    expect(collect(tagged)).toHaveLength(1)
  })

  it('strip: removes all data-aura-id attributes', () => {
    const tagged = tag(`<Button /><Card />`)
    expect(collect(tagged)).toHaveLength(2)
    const stripped = strip(tagged)
    expect(collect(stripped)).toHaveLength(0)
    expect(stripped).not.toContain('data-aura-id')
  })

  it('collect: returns all aura ids from source', () => {
    const ids = collect(FIXTURE)
    expect(ids).toContain('hero-001')
    expect(ids).toContain('btn-001')
    expect(ids).toContain('text-001')
    expect(ids).toHaveLength(3)
  })
})
