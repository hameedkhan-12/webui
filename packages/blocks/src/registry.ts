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

import { BLOCK_MANIFEST } from './manifest.js';

const COMPONENT_MAP: Record<string, any> = {
    Button,
    TextBlock,
    Hero,
    Section,
    Container,
    Grid,
    Card,
    Image,
    Nav,
    Footer,
    Form,
    Spacer,
};

for (const item of BLOCK_MANIFEST) {
    const comp = COMPONENT_MAP[item.blockType];
    if (comp) {
        registerBlock({
            blockType: item.blockType,
            displayName: item.displayName,
            category: item.category,
            defaultProps: item.defaultProps,
            component: comp,
            meta: item.meta,
            schema: item.schema,
        });
    }
}