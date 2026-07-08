import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import type { Plugin } from 'vite'
import { parse } from '@babel/parser'
import * as traverseModule from '@babel/traverse'
import * as generateModule from '@babel/generator'
import * as t from '@babel/types'

// Get the traverse and generate functions
const traverse = (traverseModule.default || traverseModule) as any
const generate = (generateModule.default || generateModule) as any

/** Options for the Aura Vite plugin */
export interface AuraPluginOptions {
  /** Root directory for the project (default: process.cwd()) */
  root?: string
  /** Directory to store registry (default: .aura) */
  registryDir?: string
}

/** Registry entry mapping aura-id to metadata */
interface RegistryEntry {
  file: string
  line: number
  componentName: string
}

/** Aura ID generator */
function generateAuraId(filePath: string, lineNumber: number, componentName: string): string {
  const key = `${filePath}:${lineNumber}:${componentName}`
  const hash = crypto.createHash('sha256').update(key).digest('hex')
  return hash.slice(0, 8)
}

/** Parse JSX source code using Babel */
function parseJsx(source: string, filePath: string): { ast: t.File; source: string } | null {
  try {
    const ast = parse(source, {
      sourceType: 'module',
      plugins: [
        'jsx',
        'typescript',
        ['decorators', { decoratorsBeforeExport: false }],
        'classProperties',
        'classPrivateProperties',
        'classPrivateMethods',
        ['pipelineOperator', { proposal: 'minimal' }],
        'logicalAssignment',
        'partialApplication',
        ['recordAndTuple', { syntaxType: 'hash' }],
        'asyncGenerators',
        'bigInt',
        'optionalChaining',
        'nullishCoalescingOperator',
      ] as any,
    })
    return { ast, source }
  } catch {
    return null
  }
}

/** Check if element already has data-aura-id */
function hasAuraId(node: t.JSXOpeningElement): boolean {
  return node.attributes.some(
    (attr) =>
      t.isJSXAttribute(attr) &&
      t.isJSXIdentifier(attr.name) &&
      attr.name.name === 'data-aura-id'
  )
}

/** Get component name from JSX element */
function getComponentName(node: t.JSXOpeningElement): string {
  if (t.isJSXIdentifier(node.name)) {
    return node.name.name
  }
  if (t.isJSXMemberExpression(node.name)) {
    const parts: string[] = []
    let current: any = node.name
    while (t.isJSXMemberExpression(current)) {
      if (t.isJSXIdentifier(current.property)) {
        parts.unshift(current.property.name)
      }
      current = current.object
    }
    if (t.isJSXIdentifier(current)) {
      parts.unshift(current.name)
    }
    return parts.join('.')
  }
  if (t.isJSXFragment(node.name)) {
    return 'Fragment'
  }
  return 'Unknown'
}

/** Add aura attributes to JSX opening element */
function addAuraAttributes(
  node: t.JSXOpeningElement,
  auraId: string,
  filePath: string,
  line: number,
  componentName: string
): void {
  node.attributes.push(
    t.jsxAttribute(t.jsxIdentifier('data-aura-id'), t.stringLiteral(auraId)),
    t.jsxAttribute(t.jsxIdentifier('data-aura-file'), t.stringLiteral(filePath)),
    t.jsxAttribute(t.jsxIdentifier('data-aura-line'), t.stringLiteral(line.toString())),
    t.jsxAttribute(t.jsxIdentifier('data-aura-component'), t.stringLiteral(componentName))
  )
}

/** Transform JSX source to inject aura attributes */
function transformJsx(
  source: string,
  filePath: string,
  registry: Map<string, RegistryEntry>
): string {
  const parseResult = parseJsx(source, filePath)
  if (!parseResult) return source

  const { ast } = parseResult

  traverse(ast, {
    JSXOpeningElement: {
      enter(elementPath: any) {
        const element = elementPath.node as t.JSXOpeningElement

        // Skip if already has aura-id
        if (hasAuraId(element)) {
          return
        }

        // Get line number
        const line = element.loc?.start.line ?? 0

        // Get component name
        const componentName = getComponentName(element)

        // Generate aura-id
        const auraId = generateAuraId(filePath, line, componentName)

        // Add aura attributes
        addAuraAttributes(element, auraId, filePath, line, componentName)

        // Add to registry
        registry.set(auraId, { file: filePath, line, componentName })
      },
    },
  })

  const result = generate(ast, { retainLines: true })
  const code = typeof result === 'string' ? result : result.code
  return code
}

/** Save registry to disk */
function saveRegistry(registryPath: string, registry: Map<string, RegistryEntry>): void {
  const registryDir = path.dirname(registryPath)

  // Ensure directory exists
  if (!fs.existsSync(registryDir)) {
    fs.mkdirSync(registryDir, { recursive: true })
  }

  // Convert map to object for JSON serialization
  const registryObject: Record<string, RegistryEntry> = Object.fromEntries(registry)

  fs.writeFileSync(registryPath, JSON.stringify(registryObject, null, 2))
}

/** Aura Vite Plugin */
export function vitePluginAura(options: AuraPluginOptions = {}): Plugin {
  const root = options.root ?? process.cwd()
  const registryDir = options.registryDir ?? '.aura'
  const registryPath = path.join(root, registryDir, 'registry.json')

  // Load existing registry if it exists
  const registry = new Map<string, RegistryEntry>()
  if (fs.existsSync(registryPath)) {
    try {
      const registryData = JSON.parse(fs.readFileSync(registryPath, 'utf-8'))
      Object.entries(registryData).forEach(([id, entry]: [string, any]) => {
        registry.set(id, entry as RegistryEntry)
      })
    } catch {
      // Ignore errors loading existing registry
    }
  }

  return {
    name: 'vite-plugin-aura',
    apply: 'serve', // Only in dev mode
    enforce: 'pre', // Run before other plugins

    transform(code, id) {
      // Skip files in node_modules
      if (id.includes('node_modules')) {
        return null
      }

      // Skip files in .aura directory
      if (id.includes(path.sep + registryDir + path.sep) || id.includes(`/${registryDir}/`)) {
        return null
      }

      // Only transform .tsx and .jsx files
      if (!id.endsWith('.tsx') && !id.endsWith('.jsx')) {
        return null
      }

      // Transform and collect registry entries
      const transformedCode = transformJsx(code, id, registry)

      // Save registry after each transformation
      saveRegistry(registryPath, registry)

      if (transformedCode !== code) {
        return {
          code: transformedCode,
          map: null, // SourceMap not implemented yet
        }
      }

      return null
    },
  }
}



