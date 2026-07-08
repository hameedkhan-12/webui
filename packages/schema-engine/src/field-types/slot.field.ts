import type { SchemaField } from '@repo/shared'

export function slotField(key: string, label: string, overrides?: Partial<SchemaField>): SchemaField {
  return {
    key,
    type: 'slot',
    label,
    defaultValue: null,
    ...overrides
  }
}
