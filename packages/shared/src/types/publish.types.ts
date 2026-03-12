// shared/types/publish.types.ts  ← REPLACE the whole file with this

import type { BuildOptions } from 'esbuild';

export enum PublishStatus {
  IDLE = 'IDLE',
  BUNDLING = 'BUNDLING',
  UPLOADING = 'UPLOADING',
  PUBLISHED = 'PUBLISHED',
  FAILED = 'FAILED',
}

export enum PublishTrigger {
  MANUAL = 'MANUAL',
  AUTO = 'AUTO',
}

// ─────────────────────────────────────────────────────────────────
// Source files (what comes out of AI code generation)
// ─────────────────────────────────────────────────────────────────

export interface BuildFile {
  path: string;       // e.g. "src/App.tsx"
  content: string;    // UTF-8 source content
}

// ─────────────────────────────────────────────────────────────────
// Bundle types (output of esbuild)
// ─────────────────────────────────────────────────────────────────

export interface BundledFile {
  path: string;         // e.g. "assets/main-abc123.js"
  content: Buffer;
  contentType: string;  // e.g. "application/javascript"
  size: number;         // bytes
}

export interface BundleResult {
  success: boolean;
  files: BundledFile[];
  buildTime: number;    // ms
  totalSize: number;    // bytes
  error?: string;
}

// ─────────────────────────────────────────────────────────────────
// Framework configs (replaces framework-configs.ts entirely)
// ─────────────────────────────────────────────────────────────────

export const SUPPORTED_FRAMEWORKS = [
  'react',
  'vue',
  'vite',
  'svelte',
  'next',
] as const;

export type SupportedFramework = (typeof SUPPORTED_FRAMEWORKS)[number];

export interface FrameworkBuildConfig {
  entryPoint: string;           // primary entry e.g. "src/main.tsx"
  platform: 'browser' | 'node';
  outDir: string;               // e.g. "dist"
  htmlTemplate: string;         // full index.html shell
  esbuildOverrides?: Partial<BuildOptions>;
}

const HTML_SHELL = (script: string, css?: string) => `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>App</title>
    ${css ? `<link rel="stylesheet" href="/${css}" />` : ''}
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/${script}"></script>
  </body>
</html>`;

export const FRAMEWORK_CONFIGS: Record<SupportedFramework, FrameworkBuildConfig> = {
  react: {
    entryPoint: 'src/main.tsx',
    platform: 'browser',
    outDir: 'dist',
    htmlTemplate: HTML_SHELL('assets/index.js', 'assets/index.css'),
  },
  vite: {
    entryPoint: 'src/main.tsx',
    platform: 'browser',
    outDir: 'dist',
    htmlTemplate: HTML_SHELL('assets/index.js', 'assets/index.css'),
  },
  vue: {
    entryPoint: 'src/main.ts',
    platform: 'browser',
    outDir: 'dist',
    htmlTemplate: HTML_SHELL('assets/index.js', 'assets/index.css'),
  },
  svelte: {
    entryPoint: 'src/main.ts',
    platform: 'browser',
    outDir: 'dist',
    htmlTemplate: HTML_SHELL('assets/index.js', 'assets/index.css'),
  },
  next: {
    entryPoint: 'pages/index.tsx',
    platform: 'browser',
    outDir: 'out',
    htmlTemplate: HTML_SHELL('assets/index.js', 'assets/index.css'),
    esbuildOverrides: {
      define: { 'process.env.NODE_ENV': '"production"' },
    },
  },
};

export const ENTRY_POINT_FALLBACKS: string[] = [
  'src/main.tsx',
  'src/main.ts',
  'src/main.jsx',
  'src/main.js',
  'src/index.tsx',
  'src/index.ts',
  'src/index.jsx',
  'src/index.js',
  'index.tsx',
  'index.ts',
];

export function getFrameworkConfig(framework: string): FrameworkBuildConfig {
  if (!SUPPORTED_FRAMEWORKS.includes(framework as SupportedFramework)) {
    throw new Error(
      `Unsupported framework: "${framework}". Supported: ${SUPPORTED_FRAMEWORKS.join(', ')}`
    );
  }
  return FRAMEWORK_CONFIGS[framework as SupportedFramework];
}

// ─────────────────────────────────────────────────────────────────
// R2 Upload types
// ─────────────────────────────────────────────────────────────────

export interface R2UploadOptions {
  projectSlug: string;
  files: BundledFile[];
  deploymentVersion: number;
}

export interface R2UploadResult {
  bucket: string;
  path: string;       // e.g. "sites/my-app-a3b4"
  files: number;
  totalSize: number;
  cdnUrl: string;     // e.g. "https://my-app-a3b4.yourdomain.com"
}

// ─────────────────────────────────────────────────────────────────
// Publish result (what the API returns to the client)
// ─────────────────────────────────────────────────────────────────

export interface PublishResult {
  publishId: string;
  projectSlug: string;
  url: string;           // shareable link
  publishedAt: Date;
  buildTime: number;     // ms
  totalSize: number;     // bytes
  fileCount: number;
}

// ─────────────────────────────────────────────────────────────────
// Publish job (if you ever add a queue later)
// ─────────────────────────────────────────────────────────────────

export interface PublishJobData {
  publishId: string;
  projectId: string;
  userId: string;
  projectSlug: string;
  framework: string;
  files: BuildFile[];
  trigger: PublishTrigger;
}
