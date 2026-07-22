import type { ComponentMeta, ComponentSchema } from '@repo/shared';
import type { BlockDefinition, BlockProps, TextBlockProps } from './types.js';
import { Button } from './Button.js';
import type { ButtonProps } from './Button.js';
import { TextBlock } from './TextBlock.js';
import { Hero } from './Hero.js';
import type { HeroProps } from './Hero.js';
import { Section } from './Section.js';
import type { SectionProps } from './Section.js';
import { Container } from './Container.js';
import type { ContainerProps } from './Container.js';
import { Grid } from './Grid.js';
import type { GridProps } from './Grid.js';
import { Card } from './Card.js';
import type { CardProps } from './Card.js';
import { Image } from './Image.js';
import type { ImageProps } from './Image.js';
import { Nav } from './Nav.js';
import type { NavProps } from './Nav.js';
import { Footer } from './Footer.js';
import type { FooterProps } from './Footer.js';
import { Form } from './Form.js';
import type { FormProps } from './Form.js';
import { Spacer } from './Spacer.js';
import type { SpacerProps } from './Spacer.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _registry = new Map<string, BlockDefinition<any>>();

export const BUILT_IN_BLOCKS: BlockDefinition<any>[] = [];
export const BLOCK_DEFINITIONS_BY_KEY = new Map<string, BlockDefinition<any>>();

export function registerBlock<P extends BlockProps>(
    definition: BlockDefinition<P>,
): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    _registry.set(definition.blockType, definition as BlockDefinition<any>);
    BUILT_IN_BLOCKS.push(definition);
    BLOCK_DEFINITIONS_BY_KEY.set(definition.blockType, definition);
}

export function getBlock(type: string): BlockDefinition<BlockProps> | undefined {
    return _registry.get(type);
}

export function getAllBlocks(): BlockDefinition<BlockProps>[] {
    return Array.from(_registry.values());
}

// ── Built-in registrations ────────────────────────────────────────────────────

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

registerBlock<ButtonProps>({
    blockType: 'Button',
    displayName: 'Button',
    category: 'Interactive',
    defaultProps: {
        label: 'Click me',
        variant: 'primary',
    },
    component: Button,
    meta: buttonMeta,
    schema: buttonSchema,
});

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

registerBlock<TextBlockProps>({
    blockType: 'TextBlock',
    displayName: 'Text',
    category: 'Typography',
    defaultProps: {
        tag: 'p',
        text: 'Edit this text',
    },
    component: TextBlock,
    meta: textBlockMeta,
    schema: textBlockSchema,
});

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

registerBlock<HeroProps>({
    blockType: 'Hero',
    displayName: 'Hero Section',
    category: 'Marketing',
    defaultProps: {
        title: 'Welcome to Aura',
        subtitle: 'Build beautiful interfaces visually',
        ctaLabel: 'Get Started'
    },
    component: Hero,
    meta: heroMeta,
    schema: heroSchema,
});

// ── Section ────────────────────────────────────────────────────────────────

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

registerBlock<SectionProps>({
    blockType: 'Section',
    displayName: 'Section',
    category: 'Layout',
    defaultProps: {
        background: 'default',
        padding: 'md',
    },
    component: Section,
    meta: sectionMeta,
    schema: sectionSchema,
});

// ── Container ──────────────────────────────────────────────────────────────

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

registerBlock<ContainerProps>({
    blockType: 'Container',
    displayName: 'Container',
    category: 'Layout',
    defaultProps: {
        maxWidth: 'lg',
    },
    component: Container,
    meta: containerMeta,
    schema: containerSchema,
});

// ── Grid ───────────────────────────────────────────────────────────────────

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

registerBlock<GridProps>({
    blockType: 'Grid',
    displayName: 'Grid',
    category: 'Layout',
    defaultProps: {
        columns: 2,
        gap: 'md',
    },
    component: Grid,
    meta: gridMeta,
    schema: gridSchema,
});

// ── Card ───────────────────────────────────────────────────────────────────

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

registerBlock<CardProps>({
    blockType: 'Card',
    displayName: 'Card',
    category: 'Data',
    defaultProps: {
        title: 'Card title',
    },
    component: Card,
    meta: cardMeta,
    schema: cardSchema,
});

// ── Image ──────────────────────────────────────────────────────────────────

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

registerBlock<ImageProps>({
    blockType: 'Image',
    displayName: 'Image',
    category: 'Media',
    defaultProps: {
        src: '',
        alt: '',
    },
    component: Image,
    meta: imageMeta,
    schema: imageSchema,
});

// ── Nav ────────────────────────────────────────────────────────────────────

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

registerBlock<NavProps>({
    blockType: 'Nav',
    displayName: 'Navigation Bar',
    category: 'Navigation',
    defaultProps: {
        brand: 'Brand',
        links: [],
    },
    component: Nav,
    meta: navMeta,
    schema: navSchema,
});

// ── Footer ─────────────────────────────────────────────────────────────────

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

registerBlock<FooterProps>({
    blockType: 'Footer',
    displayName: 'Footer',
    category: 'Navigation',
    defaultProps: {
        copyrightText: '© Your Company. All rights reserved.',
        links: [],
    },
    component: Footer,
    meta: footerMeta,
    schema: footerSchema,
});

// ── Form ───────────────────────────────────────────────────────────────────

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

registerBlock<FormProps>({
    blockType: 'Form',
    displayName: 'Form',
    category: 'Form',
    defaultProps: {
        fields: [],
        submitLabel: 'Submit',
    },
    component: Form,
    meta: formMeta,
    schema: formSchema,
});

// ── Spacer ─────────────────────────────────────────────────────────────────

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

registerBlock<SpacerProps>({
    blockType: 'Spacer',
    displayName: 'Spacer',
    category: 'Layout',
    defaultProps: {
        size: 'md',
    },
    component: Spacer,
    meta: spacerMeta,
    schema: spacerSchema,
});