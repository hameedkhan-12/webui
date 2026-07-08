import type { SchemaField } from '@repo/shared'

export function textField(key: string, label: string, overrides?: Partial<SchemaField>): SchemaField {
  return {
    key,
    type: 'text',
    label,
    defaultValue: '',
    ...overrides
  }
}
