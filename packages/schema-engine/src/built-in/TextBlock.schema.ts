import type { ComponentSchema } from '@repo/shared'
import { richtextField } from '../field-types/richtext.field.js'
import { selectField } from '../field-types/select.field.js'
import { colorField } from '../field-types/color.field.js'

export const TextBlockSchema: ComponentSchema = {
  key: 'TextBlock',
  fields: [
    richtextField('content', 'Content', {
      required: true,
      description: 'Rich text content of the block'
    }),
    selectField('variant', 'Typography Variant', [
      { label: 'Default', value: 'default' },
      { label: 'Lead', value: 'lead' },
      { label: 'Muted', value: 'muted' }
    ], {
      description: 'Controls the visual weight and sizing of the text'
    }),
    colorField('color', 'Text Color', {
      description: 'Override color for the text block'
    })
  ]
}
