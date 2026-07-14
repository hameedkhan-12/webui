import type { ComponentMeta, ComponentSchema } from '@repo/shared';
import type { BlockDefinition, BlockProps, TextBlockProps } from './types';
import { Button } from './Button';
import type { ButtonProps } from './Button';
import { TextBlock } from './TextBlock';
import { Hero } from './Hero';
import type { HeroProps } from './Hero';

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


