import type { IAuraKernel, IRegistry, ComponentSchema, ComponentMeta } from '@repo/shared'
import { validate, textField, textareaField, booleanField } from '@aura/schema-engine'
import type { ValidationResult } from '@aura/schema-engine'

export class SchemaService {
  constructor(private readonly kernel: IAuraKernel) {}

  private getSchemaRegistry(): IRegistry<ComponentSchema> {
    return this.kernel.get<ComponentSchema>('schemas')
  }

  private getComponentRegistry(): IRegistry<ComponentMeta> {
    return this.kernel.get<ComponentMeta>('components')
  }

  /**
   * Get a registered schema for a component key.
   */
  getSchema(key: string): ComponentSchema | undefined {
    return this.getSchemaRegistry().get(key)
  }

  /**
   * Validate a data record against a schema key.
   * Returns null if schema is not found.
   */
  validateForKey(key: string, data: Record<string, unknown>): ValidationResult | null {
    const schema = this.getSchema(key)
    if (!schema) return null
    return validate(schema, data)
  }

  /**
   * Derive a basic schema from component metadata as a fallback
   * when no registered schema exists for the component.
   */
  deriveFromMeta(key: string): ComponentSchema | null {
    const meta = this.getComponentRegistry().get(key)
    if (!meta) return null

    // Heuristic: build basic editable fields from common categories
    const fields: ComponentSchema['fields'] = [
      textField('title', 'Title'),
      textareaField('description', 'Description'),
      booleanField('visible', 'Visible')
    ]

    return {
      key: meta.schemaKey,
      fields
    }
  }

  /**
   * Resolve schema for a given component key:
   * returns registered schema if available, otherwise derives from meta.
   */
  resolveForSelection(key: string): ComponentSchema | null {
    return this.getSchema(key) ?? this.deriveFromMeta(key)
  }
}
