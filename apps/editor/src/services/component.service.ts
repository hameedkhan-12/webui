import type { IAuraKernel, ComponentMeta, ComponentCategory } from '@repo/shared'

export class ComponentService {
  constructor(private readonly kernel: IAuraKernel) {}

  private getRegistry() {
    return this.kernel.get<ComponentMeta>('components')
  }

  getAll(): ComponentMeta[] {
    const registry = this.getRegistry()
    return registry.keys().map(key => registry.get(key)!).filter(Boolean)
  }

  getByCategory(category: ComponentCategory): ComponentMeta[] {
    return this.getAll().filter(meta => meta.category === category)
  }

  getByKey(name: string): ComponentMeta | undefined {
    return this.getRegistry().get(name)
  }

  search(query: string): ComponentMeta[] {
    const lowerQuery = query.toLowerCase()
    return this.getAll().filter(meta => 
      meta.name.toLowerCase().includes(lowerQuery) ||
      meta.displayName.toLowerCase().includes(lowerQuery) ||
      meta.description.toLowerCase().includes(lowerQuery) ||
      meta.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    )
  }
}
