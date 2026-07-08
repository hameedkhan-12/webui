export interface ComponentSchema {
  readonly key: string
  readonly fields: readonly SchemaField[]
}

export type SchemaFieldType =
  | 'text'
  | 'textarea'
  | 'richtext'
  | 'number'
  | 'boolean'
  | 'color'
  | 'select'
  | 'image'
  | 'slot'
  | 'group'
  | 'array'
  | 'custom'

export interface SchemaField {
  readonly key: string
  readonly type: SchemaFieldType
  readonly label: string
  readonly description?: string
  readonly required?: boolean
  readonly defaultValue?: unknown
  readonly validation?: SchemaFieldValidation
  readonly options?: readonly SelectOption[]
  readonly tailwindMapping?: TailwindMapping
}

export interface SchemaFieldValidation {
  readonly min?: number
  readonly max?: number
  readonly pattern?: string
  readonly custom?: string
}

export interface SelectOption {
  readonly label: string
  readonly value: string
}

export interface TailwindMapping {
  readonly prefix: string
  readonly scale: readonly string[]
  readonly valueToClass: (value: unknown) => string
  readonly classToValue: (cls: string) => unknown
}
