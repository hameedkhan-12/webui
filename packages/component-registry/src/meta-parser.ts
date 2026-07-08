import type { ComponentMeta } from '@repo/shared'

export function parseComponentMetaFromSource(
  path: string,
  content: string,
): ComponentMeta | null {
  try {
    if (!/\.(js|jsx|ts|tsx)$/.test(path)) return null
    const exportPattern = /(?:export\s+(?:default\s+)?(?:function|class)|export\s+(?:const|let|var)\s+[A-Za-z0-9_]+\s*=)/
    if (!exportPattern.test(content)) return null

    const nameFromPath = path.split('/').pop()?.replace(/\.[^.]+$/, '') || 'UnnamedComponent'
    let name = nameFromPath

    // Try to infer a more specific exported name from source
    const m: RegExpMatchArray | null =
      content.match(/export\s+default\s+function\s+([A-Za-z0-9_]+)/) ||
      content.match(/export\s+function\s+([A-Za-z0-9_]+)/) ||
      content.match(/class\s+([A-Za-z0-9_]+)\s+/) ||
      content.match(/function\s+([A-Za-z0-9_]+)\s*\(/)
    if (m && m[1]) name = String(m[1])

    // Grab a short description from the first JSDoc or block comment
    const descMatch: RegExpMatchArray | null =
      content.match(/\/\*\*([\s\S]*?)\*\//) || content.match(/\/\*([\s\S]*?)\*\//)
    const description = descMatch && descMatch[1] ? String(descMatch[1]).replace(/\*\s?/g, '').trim().split('\n')[0] : ''

    const meta: ComponentMeta = {
      name,
      displayName: name,
      description: description || '',
      icon: '',
      category: 'layout',
      tags: [],
      slots: [],
      variants: [],
      events: [],
      permissions: [],
      documentation: '',
      aiHints: [],
      schemaKey: `${name}:schema`,
    }

    return meta
  } catch (e) {
    // never throw during parse — bridge must be resilient
    return null
  }
}
