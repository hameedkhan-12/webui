// packages/blocks/src/types.ts
export type BlockVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive";
export type BlockSize = "sm" | "md" | "lg";

export interface BlockProps {
  /** Unique data-id for the inspector to identify this element */
  "data-id"?: string;
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
  type?: "button" | "submit" | "reset";
  label?: string;
}

export interface TextBlockProps extends BlockProps {
  tag?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span" | "label";
  text?: string;
}
