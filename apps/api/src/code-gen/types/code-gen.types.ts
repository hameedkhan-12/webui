export enum Framework {
  REACT = 'react',
  NEXT = 'next',
  VUE = 'vue',
  HTML = 'html',
  NUXT = 'nuxt',
  SVELTE = 'svelte',
  SOLID = 'solid',
}

export enum StylingApproach {
  TAILWIND = 'tailwind',
  CSS_MODULES = 'css-modules',
  STYLED_COMPONENTS = 'styled-components',
  EMOTION = 'emotion',
  SASS = 'sass',
  VANILLA_CSS = 'vanilla-css',
}

export enum ExportFormat {
  ZIP = 'zip',
  GITHUB = 'github',
  CODESANDBOX = 'codesandbox',
  STACKBLITZ = 'stackblitz',
}

export enum CodeGenStatus {
  PENDING = 'pending',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface GeneratedFile {
  path: string;
  content: string;
  language: 'typescript' | 'javascript' | 'css' | 'html' | 'json';
}

export interface ProjectDependencies {
  [packageName: string]: string;
}

export interface ProjectConfiguration {
  packageJson?: any;
  tsConfig?: any;
  tailwindConfig?: any;
  nextConfig?: any;
  viteConfig?: any;
  gitignore?: string;
  readme?: string;
}
export interface ProjectStructure {
  framework: Framework;
  files: GeneratedFile[];
  dependencies: ProjectDependencies;
  devDependencies: ProjectDependencies;
  scripts: Record<string, string>;
  configuration: ProjectConfiguration;
}

export interface CodeGenOptions {
  framework: Framework;
  styling: StylingApproach;
  typescript: boolean;
  includeTests?: boolean;
  includeStorybook?: boolean;
  responsiveBreakPoints?: boolean;
  seo?: boolean;
  analytics?: boolean;
  i18n?: boolean;
  darkMode?: boolean;
  accessibility?: boolean;
}

export interface TemplateContext {
  projectName: string;
  framework?: string
  elements: any[];
  styles: any;
  breakpoints: any;
  options: CodeGenOptions;
  metadata?: {
    title?: string;
    description?: string;
    keywords?: string[];
    author?: string;
  };
}

export interface CodeGenResult {
  id: string;
  projectId: string;
  framework: Framework;
  status: CodeGenStatus;
  files: GeneratedFile[];
  dependencies: ProjectDependencies;
  previewUrl?: string;
  downloadUrl?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface ComponentMetadata {
  name: string;
  props?: Record<string, any>;
  children?: ComponentMetadata[];
  responsive?: boolean;
  interactive?: boolean;
}

export interface AIPromptContext {
    element: any;
    framework: Framework;
    styling: StylingApproach;
    typescript: boolean;
    accessibility: boolean;
    bestPractices: string[];
}
