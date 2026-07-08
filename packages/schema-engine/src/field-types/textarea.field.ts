import type { SchemaField } from '@repo/shared'

export function textareaField(key: string, label: string, overrides?: Partial<SchemaField>): SchemaField {
  return {
    key,
    type: 'textarea',
    label,
    defaultValue: '',
    ...overrides
  }
}
