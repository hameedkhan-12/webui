// apps/api/src/modules/canvas/types/canvas.types.ts

/**
 * Canvas Element Types - Strong typing for element tree
 */

// Base element types supported by the canvas
export enum ElementType {
  CONTAINER = 'container',
  TEXT = 'text',
  IMAGE = 'image',
  BUTTON = 'button',
  INPUT = 'input',
  VIDEO = 'video',
  FORM = 'form',
  SECTION = 'section',
  HEADER = 'header',
  FOOTER = 'footer',
  NAV = 'nav',
  GRID = 'grid',
  FLEX = 'flex',
  CUSTOM = 'custom',
}

// CSS Style properties (subset for type safety)
export interface ElementStyles {
  // Layout
  display?: 'block' | 'flex' | 'grid' | 'inline' | 'inline-block' | 'none';
  position?: 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky';
  width?: string;
  height?: string;
  margin?: string;
  padding?: string;
  
  // Flexbox
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  justifyContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around';
  alignItems?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
  gap?: string;
  
  // Grid
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  gridGap?: string;
  
  // Colors & Background
  backgroundColor?: string;
  color?: string;
  backgroundImage?: string;
  backgroundSize?: string;
  backgroundPosition?: string;
  
  // Typography
  fontSize?: string;
  fontWeight?: string | number;
  fontFamily?: string;
  lineHeight?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  
  // Border
  border?: string;
  borderRadius?: string;
  
  // Effects
  boxShadow?: string;
  opacity?: number;
  transform?: string;
  
  // Responsive (breakpoint overrides)
  [key: string]: any; // Allow for custom properties and breakpoints
}

// Element props based on type
export interface BaseElementProps {
  id?: string;
  className?: string;
  dataAttributes?: Record<string, string>;
}

export interface TextElementProps extends BaseElementProps {
  content: string;
  tag?: 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'span';
}

export interface ImageElementProps extends BaseElementProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  loading?: 'lazy' | 'eager';
}

export interface ButtonElementProps extends BaseElementProps {
  text: string;
  onClick?: string; // JavaScript function name or code
  href?: string;
  target?: '_blank' | '_self' | '_parent' | '_top';
}

export interface InputElementProps extends BaseElementProps {
  type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  placeholder?: string;
  name: string;
  required?: boolean;
  pattern?: string;
}

export type ElementProps = 
  | BaseElementProps 
  | TextElementProps 
  | ImageElementProps 
  | ButtonElementProps 
  | InputElementProps;

// Flat element structure for optimized storage
export interface CanvasElement {
  id: string;
  type: ElementType;
  name: string; // Human-readable name
  props: ElementProps;
  styles: ElementStyles;
  
  // Tree relationships (flat storage)
  parentId: string | null;
  order: number; // Order among siblings
  
  // Metadata
  locked?: boolean;
  hidden?: boolean;
  
  // Responsive overrides
  responsiveStyles?: {
    [breakpoint: string]: Partial<ElementStyles>;
  };
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
}

// Global canvas styles
export interface CanvasStyles {
  // Typography
  fontFamily?: string;
  baseFontSize?: string;
  
  // Colors
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  textColor?: string;
  backgroundColor?: string;
  
  // Spacing
  baseSpacing?: string;
  
  // Custom CSS variables
  customVariables?: Record<string, string>;
}

// Breakpoints configuration
export interface CanvasBreakpoints {
  mobile: number;
  tablet: number;
  desktop: number;
  wide?: number;
}

// Complete canvas data structure
export interface CanvasData {
  id: string;
  projectId: string;
  elements: CanvasElement[];
  styles: CanvasStyles;
  breakpoints: CanvasBreakpoints;
  version: number;
  updatedAt: Date;
}

// Bulk operation types
export enum BulkOperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  MOVE = 'move',
  REORDER = 'reorder',
}

export interface BulkOperation {
  type: BulkOperationType;
  elementId?: string;
  data?: Partial<CanvasElement> | { newParentId?: string; newOrder?: number };
  tempId?: string; // For optimistic UI updates
}

// Version snapshot
export interface CanvasSnapshot {
  elements: CanvasElement[];
  styles: CanvasStyles;
  breakpoints: CanvasBreakpoints;
  message: string;
  createdAt: Date;
  createdBy: string;
}

// Collaboration types
export interface CollaborationCursor {
  userId: string;
  userName: string;
  color: string;
  position: { x: number; y: number };
  selectedElementId?: string;
  lastUpdate: Date;
}

export interface ElementLock {
  elementId: string;
  userId: string;
  userName: string;
  lockedAt: Date;
  expiresAt: Date;
}

// Change tracking for collaboration
export interface CanvasChange {
  id: string;
  canvasId: string;
  userId: string;
  operation: BulkOperationType;
  elementId?: string;
  before?: Partial<CanvasElement>;
  after?: Partial<CanvasElement>;
  timestamp: Date;
  sessionId: string;
}

// Export/Import types
export interface ExportFormat {
  type: 'react' | 'html' | 'vue' | 'json';
  options?: {
    includeStyles?: boolean;
    framework?: string;
    typescript?: boolean;
  };
}