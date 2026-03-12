// apps/api/src/modules/code-gen/types/code-gen.types.ts

/**
 * Code Generation Types - Updated for 2025
 * Latest versions: React 19, Next.js 16, Tailwind 4, etc.
 */

// Supported frameworks (latest versions)
export enum Framework {
  REACT = 'react', // React 19
  NEXT = 'next', // Next.js 16
  VUE = 'vue', // Vue 3.5
  NUXT = 'nuxt', // Nuxt 4
  SVELTE = 'svelte', // Svelte 5
  REMIX = 'remix', // Remix 2
  ASTRO = 'astro', // Astro 5
  HTML = 'html',
}

// Supported styling approaches
export enum StylingApproach {
  TAILWIND = 'tailwind', // Tailwind CSS 4
  CSS_MODULES = 'css-modules',
  STYLED_COMPONENTS = 'styled-components',
  EMOTION = 'emotion',
  VANILLA_CSS = 'vanilla-css',
  SASS = 'sass',
  PANDA_CSS = 'panda-css', // New: Panda CSS
  UNO_CSS = 'uno-css', // New: UnoCSS
}

// Build tools
export enum BuildTool {
  VITE = 'vite', // Vite 6
  WEBPACK = 'webpack',
  TURBOPACK = 'turbopack', // Next.js 16 default
  RSPACK = 'rspack',
}

// Package managers
export enum PackageManager {
  NPM = 'npm',
  YARN = 'yarn',
  PNPM = 'pnpm',
  BUN = 'bun',
}

// Export formats
export enum ExportFormat {
  ZIP = 'zip',
  GITHUB = 'github',
  CODESANDBOX = 'codesandbox',
  STACKBLITZ = 'stackblitz',
  VERCEL = 'vercel',
  NETLIFY = 'netlify',
}

// Code generation status
export enum CodeGenStatus {
  PENDING = 'pending',
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// Generated file structure
export interface GeneratedFile {
  path: string; // e.g., 'src/components/Hero.tsx'
  content: string;
  language: 'typescript' | 'javascript' | 'css' | 'html' | 'json' | 'markdown';
}

// Project structure
export interface ProjectStructure {
  framework: Framework;
  files: GeneratedFile[];
  dependencies: ProjectDependencies;
  devDependencies: ProjectDependencies;
  scripts: Record<string, string>;
  configuration: ProjectConfiguration;
}

// Dependencies with latest versions
export interface ProjectDependencies {
  [packageName: string]: string; // package: version
}

// Project configuration files
export interface ProjectConfiguration {
  packageJson?: any;
  tsConfig?: any;
  tailwindConfig?: any;
  nextConfig?: any;
  viteConfig?: any;
  postcssConfig?: any;
  gitignore?: string;
  readme?: string;
  eslintConfig?: any;
  prettierConfig?: any;
}

// Code generation options
export interface CodeGenOptions {
  framework: Framework;
  styling: StylingApproach;
  typescript: boolean;
  buildTool?: BuildTool;
  packageManager?: PackageManager;
  
  // Features
  includeTests?: boolean;
  includeStorybook?: boolean;
  includeESLint?: boolean;
  includePrettier?: boolean;
  
  // UI/UX
  responsiveBreakpoints?: boolean;
  darkMode?: boolean;
  accessibility?: boolean;
  animations?: boolean;
  
  // SEO & Performance
  seo?: boolean;
  analytics?: boolean;
  i18n?: boolean;
  pwa?: boolean;
  
  // State Management
  stateManagement?: 'zustand' | 'redux' | 'jotai' | 'recoil' | 'none';
  
  // Data Fetching
  dataFetching?: 'react-query' | 'swr' | 'apollo' | 'none';
  
  // Form Handling
  formLibrary?: 'react-hook-form' | 'formik' | 'none';
  
  // UI Components
  componentLibrary?: 'shadcn' | 'radix' | 'mui' | 'chakra' | 'none';
}

// Template context for code generation
export interface TemplateContext {
  framework?: Framework;
  projectName: string;
  elements: any[]; // Canvas elements
  styles: any; // Global styles
  breakpoints: any; // Responsive breakpoints
  options: CodeGenOptions;
  metadata?: ProjectMetadata;
}

// Project metadata
export interface ProjectMetadata {
  title?: string;
  description?: string;
  author?: string;
  keywords?: string[];
  license?: string;
  repository?: string;
  homepage?: string;
}

// Code generation result
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

// Component metadata
export interface ComponentMetadata {
  name: string;
  props?: Record<string, any>;
  children?: ComponentMetadata[];
  responsive?: boolean;
  interactive?: boolean;
  serverComponent?: boolean; // For React Server Components
  clientComponent?: boolean; // For 'use client'
}

// AI prompt context for Gemini
export interface AIPromptContext {
  element: any;
  framework: Framework;
  styling: StylingApproach;
  typescript: boolean;
  accessibility: boolean;
  bestPractices: string[];
  reactVersion?: '19' | '18'; // React 19 has breaking changes
  useServerComponents?: boolean; // Next.js 16 App Router
}

// Latest tech stack versions (Feb 2025)
export const LATEST_VERSIONS: Record<string, string> = {
  // Core Frameworks
  'react': '^19.0.0',
  'react-dom': '^19.0.0',
  'next': '^16.0.0',
  'vue': '^3.5.0',
  'nuxt': '^4.0.0',
  'svelte': '^5.0.0',
  'remix': '^2.15.0',
  'astro': '^5.0.0',
  
  // Build Tools
  'vite': '^6.0.0',
  'webpack': '^5.95.0',
  
  // TypeScript
  'typescript': '^5.7.0',
  '@types/react': '^19.0.0',
  '@types/react-dom': '^19.0.0',
  '@types/node': '^22.0.0',
  
  // Styling
  'tailwindcss': '^4.0.0',
  'autoprefixer': '^10.4.20',
  'postcss': '^8.4.49',
  'styled-components': '^6.1.0',
  '@emotion/react': '^11.13.0',
  '@emotion/styled': '^11.13.0',
  'sass': '^1.82.0',
  '@pandacss/dev': '^0.46.0',
  'unocss': '^0.63.0',
  
  // State Management
  'zustand': '^5.0.2',
  '@reduxjs/toolkit': '^2.4.0',
  'react-redux': '^9.2.0',
  'jotai': '^2.10.3',
  'recoil': '^0.7.7',
  
  // Data Fetching
  '@tanstack/react-query': '^5.62.0',
  'swr': '^2.2.6',
  '@apollo/client': '^3.11.0',
  
  // Form Handling
  'react-hook-form': '^7.54.0',
  'formik': '^2.4.6',
  'zod': '^3.24.1',
  'yup': '^1.4.0',
  
  // UI Libraries
  '@radix-ui/react-icons': '^1.3.2',
  '@radix-ui/react-dialog': '^1.1.2',
  '@mui/material': '^6.1.0',
  '@chakra-ui/react': '^3.0.0',
  
  // Utilities
  'clsx': '^2.1.1',
  'class-variance-authority': '^0.7.1',
  'tailwind-merge': '^2.5.0',
  
  // Icons
  'lucide-react': '^0.469.0',
  'react-icons': '^5.4.0',
  '@heroicons/react': '^2.2.0',
  
  // Animation
  'framer-motion': '^11.14.0',
  '@react-spring/web': '^9.7.6',
  
  // Testing
  'vitest': '^2.1.0',
  '@testing-library/react': '^16.1.0',
  '@testing-library/jest-dom': '^6.6.3',
  '@testing-library/user-event': '^14.5.2',
  
  // Linting
  'eslint': '^9.16.0',
  'eslint-config-next': '^16.0.0',
  '@typescript-eslint/parser': '^8.18.1',
  '@typescript-eslint/eslint-plugin': '^8.18.1',
  'prettier': '^3.4.2',
  'prettier-plugin-tailwindcss': '^0.6.9',
  
  // Package Managers
  'pnpm': '^9.15.0',
  'yarn': '^4.6.0',
  'bun': '^1.1.42',
  
  // Remix specific
  '@remix-run/node': '^2.15.0',
  '@remix-run/react': '^2.15.0',
  '@remix-run/serve': '^2.15.0',
  
  // Vite plugins
  '@vitejs/plugin-react-swc': '^3.7.1',
  '@vitejs/plugin-vue': '^5.2.0',
  '@sveltejs/vite-plugin-svelte': '^4.0.0',
  
  // Tailwind 4
  '@tailwindcss/postcss': '^4.0.0',
  
  // Next.js specific
  '@next/eslint-plugin-next': '^16.0.0',
};

// Helper function to get version
export function getLatestVersion(packageName: string): string {
  return LATEST_VERSIONS[packageName] || 'latest';
}

// React 19 breaking changes helpers
export interface React19Migration {
  useClient: boolean; // Whether to add 'use client'
  useServer: boolean; // Whether to add 'use server'
  asyncComponents: boolean; // Server Components can be async
  actionForms: boolean; // Use form actions
}

// Next.js 16 features
export interface NextJS16Features {
  appRouter: boolean; // Use App Router (default)
  turbopack: boolean; // Use Turbopack (default in dev)
  serverActions: boolean; // Use Server Actions
  partialPrerendering: boolean; // Experimental PPR
  reactCompiler: boolean; // React Compiler enabled
}

// Tailwind CSS 4 config (CSS-first)
export interface TailwindV4Config {
  useCSSConfig: boolean; // Use @config directive instead of JS
  useTheme: boolean; // Use @theme directive
  modernSyntax: boolean; // Use modern CSS syntax
}