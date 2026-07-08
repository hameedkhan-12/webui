import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { vitePluginAura, type AuraPluginOptions } from './vite-plugin-aura.js'

describe('vitePluginAura', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aura-plugin-'))
  })

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true })
    }
  })

  describe('plugin creation', () => {
    it('should create a plugin with required fields', () => {
      const plugin = vitePluginAura()
      expect(plugin).toBeDefined()
      expect(plugin.name).toBe('vite-plugin-aura')
      expect(plugin.apply).toBe('serve')
      expect(plugin.enforce).toBe('pre')
      expect(plugin.transform).toBeDefined()
    })

    it('should accept options', () => {
      const options: AuraPluginOptions = {
        root: tmpDir,
        registryDir: 'custom-aura',
      }
      const plugin = vitePluginAura(options)
      expect(plugin).toBeDefined()
    })
  })

  describe('JSX transformation', () => {
    it('should inject aura attributes into JSX elements', () => {
      const plugin = vitePluginAura({ root: tmpDir })
      const filePath = path.join(tmpDir, 'test.tsx')
      const transformFn = (plugin.transform as any).handler || plugin.transform

      const input = `
        export function MyComponent() {
          return <div>Hello</div>
        }
      `

      const result = transformFn.call(null, input, filePath) as any
      expect(result).not.toBeNull()
      expect(result!.code).toContain('data-aura-id')
      expect(result!.code).toContain('data-aura-file')
      expect(result!.code).toContain('data-aura-line')
      expect(result!.code).toContain('data-aura-component')
    })

    it('should inject aura-id for multiple elements', () => {
      const plugin = vitePluginAura({ root: tmpDir })
      const filePath = path.join(tmpDir, 'test.tsx')

      const input = `
        export function MyComponent() {
          return (
            <div>
              <span>Text</span>
              <p>Paragraph</p>
            </div>
          )
        }
      `

      const result = plugin.transform!(input, filePath)
      expect(result).not.toBeNull()
      // Should have multiple data-aura-id attributes (one for each JSX element)
      const matches = (result!.code.match(/data-aura-id/g) || []) as RegExpMatchArray
      expect(matches.length).toBeGreaterThanOrEqual(3) // div, span, p
    })

    it('should not inject aura attributes if already present', () => {
      const plugin = vitePluginAura({ root: tmpDir })
      const filePath = path.join(tmpDir, 'test.tsx')

      const input = `
        export function MyComponent() {
          return <div data-aura-id="existing-id">Hello</div>
        }
      `

      const result = plugin.transform!(input, filePath)
      // Should not duplicate aura attributes
      const codeCount = (result!.code.match(/data-aura-id="existing-id"/g) || []).length
      expect(codeCount).toBe(1)
    })

    it('should handle named imports', () => {
      const plugin = vitePluginAura({ root: tmpDir })
      const filePath = path.join(tmpDir, 'test.tsx')

      const input = `
        import { Component } from 'react'
        export function MyComponent() {
          return <Component />
        }
      `

      const result = plugin.transform!(input, filePath)
      expect(result).not.toBeNull()
      expect(result!.code).toContain('data-aura-id')
    })

    it('should handle JSX member expressions', () => {
      const plugin = vitePluginAura({ root: tmpDir })
      const filePath = path.join(tmpDir, 'test.tsx')

      const input = `
        export function MyComponent() {
          return <Form.Input />
        }
      `

      const result = plugin.transform!(input, filePath)
      expect(result).not.toBeNull()
      expect(result!.code).toContain('data-aura-component')
    })

    it('should preserve original code when no JSX present', () => {
      const plugin = vitePluginAura({ root: tmpDir })
      const filePath = path.join(tmpDir, 'test.ts')

      const input = 'export const value = 42'
      const result = plugin.transform!(input, filePath)
      // Should not transform non-JSX files
      expect(result).toBeNull()
    })

    it('should handle fragments', () => {
      const plugin = vitePluginAura({ root: tmpDir })
      const filePath = path.join(tmpDir, 'test.tsx')

      const input = `
        export function MyComponent() {
          return (
            <>
              <div>Item 1</div>
              <div>Item 2</div>
            </>
          )
        }
      `

      const result = plugin.transform!(input, filePath)
      expect(result).not.toBeNull()
      expect(result!.code).toContain('data-aura-id')
    })

    it('should handle self-closing elements', () => {
      const plugin = vitePluginAura({ root: tmpDir })
      const filePath = path.join(tmpDir, 'test.tsx')

      const input = `
        export function MyComponent() {
          return <input type="text" />
        }
      `

      const result = plugin.transform!(input, filePath)
      expect(result).not.toBeNull()
      expect(result!.code).toContain('data-aura-id')
    })
  })

  describe('file filtering', () => {
    it('should only transform .tsx files', () => {
      const plugin = vitePluginAura({ root: tmpDir })

      const tsxResult = plugin.transform!('<div />', path.join(tmpDir, 'test.tsx'), {})
      expect(tsxResult).not.toBeNull()
    })

    it('should only transform .jsx files', () => {
      const plugin = vitePluginAura({ root: tmpDir })

      const jsxResult = plugin.transform!('<div />', path.join(tmpDir, 'test.jsx'), {})
      expect(jsxResult).not.toBeNull()
    })

    it('should not transform .ts files', () => {
      const plugin = vitePluginAura({ root: tmpDir })

      const tsResult = plugin.transform!('export const x = 1', path.join(tmpDir, 'test.ts'), {})
      expect(tsResult).toBeNull()
    })

    it('should not transform .js files', () => {
      const plugin = vitePluginAura({ root: tmpDir })

      const jsResult = plugin.transform!('export const x = 1', path.join(tmpDir, 'test.js'), {})
      expect(jsResult).toBeNull()
    })

    it('should not transform node_modules files', () => {
      const plugin = vitePluginAura({ root: tmpDir })
      const filePath = path.join(tmpDir, 'node_modules', 'some-package', 'index.tsx')

      const result = plugin.transform!('<div />', filePath, {})
      expect(result).toBeNull()
    })

    it('should not transform files in registry directory', () => {
      const plugin = vitePluginAura({ root: tmpDir, registryDir: '.aura' })
      const filePath = path.join(tmpDir, '.aura', 'registry.json.tsx')

      const result = plugin.transform!('<div />', filePath, {})
      expect(result).toBeNull()
    })
  })

  describe('registry generation', () => {
    it('should generate registry.json with aura mappings', () => {
      const plugin = vitePluginAura({ root: tmpDir })
      const filePath = path.join(tmpDir, 'test.tsx')

      const input = `
        export function MyComponent() {
          return <div>Hello</div>
        }
      `

      plugin.transform!(input, filePath)

      const registryPath = path.join(tmpDir, '.aura', 'registry.json')
      expect(fs.existsSync(registryPath)).toBe(true)

      const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'))
      expect(Object.keys(registry).length).toBeGreaterThan(0)
    })

    it('should create .aura directory if it does not exist', () => {
      const plugin = vitePluginAura({ root: tmpDir })
      const filePath = path.join(tmpDir, 'test.tsx')

      const input = '<div />'
      plugin.transform!(input, filePath)

      const auraDir = path.join(tmpDir, '.aura')
      expect(fs.existsSync(auraDir)).toBe(true)
    })

    it('should persist registry across multiple transforms', () => {
      const plugin = vitePluginAura({ root: tmpDir })

      const file1 = path.join(tmpDir, 'test1.tsx')
      plugin.transform!('<div />', file1)

      const registryPath = path.join(tmpDir, '.aura', 'registry.json')
      const registry1 = JSON.parse(fs.readFileSync(registryPath, 'utf-8'))
      const count1 = Object.keys(registry1).length

      const file2 = path.join(tmpDir, 'test2.tsx')
      plugin.transform!('<span />', file2)

      const registry2 = JSON.parse(fs.readFileSync(registryPath, 'utf-8'))
      const count2 = Object.keys(registry2).length

      expect(count2).toBeGreaterThanOrEqual(count1)
    })

    it('should use custom registry directory', () => {
      const customDir = 'custom-registry'
      const plugin = vitePluginAura({ root: tmpDir, registryDir: customDir })
      const filePath = path.join(tmpDir, 'test.tsx')

      plugin.transform!('<div />', filePath)

      const registryPath = path.join(tmpDir, customDir, 'registry.json')
      expect(fs.existsSync(registryPath)).toBe(true)
    })
  })

  describe('deterministic aura-ids', () => {
    it('should generate same aura-id for same file:line:component', () => {
      const plugin1 = vitePluginAura({ root: tmpDir })
      const plugin2 = vitePluginAura({ root: tmpDir })

      const filePath = path.join(tmpDir, 'test.tsx')
      const input = '<MyComponent />'

      const result1 = plugin1.transform!(input, filePath)
      const result2 = plugin2.transform!(input, filePath)

      // Extract aura-id from both results (they should be identical)
      const idMatch1 = result1!.code.match(/data-aura-id="([^"]+)"/)
      const idMatch2 = result2!.code.match(/data-aura-id="([^"]+)"/)

      expect(idMatch1).not.toBeNull()
      expect(idMatch2).not.toBeNull()
      expect(idMatch1![1]).toBe(idMatch2![1])
    })

    it('should generate different aura-ids for different lines', () => {
      const plugin = vitePluginAura({ root: tmpDir })
      const filePath = path.join(tmpDir, 'test.tsx')

      const input = `
        export function MyComponent() {
          return (
            <div>
              <span>1</span>
              <span>2</span>
            </div>
          )
        }
      `

      const result = plugin.transform!(input, filePath)
      const code = result!.code

      // Extract all aura-ids
      const ids = (code.match(/data-aura-id="([^"]+)"/g) || []).map((m) =>
        m.replace(/data-aura-id="|"/g, '')
      )

      // Should have multiple different ids
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBeGreaterThanOrEqual(2)
    })
  })

  describe('aura attribute values', () => {
    it('should include file path in data-aura-file', () => {
      const plugin = vitePluginAura({ root: tmpDir })
      const filePath = path.join(tmpDir, 'test.tsx')

      const input = '<div />'
      const result = plugin.transform!(input, filePath)

      // Handle both escaped and unescaped backslashes
      const expectedPattern = filePath.replace(/\\/g, '\\\\')
      expect(result!.code).toContain(`data-aura-file="`)
      expect(result!.code).toContain('test.tsx')
    })

    it('should include line number in data-aura-line', () => {
      const plugin = vitePluginAura({ root: tmpDir })
      const filePath = path.join(tmpDir, 'test.tsx')

      const input = `<div>
        content here
      </div>`

      const result = plugin.transform!(input, filePath)

      expect(result!.code).toContain('data-aura-line')
    })

    it('should include component name in data-aura-component', () => {
      const plugin = vitePluginAura({ root: tmpDir })
      const filePath = path.join(tmpDir, 'test.tsx')

      const input = '<MyCustomComponent />'
      const result = plugin.transform!(input, filePath)

      expect(result!.code).toContain('data-aura-component="MyCustomComponent"')
    })

    it('should handle lowercase component names (HTML elements)', () => {
      const plugin = vitePluginAura({ root: tmpDir })
      const filePath = path.join(tmpDir, 'test.tsx')

      const input = '<div />'
      const result = plugin.transform!(input, filePath)

      expect(result!.code).toContain('data-aura-component="div"')
    })
  })

  describe('edge cases', () => {
    it('should handle deeply nested JSX', () => {
      const plugin = vitePluginAura({ root: tmpDir })
      const filePath = path.join(tmpDir, 'test.tsx')

      const input = `
        <div>
          <div>
            <div>
              <span>Deep content</span>
            </div>
          </div>
        </div>
      `

      const result = plugin.transform!(input, filePath)
      expect(result).not.toBeNull()
      const idCount = (result!.code.match(/data-aura-id/g) || []).length
      expect(idCount).toBeGreaterThanOrEqual(4)
    })

    it('should handle JSX with attributes', () => {
      const plugin = vitePluginAura({ root: tmpDir })
      const filePath = path.join(tmpDir, 'test.tsx')

      const input = '<button className="btn" onClick={handleClick}>Click me</button>'
      const result = plugin.transform!(input, filePath)

      expect(result).not.toBeNull()
      expect(result!.code).toContain('className="btn"')
      expect(result!.code).toContain('onClick={handleClick}')
      expect(result!.code).toContain('data-aura-id')
    })

    it('should handle JSX spread attributes', () => {
      const plugin = vitePluginAura({ root: tmpDir })
      const filePath = path.join(tmpDir, 'test.tsx')

      const input = '<div {...props} />'
      const result = plugin.transform!(input, filePath)

      expect(result).not.toBeNull()
      expect(result!.code).toContain('...props')
      expect(result!.code).toContain('data-aura-id')
    })

    it('should return null when code is unchanged', () => {
      const plugin = vitePluginAura({ root: tmpDir })
      const filePath = path.join(tmpDir, 'test.ts')

      const input = 'export const value = 42'
      const result = plugin.transform!(input, filePath)

      expect(result).toBeNull()
    })

    it('should handle invalid JSX gracefully', () => {
      const plugin = vitePluginAura({ root: tmpDir })
      const filePath = path.join(tmpDir, 'test.tsx')

      const input = '<div>Unclosed tag'
      const result = plugin.transform!(input, filePath)

      // Should handle gracefully (either parse it or return null)
      // Babel parser may be lenient or strict - just ensure no crash
      expect(result === null || result !== undefined).toBe(true)
    })
  })
})
