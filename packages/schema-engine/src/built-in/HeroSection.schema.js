import { textField } from '../field-types/text.field.js';
import { textareaField } from '../field-types/textarea.field.js';
import { selectField } from '../field-types/select.field.js';
import { imageField } from '../field-types/image.field.js';
import { slotField } from '../field-types/slot.field.js';
export const HeroSectionSchema = {
    key: 'HeroSection',
    fields: [
        textField('heading', 'Heading', {
            required: true,
            description: 'Main heading text for the hero section',
            validation: { min: 1, max: 120 }
        }),
        textareaField('subheading', 'Subheading', {
            description: 'Supporting text displayed below the heading',
            validation: { max: 280 }
        }),
        selectField('variant', 'Layout Variant', [
            { label: 'Default', value: 'default' },
            { label: 'Centered', value: 'centered' },
            { label: 'Split', value: 'split' }
        ], {
            description: 'Visual layout style of the hero section'
        }),
        imageField('backgroundImage', 'Background Image', {
            description: 'Optional background image URL'
        }),
        slotField('cta', 'Call to Action Slot', {
            description: 'Slot for a CTA Button component'
        })
    ]
};
//# sourceMappingURL=HeroSection.schema.js.map