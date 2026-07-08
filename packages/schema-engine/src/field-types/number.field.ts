import type { SchemaField } from '@repo/shared'

export function numberField(key: string, label: string, overrides?: Partial<SchemaField>): SchemaField {
  return {
    key,
    type: 'number',
    label,
    defaultValue: 0,
    ...overrides
  }
}
