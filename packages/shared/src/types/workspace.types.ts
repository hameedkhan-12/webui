export interface VirtualFile {
  name: string;
  content: string;
  path: string;
}

export type WorkspaceFiles = Record<string, VirtualFile>;

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  statusLogs?: string[];
  generatingFiles?: string[];
}

export interface ChatSession {
  id: string;
  title: string;           // first user message (trimmed)
  createdAt: Date;
  updatedAt: Date;
  messages: ChatMessage[];
}

export interface ComputedStyle {
  // Box model
  width: string;
  height: string;
  minWidth: string;
  maxWidth: string;
  minHeight: string;
  maxHeight: string;
  // Position
  position: string;
  top: string;
  right: string;
  bottom: string;
  left: string;
  zIndex: string;
  // Spacing
  marginTop: string;
  marginRight: string;
  marginBottom: string;
  marginLeft: string;
  paddingTop: string;
  paddingRight: string;
  paddingBottom: string;
  paddingLeft: string;
  // Layout
  display: string;
  flexDirection: string;
  flexWrap: string;
  justifyContent: string;
  alignItems: string;
  gap: string;
  gridTemplateColumns: string;
  gridTemplateRows: string;
  // Appearance
  backgroundColor: string;
  backgroundImage: string;
  opacity: string;
  borderWidth: string;
  borderStyle: string;
  borderColor: string;
  borderRadius: string;
  boxShadow: string;
  // Typography
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  fontStyle: string;
  lineHeight: string;
  letterSpacing: string;
  textAlign: string;
  color: string;
  textDecoration: string;
  // Transform
  transform: string;
  filter: string;
  backdropFilter: string;
  mixBlendMode: string;
  // Overflow
  overflow: string;
  overflowX: string;
  overflowY: string;
  // Cursor
  cursor: string;
}

export interface SelectedElement {
  id: string; // The data-id attribute to identify the JSX element uniquely
  tagName: string;
  text: string;
  classes: string[];
  filePath: string; // The virtual file path where the element resides
  computedStyle?: Partial<ComputedStyle>; // Live computed CSS from the DOM
  rect?: { x: number; y: number; width: number; height: number }; // Bounding box
}


export interface ComponentBlock {
  id: string;
  name: string;
  description: string;
  category: 'layout' | 'content' | 'form' | 'feedback';
  code: string; // React JSX template string
  previewIcon: string; // Lucide icon identifier
}

export interface TerminalLine {
  text: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'input';
}

// ─── OPERATION LAYER TYPES ───────────────────────────────────────────────────

export type Operation =
  | { type: 'INSERT_COMPONENT'; payload: { componentId: string; targetId: string; position: 'before' | 'after' | 'inside'; code: string } }
  | { type: 'REMOVE_COMPONENT'; payload: { nodeId: string } }
  | { type: 'MOVE_COMPONENT'; payload: { nodeId: string; targetId: string } }
  | { type: 'UPDATE_PROP'; payload: { nodeId: string; filePath: string; key: string; value: unknown } }
  | { type: 'UPDATE_CLASS'; payload: { nodeId: string; filePath: string; classes: string[] } }
  | { type: 'CREATE_FILE'; payload: { path: string; template: string } }
  | { type: 'DELETE_FILE'; payload: { path: string } }
  | { type: 'CREATE_FOLDER'; payload: { path: string } }
  | { type: 'DELETE_FOLDER'; payload: { path: string } }
  | { type: 'UPDATE_FILE_RAW'; payload: { path: string; content: string } }
  | { type: 'BATCH'; payload: { ops: Operation[]; label: string } };

export type OperationSource = 'ai' | 'drag_drop' | 'inspector' | 'code_editor' | 'system';

export interface OperationEnvelope {
  op: Operation;
  source: OperationSource;
  txId: string;
  timestamp: number;
}

export interface HistoryEntry {
  ops: Operation[];
  label: string;
  source: OperationSource;
  snapshot: { files: WorkspaceFiles; folders: string[]; elementCounter: number };
  txId: string;
  timestamp: number;
}

// ─── DUAL COMPONENT Page IR TYPES ───────────────────────────────────────────

export type PageNode = GeneratedNode | CustomNode | RawIsland;

export interface GeneratedNode {
  kind: 'generated';
  id: string;           // matches data-id="el-N"
  tagName: string;
  props: Record<string, unknown>;
  classes: string[];
  text?: string;
  children: PageNode[];
  filePath: string;
}

export interface CustomNode {
  kind: 'custom';
  id: string;
  tagName: string;
  rawJSX: string;       // verbatim, never modified structurally
  filePath: string;
}

export interface RawIsland {
  kind: 'raw';
  code: string;         // hooks, variables between components
}

// ─── VALIDATION & SYNC TYPES ─────────────────────────────────────────────────

export type ValidationResult = 
  | { ok: true }
  | { ok: false; error: string };

export interface TextEdit {
  filePath: string;
  oldContent: string;
  newContent: string;
}
