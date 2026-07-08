import { describe, expect, it } from 'vitest'
import { ASTService } from './ast.service'

/**
 * ASTService Test Suite
 *
 * Tests the editor-layer facade that dispatches operations to the AST engine.
 * Tests that readSelection correctly extracts node data and that applyOp
 * correctly routes to the right ASTWriter function.
 */

// ─── Fixtures ──────────────────────────────────────────────────────────────

const EXAMPLE_SOURCE = `
import React from 'react'

export function Page() {
  return (
    <Layout data-aura-id="layout-001" className="bg-gray-50 min-h-screen">
      <Header
        data-aura-id="header-001"
        title="Welcome"
        className="bg-white shadow-sm p-4"
      >
        Header content
      </Header>
      <Button
        data-aura-id="button-001"
        label="Submit"
        disabled
        className="bg-blue-500 text-white px-4 py-2"
      />
      <TextInput data-aura-id="input-001" placeholder="Enter name" />
    </Layout>
  )
}
`

// ─── ASTService Tests ──────────────────────────────────────────────────────

describe('ASTService', () => {
  const service = new ASTService()

  describe('readSelection', () => {
    it('extracts all data for a selected node', () => {
      const selection = service.readSelection(EXAMPLE_SOURCE, 'header-001')
      expect(selection).not.toBeNull()
      expect(selection?.props['title']).toBe('Welcome')
      expect(selection?.classes).toContain('bg-white')
      expect(selection?.classes).toContain('shadow-sm')
      expect(selection?.classes).toContain('p-4')
      expect(selection?.line).toBeGreaterThan(0)
    })

    it('extracts boolean props correctly', () => {
      const selection = service.readSelection(EXAMPLE_SOURCE, 'button-001')
      expect(selection).not.toBeNull()
      expect(selection?.props['label']).toBe('Submit')
      expect(selection?.props['disabled']).toBe(true)
    })

    it('returns null when auraId not found', () => {
      const selection = service.readSelection(EXAMPLE_SOURCE, 'does-not-exist')
      expect(selection).toBeNull()
    })

    it('handles nodes with no className', () => {
      const selection = service.readSelection(EXAMPLE_SOURCE, 'input-001')
      expect(selection).not.toBeNull()
      expect(selection?.classes).toEqual([])
      expect(selection?.props['placeholder']).toBe('Enter name')
    })
  })

  describe('applyOp', () => {
    it('dispatches UpdatePropOperation to updateProp', () => {
      const result = service.applyOp(EXAMPLE_SOURCE, {
        file: 'page.tsx',
        line: 10,
        auraId: 'header-001',
        prop: 'title',
        value: 'New Title',
      })
      expect(result).toContain('title="New Title"')
      expect(result).not.toContain('title="Welcome"')
    })

    it('dispatches UpdateStyleOperation to updateStyle', () => {
      const result = service.applyOp(EXAMPLE_SOURCE, {
        file: 'page.tsx',
        line: 10,
        auraId: 'header-001',
        oldClass: 'bg-white',
        newClass: 'bg-slate-100',
      })
      expect(result).toContain('bg-slate-100')
      expect(result).not.toContain('bg-white')
      expect(result).toContain('shadow-sm') // others untouched
    })

    it('dispatches UpdateChildrenOperation to updateChildren', () => {
      const result = service.applyOp(EXAMPLE_SOURCE, {
        file: 'page.tsx',
        line: 10,
        auraId: 'header-001',
        value: 'New header content',
      })
      expect(result).toContain('New header content')
      expect(result).not.toContain('Header content')
    })

    it('dispatches AddClassOperation to addClass', () => {
      const result = service.applyOp(EXAMPLE_SOURCE, {
        file: 'page.tsx',
        line: 10,
        auraId: 'button-001',
        className: 'hover:bg-blue-600',
      })
      expect(result).toContain('hover:bg-blue-600')
      expect(result).toContain('bg-blue-500') // existing classes preserved
    })

    it('dispatches RemoveClassOperation (via remove flag) to removeClass', () => {
      const result = service.applyOp(EXAMPLE_SOURCE, {
        file: 'page.tsx',
        line: 10,
        auraId: 'header-001',
        className: 'shadow-sm',
        remove: true,
      })
      expect(result).not.toContain('shadow-sm')
      expect(result).toContain('bg-white') // others preserved
    })

    it('returns unchanged source for unknown auraId', () => {
      const result = service.applyOp(EXAMPLE_SOURCE, {
        file: 'page.tsx',
        line: 10,
        auraId: 'ghost-999',
        prop: 'title',
        value: 'Never applied',
      })
      expect(result).toBe(EXAMPLE_SOURCE)
    })

    it('handles non-string prop values correctly', () => {
      const result = service.applyOp(EXAMPLE_SOURCE, {
        file: 'page.tsx',
        line: 10,
        auraId: 'button-001',
        prop: 'count',
        value: 42,
      })
      expect(result).toContain('count={42}')
    })

    it('handles object/non-string prop values correctly', () => {
      const result = service.applyOp(EXAMPLE_SOURCE, {
        file: 'page.tsx',
        line: 10,
        auraId: 'button-001',
        prop: 'size',
        value: 100,
      })
      expect(result).toContain('size={100}')
    })

    it('returns source unchanged for unknown operation type', () => {
      // Pass an unknown operation discriminant
      const result = service.applyOp(EXAMPLE_SOURCE, {
        file: 'page.tsx',
        line: 10,
        auraId: 'header-001',
        unknownField: 'unknown',
      })
      expect(result).toBe(EXAMPLE_SOURCE)
    })
  })

  describe('integration: read → apply → read', () => {
    it('can read selection, apply change, and read back new value', () => {
      // 1. Read initial state
      const initial = service.readSelection(EXAMPLE_SOURCE, 'header-001')
      expect(initial?.props['title']).toBe('Welcome')

      // 2. Apply a change
      const updated = service.applyOp(EXAMPLE_SOURCE, {
        file: 'page.tsx',
        line: 10,
        auraId: 'header-001',
        prop: 'title',
        value: 'Updated',
      })

      // 3. Read back the new value
      const modified = service.readSelection(updated, 'header-001')
      expect(modified?.props['title']).toBe('Updated')
    })

    it('can apply multiple operations sequentially', () => {
      let current = EXAMPLE_SOURCE

      // Change title
      current = service.applyOp(current, {
        file: 'page.tsx',
        line: 10,
        auraId: 'header-001',
        prop: 'title',
        value: 'New Title',
      })
      expect(current).toContain('title="New Title"')

      // Add a class
      current = service.applyOp(current, {
        file: 'page.tsx',
        line: 10,
        auraId: 'header-001',
        className: 'border-b',
      })
      expect(current).toContain('border-b')

      // Remove a class
      current = service.applyOp(current, {
        file: 'page.tsx',
        line: 10,
        auraId: 'header-001',
        className: 'shadow-sm',
        remove: true,
      })
      expect(current).not.toContain('shadow-sm')

      // Verify final state
      const final = service.readSelection(current, 'header-001')
      expect(final?.props['title']).toBe('New Title')
      expect(final?.classes).toContain('border-b')
      expect(final?.classes).not.toContain('shadow-sm')
    })
  })
})
