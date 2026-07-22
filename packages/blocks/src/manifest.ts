import type { ComponentMeta, ComponentSchema } from '@repo/shared';

export interface BlockManifestItem {
    readonly blockType: string;
    readonly meta: ComponentMeta;
    readonly schema: ComponentSchema;
    readonly defaultProps: Record<string, unknown>;
    readonly category: string;
    readonly displayName: string;
}

const buttonMeta: ComponentMeta = {
    name: 'Button',
    displayName: 'Button',
    description: 'A clickable button component',
    icon: 'button',
    category: 'form',
    tags: ['interactive', 'button'],
    slots: [],
    variants: ['primary', 'secondary', 'ghost'],
    events: [{ key: 'click', label: 'Click', description: 'Triggered when the button is clicked' }],
    permissions: [],
    documentation: 'Use this button to trigger actions or navigate pages.',
    aiHints: ['Prefer primary for primary actions, secondary for secondary ones.'],
    schemaKey: 'Button'
};

const buttonSchema: ComponentSchema = {
    key: 'Button',
    fields: [
        { key: 'label', type: 'text', label: 'Label', required: true, defaultValue: 'Click me' },
        {
            key: 'variant',
            type: 'select',
            label: 'Variant',
            defaultValue: 'primary',
            options: [
                { label: 'Primary', value: 'primary' },
                { label: 'Secondary', value: 'secondary' },
                { label: 'Ghost', value: 'ghost' }
            ]
        },
        { key: 'disabled', type: 'boolean', label: 'Disabled', defaultValue: false },
        { key: 'href', type: 'text', label: 'Link URL (Optional)', defaultValue: '' }
    ]
};

const textBlockMeta: ComponentMeta = {
    name: 'TextBlock',
    displayName: 'Text Block',
    description: 'A text block component',
    icon: 'text',
    category: 'typography',
    tags: ['typography', 'text'],
    slots: [],
    variants: ['default', 'lead', 'muted'],
    events: [],
    permissions: [],
    documentation: 'Use this text block for paragraphs, headings, or other text contents.',
    aiHints: ['Use lead variant for large intro text, muted for secondary/small captions.'],
    schemaKey: 'TextBlock'
};

const textBlockSchema: ComponentSchema = {
    key: 'TextBlock',
    fields: [
        { key: 'content', type: 'textarea', label: 'Content', required: true, defaultValue: 'Edit this text' },
        {
            key: 'variant',
            type: 'select',
            label: 'Variant',
            defaultValue: 'default',
            options: [
                { label: 'Default', value: 'default' },
                { label: 'Lead', value: 'lead' },
                { label: 'Muted', value: 'muted' }
            ]
        },
        { key: 'color', type: 'color', label: 'Text Color', defaultValue: '' }
    ]
};

const heroMeta: ComponentMeta = {
    name: 'Hero',
    displayName: 'Hero Section',
    description: 'A marketing hero block with a heading, description, and CTA button.',
    icon: 'layout-hero',
    category: 'marketing',
    tags: ['hero', 'marketing'],
    slots: [],
    variants: [],
    events: [],
    permissions: [],
    documentation: 'Use this to highlight the main call to action of the landing page.',
    aiHints: [],
    schemaKey: 'Hero'
};

const heroSchema: ComponentSchema = {
    key: 'Hero',
    fields: [
        { key: 'title', type: 'text', label: 'Title', required: true, defaultValue: 'Welcome to Aura' },
        { key: 'subtitle', type: 'text', label: 'Subtitle', defaultValue: 'Build beautiful interfaces visually' },
        { key: 'ctaLabel', type: 'text', label: 'CTA Label', defaultValue: 'Get Started' }
    ]
};

const sectionMeta: ComponentMeta = {
    name: 'Section',
    displayName: 'Section',
    description: 'A full-width layout region used to group and separate page content.',
    icon: 'layout-section',
    category: 'layout',
    tags: ['layout', 'container', 'wrapper'],
    slots: [{ key: 'children', label: 'Content', accepts: ['*'], required: false }],
    variants: ['default', 'muted', 'dark'],
    events: [],
    permissions: [],
    documentation: 'Use this to wrap a group of blocks that should share a background and vertical rhythm.',
    aiHints: ['Use dark or muted background to visually separate alternating page sections.'],
    schemaKey: 'Section'
};

const sectionSchema: ComponentSchema = {
    key: 'Section',
    fields: [
        {
            key: 'background',
            type: 'select',
            label: 'Background',
            defaultValue: 'default',
            options: [
                { label: 'Default', value: 'default' },
                { label: 'Muted', value: 'muted' },
                { label: 'Dark', value: 'dark' }
            ]
        },
        {
            key: 'padding',
            type: 'select',
            label: 'Padding',
            defaultValue: 'md',
            options: [
                { label: 'Small', value: 'sm' },
                { label: 'Medium', value: 'md' },
                { label: 'Large', value: 'lg' }
            ]
        }
    ]
};

const containerMeta: ComponentMeta = {
    name: 'Container',
    displayName: 'Container',
    description: 'Centers and constrains content to a maximum width.',
    icon: 'layout-container',
    category: 'layout',
    tags: ['layout', 'container'],
    slots: [{ key: 'children', label: 'Content', accepts: ['*'], required: false }],
    variants: [],
    events: [],
    permissions: [],
    documentation: 'Wrap page content in a Container to keep it readable on wide screens.',
    aiHints: ['Nest inside a Section to combine background color with content width constraints.'],
    schemaKey: 'Container'
};

const containerSchema: ComponentSchema = {
    key: 'Container',
    fields: [
        {
            key: 'maxWidth',
            type: 'select',
            label: 'Max Width',
            defaultValue: 'lg',
            options: [
                { label: 'Small', value: 'sm' },
                { label: 'Medium', value: 'md' },
                { label: 'Large', value: 'lg' },
                { label: 'Extra Large', value: 'xl' },
                { label: 'Full', value: 'full' }
            ]
        }
    ]
};

const gridMeta: ComponentMeta = {
    name: 'Grid',
    displayName: 'Grid',
    description: 'Arranges child blocks into a responsive multi-column grid.',
    icon: 'layout-grid',
    category: 'layout',
    tags: ['layout', 'grid'],
    slots: [{ key: 'children', label: 'Items', accepts: ['*'], required: false }],
    variants: [],
    events: [],
    permissions: [],
    documentation: 'Use for card grids, feature lists, or any repeated layout.',
    aiHints: ['Pair with Card blocks as children for feature/pricing/testimonial grids.'],
    schemaKey: 'Grid'
};

const gridSchema: ComponentSchema = {
    key: 'Grid',
    fields: [
        {
            key: 'columns',
            type: 'select',
            label: 'Columns',
            defaultValue: 2,
            options: [
                { label: '1', value: '1' },
                { label: '2', value: '2' },
                { label: '3', value: '3' },
                { label: '4', value: '4' }
            ]
        },
        {
            key: 'gap',
            type: 'select',
            label: 'Gap',
            defaultValue: 'md',
            options: [
                { label: 'Small', value: 'sm' },
                { label: 'Medium', value: 'md' },
                { label: 'Large', value: 'lg' }
            ]
        }
    ]
};

const cardMeta: ComponentMeta = {
    name: 'Card',
    displayName: 'Card',
    description: 'A bordered content card with an optional image, title, and description.',
    icon: 'square',
    category: 'data',
    tags: ['card', 'content'],
    slots: [{ key: 'children', label: 'Extra Content', accepts: ['*'], required: false }],
    variants: ['default', 'elevated'],
    events: [],
    permissions: [],
    documentation: 'Use for feature highlights, team members, blog previews, or pricing tiers.',
    aiHints: ['Place multiple Cards inside a Grid to build feature or pricing sections.'],
    schemaKey: 'Card'
};

const cardSchema: ComponentSchema = {
    key: 'Card',
    fields: [
        { key: 'title', type: 'text', label: 'Title', required: true, defaultValue: 'Card title' },
        { key: 'description', type: 'textarea', label: 'Description', defaultValue: '' },
        { key: 'imageUrl', type: 'image', label: 'Image', defaultValue: '' },
        { key: 'elevated', type: 'boolean', label: 'Elevated Shadow', defaultValue: false }
    ]
};

const imageMeta: ComponentMeta = {
    name: 'Image',
    displayName: 'Image',
    description: 'Displays an image with configurable aspect ratio and corner rounding.',
    icon: 'image',
    category: 'media',
    tags: ['media', 'image'],
    slots: [],
    variants: [],
    events: [],
    permissions: [],
    documentation: 'Always set descriptive alt text for accessibility.',
    aiHints: ['Use aspect ratio "video" for hero/banner images, "square" for avatars/thumbnails.'],
    schemaKey: 'Image'
};

const imageSchema: ComponentSchema = {
    key: 'Image',
    fields: [
        { key: 'src', type: 'image', label: 'Source', required: true, defaultValue: '' },
        { key: 'alt', type: 'text', label: 'Alt Text', required: true, defaultValue: '' },
        {
            key: 'aspectRatio',
            type: 'select',
            label: 'Aspect Ratio',
            defaultValue: 'auto',
            options: [
                { label: 'Auto', value: 'auto' },
                { label: 'Square', value: 'square' },
                { label: 'Video (16:9)', value: 'video' }
            ]
        },
        { key: 'rounded', type: 'boolean', label: 'Rounded Corners', defaultValue: false }
    ]
};

const navMeta: ComponentMeta = {
    name: 'Nav',
    displayName: 'Navigation Bar',
    description: 'A top-of-page navigation bar with a brand label and links.',
    icon: 'menu',
    category: 'navigation',
    tags: ['navigation', 'header'],
    slots: [],
    variants: [],
    events: [],
    permissions: [],
    documentation: 'Typically placed once, at the top of a page.',
    aiHints: ['Only one Nav per page. Keep links to 3-6 items.'],
    schemaKey: 'Nav'
};

const navSchema: ComponentSchema = {
    key: 'Nav',
    fields: [
        { key: 'brand', type: 'text', label: 'Brand Label', defaultValue: 'Brand' },
        {
            key: 'links',
            type: 'array',
            label: 'Links',
            defaultValue: [
                { label: 'Home', href: '/' },
                { label: 'About', href: '/about' }
            ]
        }
    ]
};

const footerMeta: ComponentMeta = {
    name: 'Footer',
    displayName: 'Footer',
    description: 'A bottom-of-page footer with copyright text and links.',
    icon: 'layout-footer',
    category: 'navigation',
    tags: ['navigation', 'footer'],
    slots: [],
    variants: [],
    events: [],
    permissions: [],
    documentation: 'Typically placed once, at the bottom of a page.',
    aiHints: ['Only one Footer per page.'],
    schemaKey: 'Footer'
};

const footerSchema: ComponentSchema = {
    key: 'Footer',
    fields: [
        {
            key: 'copyrightText',
            type: 'text',
            label: 'Copyright Text',
            defaultValue: '© Your Company. All rights reserved.'
        },
        { key: 'links', type: 'array', label: 'Links', defaultValue: [] }
    ]
};

const formMeta: ComponentMeta = {
    name: 'Form',
    displayName: 'Form',
    description: 'A simple form with configurable fields and a submit button.',
    icon: 'clipboard-list',
    category: 'form',
    tags: ['form', 'input'],
    slots: [],
    variants: [],
    events: [{ key: 'submit', label: 'Submit', description: 'Triggered when the form is submitted' }],
    permissions: [],
    documentation: 'Use for contact forms, newsletter signups, and lead capture.',
    aiHints: ['Keep forms short -- 2-4 fields converts best for contact/signup use cases.'],
    schemaKey: 'Form'
};

const formSchema: ComponentSchema = {
    key: 'Form',
    fields: [
        { key: 'title', type: 'text', label: 'Title', defaultValue: '' },
        {
            key: 'fields',
            type: 'array',
            label: 'Fields',
            defaultValue: [
                { label: 'Name', placeholder: 'Your name', type: 'text' },
                { label: 'Email', placeholder: 'you@example.com', type: 'email' }
            ]
        },
        { key: 'submitLabel', type: 'text', label: 'Submit Button Label', defaultValue: 'Submit' }
    ]
};

const spacerMeta: ComponentMeta = {
    name: 'Spacer',
    displayName: 'Spacer',
    description: 'An invisible block that adds vertical space between other blocks.',
    icon: 'move-vertical',
    category: 'layout',
    tags: ['layout', 'spacing'],
    slots: [],
    variants: [],
    events: [],
    permissions: [],
    documentation: 'Use to fine-tune vertical rhythm without adding padding to neighboring blocks.',
    aiHints: ['Prefer Section padding over Spacer where possible; reach for Spacer for one-off gaps.'],
    schemaKey: 'Spacer'
};

const spacerSchema: ComponentSchema = {
    key: 'Spacer',
    fields: [
        {
            key: 'size',
            type: 'select',
            label: 'Size',
            defaultValue: 'md',
            options: [
                { label: 'Small', value: 'sm' },
                { label: 'Medium', value: 'md' },
                { label: 'Large', value: 'lg' },
                { label: 'Extra Large', value: 'xl' }
            ]
        }
    ]
};

export const BLOCK_MANIFEST: readonly BlockManifestItem[] = [
    {
        blockType: 'Button',
        displayName: 'Button',
        category: 'Interactive',
        defaultProps: { label: 'Click me', variant: 'primary' },
        meta: buttonMeta,
        schema: buttonSchema
    },
    {
        blockType: 'TextBlock',
        displayName: 'Text',
        category: 'Typography',
        defaultProps: { tag: 'p', text: 'Edit this text' },
        meta: textBlockMeta,
        schema: textBlockSchema
    },
    {
        blockType: 'Hero',
        displayName: 'Hero Section',
        category: 'Marketing',
        defaultProps: { title: 'Welcome to Aura', subtitle: 'Build beautiful interfaces visually', ctaLabel: 'Get Started' },
        meta: heroMeta,
        schema: heroSchema
    },
    {
        blockType: 'Section',
        displayName: 'Section',
        category: 'Layout',
        defaultProps: { background: 'default', padding: 'md' },
        meta: sectionMeta,
        schema: sectionSchema
    },
    {
        blockType: 'Container',
        displayName: 'Container',
        category: 'Layout',
        defaultProps: { maxWidth: 'lg' },
        meta: containerMeta,
        schema: containerSchema
    },
    {
        blockType: 'Grid',
        displayName: 'Grid',
        category: 'Layout',
        defaultProps: { columns: 2, gap: 'md' },
        meta: gridMeta,
        schema: gridSchema
    },
    {
        blockType: 'Card',
        displayName: 'Card',
        category: 'Data',
        defaultProps: { title: 'Card title' },
        meta: cardMeta,
        schema: cardSchema
    },
    {
        blockType: 'Image',
        displayName: 'Image',
        category: 'Media',
        defaultProps: { src: '', alt: '' },
        meta: imageMeta,
        schema: imageSchema
    },
    {
        blockType: 'Nav',
        displayName: 'Navigation Bar',
        category: 'Navigation',
        defaultProps: { brand: 'Brand', links: [] },
        meta: navMeta,
        schema: navSchema
    },
    {
        blockType: 'Footer',
        displayName: 'Footer',
        category: 'Navigation',
        defaultProps: { copyrightText: '© Your Company. All rights reserved.', links: [] },
        meta: footerMeta,
        schema: footerSchema
    },
    {
        blockType: 'Form',
        displayName: 'Form',
        category: 'Form',
        defaultProps: { fields: [], submitLabel: 'Submit' },
        meta: formMeta,
        schema: formSchema
    },
    {
        blockType: 'Spacer',
        displayName: 'Spacer',
        category: 'Layout',
        defaultProps: { size: 'md' },
        meta: spacerMeta,
        schema: spacerSchema
    }
];
