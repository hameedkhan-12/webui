import type { ComponentMeta, ComponentSchema } from '@repo/shared';

export type BlockVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
export type BlockSize = 'sm' | 'md' | 'lg';

export interface BlockProps {
  /** Unique data-id for the inspector to identify this element */
  'data-id'?: string;
  auraId?: string;
  className?: string;
  children?: React.ReactNode;
}

export interface ButtonBlockProps extends BlockProps {
  variant?: BlockVariant;
  size?: BlockSize;
  disabled?: boolean;
  loading?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
  label?: string;
}

export interface TextBlockProps extends BlockProps {
  tag?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'label';
  text?: string;
}

export interface BlockDefinition<P extends BlockProps = BlockProps> {
  /** Unique identifier for this block type */
  blockType: string;
  /** Human-readable display name shown in the component library */
  displayName: string;
  /** Category grouping in the library panel */
  category: string;
  /** Default props used when dragging into the canvas */
  defaultProps: P;
  /** JSX factory for rendering the block */
  component: React.ComponentType<P>;
  /** Metadata associated with the block definition */
  meta?: ComponentMeta;
  /** Schema associated with the block definition */
  schema?: ComponentSchema;
}

