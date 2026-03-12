// apps/api/src/modules/code-gen/services/template.service.ts

import { Injectable, Logger } from '@nestjs/common';
import {
  Framework,
  StylingApproach,
  GeneratedFile,
  ProjectStructure,
  TemplateContext,
  LATEST_VERSIONS,
  BuildTool,
  PackageManager,
} from '../types/code-gen.types';

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);

  /**
   * Generate complete project structure
   */
  generateProjectStructure(context: TemplateContext): ProjectStructure {
    const { framework, options } = context;

    const files: GeneratedFile[] = [];

    // Generate package.json
    files.push(this.generatePackageJson(context));

    // Generate tsconfig.json if TypeScript
    if (options.typescript) {
      files.push(this.generateTsConfig(framework as Framework, options));
    }

    // Generate framework-specific config
    files.push(...this.generateFrameworkConfig(context));

    // Generate .gitignore
    files.push(this.generateGitignore());

    // Generate README
    files.push(this.generateReadme(context));

    // Generate styling config
    files.push(...this.generateStylingConfig(context));

    // Generate ESLint config if requested
    if (options.includeESLint) {
      files.push(this.generateESLintConfig(framework as Framework, options));
    }

    // Generate Prettier config if requested
    if (options.includePrettier) {
      files.push(this.generatePrettierConfig(options));
    }

    // Generate .env.example
    files.push(this.generateEnvExample(context));

    return {
      framework: framework as Framework,
      files,
      dependencies: this.getDependencies(context),
      devDependencies: this.getDevDependencies(context),
      scripts: this.getScripts(context),
      configuration: this.getConfiguration(context),
    };
  }

  /**
   * Generate package.json with latest versions
   */
  private generatePackageJson(context: TemplateContext): GeneratedFile {
    const { projectName, options, framework, metadata } = context;

    const packageJson = {
      name: projectName.toLowerCase().replace(/\s+/g, '-'),
      version: '0.1.0',
      private: true,
      type: 'module', // ES Modules by default
      description: metadata?.description || 'Generated with AI-powered builder',
      author: metadata?.author || '',
      license: metadata?.license || 'MIT',
      scripts: this.getScripts(context),
      dependencies: this.getDependencies(context),
      devDependencies: this.getDevDependencies(context),
      keywords: metadata?.keywords || [],
      engines: {
        node: '>=20.0.0', // Node 20+ required
        pnpm: '>=9.0.0',
      },
      packageManager: this.getPackageManagerString(options.packageManager),
    };

    if (metadata?.repository) {
      (packageJson as any).repository = metadata.repository;
    }

    if (metadata?.homepage) {
      (packageJson as any).homepage = metadata.homepage;
    }

    return {
      path: 'package.json',
      content: JSON.stringify(packageJson, null, 2),
      language: 'json',
    };
  }

  /**
   * Generate tsconfig.json with latest settings
   */
  private generateTsConfig(framework: Framework, options: any): GeneratedFile {
    const baseConfig = {
      compilerOptions: {
        target: 'ES2022',
        lib: ['ES2023', 'DOM', 'DOM.Iterable'],
        jsx: framework === Framework.NEXT ? 'preserve' : 'react-jsx',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        resolveJsonModule: true,
        allowJs: true,
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        skipLibCheck: true,
        allowSyntheticDefaultImports: true,
        forceConsistentCasingInFileNames: true,
        isolatedModules: true,
        verbatimModuleSyntax: true, // New in TS 5.0+
        
        // Path aliases
        baseUrl: '.',
        paths: {
          '@/*': ['./src/*'],
        },
      },
      include: ['src'],
      exclude: ['node_modules', 'dist', '.next', 'out'],
    };

    // Framework-specific adjustments
    if (framework === Framework.NEXT) {
      (baseConfig.compilerOptions as any).incremental = true;
      (baseConfig.compilerOptions as any).plugins = [{ name: 'next' }];
      baseConfig.include = ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'];
    }

    // Add React 19 types
    (baseConfig.compilerOptions as any).types = ['node'];

    return {
      path: 'tsconfig.json',
      content: JSON.stringify(baseConfig, null, 2),
      language: 'json',
    };
  }

  /**
   * Generate framework-specific configuration
   */
  private generateFrameworkConfig(context: TemplateContext): GeneratedFile[] {
    const { framework, options } = context;
    const files: GeneratedFile[] = [];

    switch (framework) {
      case Framework.NEXT:
        files.push(this.generateNextConfig(options));
        break;

      case Framework.REACT:
      case Framework.VUE:
      case Framework.SVELTE:
        files.push(this.generateViteConfig(framework, options));
        break;

      case Framework.REMIX:
        files.push(this.generateRemixConfig(options));
        break;

      case Framework.ASTRO:
        files.push(this.generateAstroConfig(options));
        break;
    }

    return files;
  }

  /**
   * Generate Next.js 16 configuration
   */
  private generateNextConfig(options: any): GeneratedFile {
    const config = {
      reactStrictMode: true,
      
      experimental: {
        turbo: {},
        reactCompiler: true,
        ppr: options.pwa ? true : false,
      },
      
      images: {
        remotePatterns: [],
      },
      
      typescript: {
        ignoreBuildErrors: false,
      },
      
      eslint: {
        ignoreDuringBuilds: false,
      },
    };

    if (options.i18n) {
      (config as any).i18n = {
        locales: ['en', 'es', 'fr', 'de'],
        defaultLocale: 'en',
      };
    }

    const content = `import type { NextConfig } from 'next'

const nextConfig: NextConfig = ${JSON.stringify(config, null, 2)}

export default nextConfig
`;

    return {
      path: 'next.config.ts',
      content,
      language: 'typescript',
    };
  }

  /**
   * Generate Vite 6 configuration
   */
  private generateViteConfig(framework: Framework, options: any): GeneratedFile {
    let pluginImport = '';
    let plugin = '';

    switch (framework) {
      case Framework.REACT:
        pluginImport = "import react from '@vitejs/plugin-react-swc'";
        plugin = 'react()';
        break;
      case Framework.VUE:
        pluginImport = "import vue from '@vitejs/plugin-vue'";
        plugin = 'vue()';
        break;
      case Framework.SVELTE:
        pluginImport = "import { svelte } from '@sveltejs/vite-plugin-svelte'";
        plugin = 'svelte()';
        break;
    }

    const content = `import { defineConfig } from 'vite'
${pluginImport}
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [${plugin}],
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  
  server: {
    port: 3000,
    open: true,
  },
  
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: true,
  },
  
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
})
`;

    return {
      path: 'vite.config.ts',
      content,
      language: 'typescript',
    };
  }

  /**
   * Generate Remix 2 configuration
   */
  private generateRemixConfig(options: any): GeneratedFile {
    const content = `import type { Config } from '@remix-run/dev'

export default {
  future: {
    v3_fetcherPersist: true,
    v3_relativeSplatPath: true,
    v3_throwAbortReason: true,
  },
  tailwind: ${options.styling === 'tailwind'},
  postcss: true,
} satisfies Config
`;

    return {
      path: 'remix.config.ts',
      content,
      language: 'typescript',
    };
  }

  /**
   * Generate Astro 5 configuration
   */
  private generateAstroConfig(options: any): GeneratedFile {
    const content = `import { defineConfig } from 'astro/config'
${options.framework === 'react' ? "import react from '@astrojs/react'" : ''}
${options.styling === 'tailwind' ? "import tailwind from '@astrojs/tailwind'" : ''}

// https://astro.build/config
export default defineConfig({
  integrations: [
    ${options.framework === 'react' ? 'react(),' : ''}
    ${options.styling === 'tailwind' ? 'tailwind(),' : ''}
  ],
  output: 'hybrid',
  adapter: 'node',
})
`;

    return {
      path: 'astro.config.mjs',
      content,
      language: 'javascript',
    };
  }

  /**
   * Generate styling configuration
   */
  private generateStylingConfig(context: TemplateContext): GeneratedFile[] {
    const { options } = context;
    const files: GeneratedFile[] = [];

    if (options.styling === StylingApproach.TAILWIND) {
      files.push(this.generateTailwindV4Config(context));
      files.push(this.generatePostCSSConfig());
    }

    return files;
  }

  /**
   * Generate Tailwind CSS 4 configuration (CSS-first)
   */
  private generateTailwindV4Config(context: TemplateContext): GeneratedFile {
    const { breakpoints, options } = context;

    // Tailwind v4 uses CSS-based configuration
    const content = `@import "tailwindcss";

@theme {
  /* Custom breakpoints */
  --breakpoint-sm: ${breakpoints?.mobile || 640}px;
  --breakpoint-md: ${breakpoints?.tablet || 768}px;
  --breakpoint-lg: ${breakpoints?.desktop || 1024}px;
  --breakpoint-xl: 1280px;
  --breakpoint-2xl: 1536px;
  
  /* Custom colors */
  --color-primary: #3b82f6;
  --color-secondary: #8b5cf6;
  --color-accent: #10b981;
  
  /* Custom spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  
  /* Typography */
  --font-sans: ui-sans-serif, system-ui, sans-serif;
  --font-mono: ui-monospace, monospace;
}

${options.darkMode ? `
@media (prefers-color-scheme: dark) {
  :root {
    --color-primary: #60a5fa;
    --color-secondary: #a78bfa;
  }
}
` : ''}

/* Custom utilities */
@utility container-custom {
  max-width: 1280px;
  margin-left: auto;
  margin-right: auto;
  padding-left: 1rem;
  padding-right: 1rem;
}
`;

    return {
      path: 'src/styles/tailwind.css',
      content,
      language: 'css',
    };
  }

  /**
   * Generate PostCSS configuration
   */
  private generatePostCSSConfig(): GeneratedFile {
    const content = `export default {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
`;

    return {
      path: 'postcss.config.mjs',
      content,
      language: 'javascript',
    };
  }

  /**
   * Generate ESLint configuration (flat config)
   */
  private generateESLintConfig(framework: Framework, options: any): GeneratedFile {
    const content = `import js from '@eslint/js'
import typescript from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'
${framework === Framework.NEXT ? "import nextPlugin from '@next/eslint-plugin-next'" : ''}

export default [
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      ${framework === Framework.NEXT ? "'@next/next': nextPlugin," : ''}
    },
    rules: {
      ...typescript.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
]
`;

    return {
      path: 'eslint.config.mjs',
      content,
      language: 'javascript',
    };
  }

  /**
   * Generate Prettier configuration
   */
  private generatePrettierConfig(options: any): GeneratedFile {
    const config = {
      semi: true,
      trailingComma: 'all' as const,
      singleQuote: true,
      printWidth: 100,
      tabWidth: 2,
      useTabs: false,
      plugins: options.styling === 'tailwind' ? ['prettier-plugin-tailwindcss'] : [],
    };

    return {
      path: '.prettierrc.json',
      content: JSON.stringify(config, null, 2),
      language: 'json',
    };
  }

  /**
   * Generate .gitignore
   */
  private generateGitignore(): GeneratedFile {
    return {
      path: '.gitignore',
      content: `# Dependencies
node_modules/
.pnp/
.pnp.js
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/sdks
!.yarn/versions

# Testing
coverage/
*.lcov

# Production
build/
dist/
.next/
out/
.output/
.vercel/
.netlify/

# Misc
.DS_Store
*.pem
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnpm-debug.log*

# IDE
.vscode/
!.vscode/settings.json
!.vscode/tasks.json
!.vscode/launch.json
!.vscode/extensions.json
.idea/
*.swp
*.swo
*~

# Turbopack
.turbo/

# TypeScript
*.tsbuildinfo
next-env.d.ts
`,
      language: 'javascript',
    };
  }

  /**
   * Generate README with latest info
   */
  private generateReadme(context: TemplateContext): GeneratedFile {
    const { projectName, options, framework, metadata } = context;

    return {
      path: 'README.md',
      content: `# ${projectName}

${metadata?.description || 'Generated with AI-powered website builder'}

## 🚀 Tech Stack

- **Framework:** ${framework} ${this.getFrameworkVersion(framework as Framework)}
- **Styling:** ${options.styling}
- **Language:** ${options.typescript ? 'TypeScript 5.7+' : 'JavaScript ES2023'}
- **Package Manager:** ${options.packageManager || 'pnpm'}

## ✨ Features

${options.typescript ? '- ✅ TypeScript with strict mode' : ''}
${options.seo ? '- ✅ SEO optimized' : ''}
${options.accessibility ? '- ✅ WCAG 2.1 Level AA compliant' : ''}
${options.darkMode ? '- ✅ Dark mode support' : ''}
${options.i18n ? '- ✅ Internationalization (i18n)' : ''}
${options.responsiveBreakpoints ? '- ✅ Fully responsive' : ''}
${options.pwa ? '- ✅ Progressive Web App' : ''}
${options.animations ? '- ✅ Smooth animations' : ''}

## 📦 Getting Started

### Prerequisites

- Node.js 20+ 
- ${options.packageManager || 'pnpm'} ${this.getPackageManagerVersion(options.packageManager)}

### Installation

\`\`\`bash
# Install dependencies
${this.getInstallCommand(options.packageManager)}

# Start development server
${this.getDevCommand(options.packageManager)}

# Build for production
${this.getBuildCommand(options.packageManager)}
\`\`\`

## 🏗️ Project Structure

\`\`\`
${framework === Framework.NEXT ? `
├── app/                 # Next.js 16 App Router
│   ├── layout.tsx      # Root layout
│   ├── page.tsx        # Home page
│   └── globals.css     # Global styles
` : `
├── src/
│   ├── components/     # React components
│   ├── App.tsx        # Main app
│   └── main.tsx       # Entry point
`}
├── public/             # Static assets
├── package.json
${options.typescript ? '├── tsconfig.json' : ''}
${options.styling === 'tailwind' ? '├── tailwind.css' : ''}
└── README.md
\`\`\`

## 📝 Scripts

- \`dev\` - Start development server
- \`build\` - Build for production
- \`start\` - Start production server
${options.includeTests ? '- `test` - Run tests' : ''}
${options.includeESLint ? '- `lint` - Run ESLint' : ''}
${options.includePrettier ? '- `format` - Format code with Prettier' : ''}

## 🚢 Deployment

This project is ready to deploy to:

- [Vercel](https://vercel.com) (Recommended for Next.js)
- [Netlify](https://netlify.com)
- [Cloudflare Pages](https://pages.cloudflare.com)
- [Railway](https://railway.app)

## 📄 License

${metadata?.license || 'MIT'}
`,
      language: 'markdown',
    };
  }

  /**
   * Generate .env.example
   */
  private generateEnvExample(context: TemplateContext): GeneratedFile {
    const { options } = context;

    let content = `# Application
NODE_ENV=development
PORT=3000

# URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
`;

    if (options.analytics) {
      content += `\n# Analytics
NEXT_PUBLIC_GA_ID=
`;
    }

    if (options.seo) {
      content += `\n# SEO
NEXT_PUBLIC_SITE_NAME=
NEXT_PUBLIC_SITE_DESCRIPTION=
`;
    }

    return {
      path: '.env.example',
      content,
      language: 'javascript',
    };
  }

  /**
   * Get dependencies with latest versions
   */
  private getDependencies(context: TemplateContext): Record<string, string> {
    const { framework, options } = context;
    const deps: Record<string, string> = {};

    // Core framework dependencies
    switch (framework) {
      case Framework.REACT:
        deps['react'] = LATEST_VERSIONS.react;
        deps['react-dom'] = LATEST_VERSIONS['react-dom'];
        break;
      case Framework.NEXT:
        deps['next'] = LATEST_VERSIONS.next;
        deps['react'] = LATEST_VERSIONS.react;
        deps['react-dom'] = LATEST_VERSIONS['react-dom'];
        break;
      case Framework.VUE:
        deps['vue'] = LATEST_VERSIONS.vue;
        break;
      case Framework.NUXT:
        deps['nuxt'] = LATEST_VERSIONS.nuxt;
        break;
      case Framework.SVELTE:
        deps['svelte'] = LATEST_VERSIONS.svelte;
        break;
      case Framework.REMIX:
        deps['@remix-run/node'] = LATEST_VERSIONS.remix;
        deps['@remix-run/react'] = LATEST_VERSIONS.remix;
        deps['@remix-run/serve'] = LATEST_VERSIONS.remix;
        deps['react'] = LATEST_VERSIONS.react;
        deps['react-dom'] = LATEST_VERSIONS['react-dom'];
        break;
      case Framework.ASTRO:
        deps['astro'] = LATEST_VERSIONS.astro;
        break;
    }

    // Styling dependencies
    switch (options.styling) {
      case StylingApproach.TAILWIND:
        deps['tailwindcss'] = LATEST_VERSIONS.tailwindcss;
        deps['@tailwindcss/postcss'] = '^4.0.0';
        break;
      case StylingApproach.STYLED_COMPONENTS:
        deps['styled-components'] = LATEST_VERSIONS['styled-components'];
        break;
      case StylingApproach.EMOTION:
        deps['@emotion/react'] = LATEST_VERSIONS['@emotion/react'];
        deps['@emotion/styled'] = LATEST_VERSIONS['@emotion/styled'];
        break;
      case StylingApproach.SASS:
        deps['sass'] = LATEST_VERSIONS.sass;
        break;
    }

    // State management
    if (options.stateManagement === 'zustand') {
      deps['zustand'] = LATEST_VERSIONS.zustand;
    } else if (options.stateManagement === 'redux') {
      deps['@reduxjs/toolkit'] = LATEST_VERSIONS['@reduxjs/toolkit'];
      deps['react-redux'] = LATEST_VERSIONS['react-redux'];
    }

    // Data fetching
    if (options.dataFetching === 'react-query') {
      deps['@tanstack/react-query'] = LATEST_VERSIONS['@tanstack/react-query'];
    } else if (options.dataFetching === 'swr') {
      deps['swr'] = LATEST_VERSIONS.swr;
    }

    // Forms
    if (options.formLibrary === 'react-hook-form') {
      deps['react-hook-form'] = LATEST_VERSIONS['react-hook-form'];
      deps['zod'] = LATEST_VERSIONS.zod;
    }

    // UI Library
    if (options.componentLibrary === 'shadcn') {
      deps['@radix-ui/react-icons'] = LATEST_VERSIONS['@radix-ui/react-icons'];
      deps['class-variance-authority'] = LATEST_VERSIONS['class-variance-authority'];
      deps['clsx'] = LATEST_VERSIONS.clsx;
      deps['tailwind-merge'] = LATEST_VERSIONS['tailwind-merge'];
    }

    // Icons
    deps['lucide-react'] = LATEST_VERSIONS['lucide-react'];

    // Animations
    if (options.animations) {
      deps['framer-motion'] = LATEST_VERSIONS['framer-motion'];
    }

    return deps;
  }

  /**
   * Get dev dependencies
   */
  private getDevDependencies(context: TemplateContext): Record<string, string> {
    const { framework, options } = context;
    const devDeps: Record<string, string> = {};

    // TypeScript
    if (options.typescript) {
      devDeps['typescript'] = LATEST_VERSIONS.typescript;
      devDeps['@types/react'] = LATEST_VERSIONS['@types/react'];
      devDeps['@types/react-dom'] = LATEST_VERSIONS['@types/react-dom'];
      devDeps['@types/node'] = LATEST_VERSIONS['@types/node'];
    }

    // Build tools
    if (framework !== Framework.NEXT && framework !== Framework.NUXT) {
      devDeps['vite'] = LATEST_VERSIONS.vite;
      
      if (framework === Framework.REACT) {
        devDeps['@vitejs/plugin-react-swc'] = '^3.7.1';
      } else if (framework === Framework.VUE) {
        devDeps['@vitejs/plugin-vue'] = '^5.2.0';
      }
    }

    if (options.styling === StylingApproach.TAILWIND) {
      devDeps['autoprefixer'] = LATEST_VERSIONS.autoprefixer;
      devDeps['postcss'] = LATEST_VERSIONS.postcss;
    }

    if (options.includeTests) {
      devDeps['vitest'] = LATEST_VERSIONS.vitest;
      devDeps['@testing-library/react'] = LATEST_VERSIONS['@testing-library/react'];
      devDeps['@testing-library/jest-dom'] = LATEST_VERSIONS['@testing-library/jest-dom'];
    }

    if (options.includeESLint) {
      devDeps['eslint'] = LATEST_VERSIONS.eslint;
      devDeps['@typescript-eslint/parser'] = LATEST_VERSIONS['@typescript-eslint/parser'];
      devDeps['@typescript-eslint/eslint-plugin'] = LATEST_VERSIONS['@typescript-eslint/eslint-plugin'];
      
      if (framework === Framework.NEXT) {
        devDeps['eslint-config-next'] = LATEST_VERSIONS['eslint-config-next'];
      }
    }

    if (options.includePrettier) {
      devDeps['prettier'] = LATEST_VERSIONS.prettier;
      if (options.styling === 'tailwind') {
        devDeps['prettier-plugin-tailwindcss'] = LATEST_VERSIONS['prettier-plugin-tailwindcss'];
      }
    }

    return devDeps;
  }

  /**
   * Get npm scripts
   */
  private getScripts(context: TemplateContext): Record<string, string> {
    const { framework, options } = context;
    const scripts: Record<string, string> = {};

    switch (framework) {
      case Framework.NEXT:
        scripts['dev'] = 'next dev --turbo';
        scripts['build'] = 'next build';
        scripts['start'] = 'next start';
        break;

      case Framework.REMIX:
        scripts['dev'] = 'remix vite:dev';
        scripts['build'] = 'remix vite:build';
        scripts['start'] = 'remix-serve build/server/index.js';
        break;

      case Framework.ASTRO:
        scripts['dev'] = 'astro dev';
        scripts['build'] = 'astro build';
        scripts['preview'] = 'astro preview';
        break;

      default:
        scripts['dev'] = 'vite';
        scripts['build'] = 'vite build';
        scripts['preview'] = 'vite preview';
        break;
    }

    if (options.includeTests) {
      scripts['test'] = 'vitest';
    }

    if (options.includeESLint) {
      scripts['lint'] = 'eslint .';
      scripts['lint:fix'] = 'eslint . --fix';
    }

    if (options.includePrettier) {
      scripts['format'] = 'prettier --write "**/*.{js,jsx,ts,tsx,json,css,md}"';
    }

    return scripts;
  }

  /**
   * Get project configuration
   */
  private getConfiguration(context: TemplateContext): any {
    return {
      framework: context.options.framework,
      typescript: context.options.typescript,
      styling: context.options.styling,
    };
  }

  // Helper methods

  private getFrameworkVersion(framework: Framework): string {
    switch (framework) {
      case Framework.REACT: return '19.0';
      case Framework.NEXT: return '16.0';
      case Framework.VUE: return '3.5';
      case Framework.NUXT: return '4.0';
      case Framework.SVELTE: return '5.0';
      case Framework.REMIX: return '2.15';
      case Framework.ASTRO: return '5.0';
      default: return '';
    }
  }

  private getPackageManagerVersion(pm?: string): string {
    switch (pm) {
      case 'pnpm': return '9.15+';
      case 'yarn': return '4.6+';
      case 'bun': return '1.1+';
      default: return '10.0+'; // npm
    }
  }

  private getPackageManagerString(pm?: string): string {
    const manager = pm || 'pnpm';
    const version = this.getPackageManagerVersion(manager);
    return `${manager}@${version}`;
  }

  private getInstallCommand(pm?: string): string {
    switch (pm) {
      case 'yarn': return 'yarn install';
      case 'bun': return 'bun install';
      case 'npm': return 'npm install';
      default: return 'pnpm install';
    }
  }

  private getDevCommand(pm?: string): string {
    switch (pm) {
      case 'yarn': return 'yarn dev';
      case 'bun': return 'bun dev';
      case 'npm': return 'npm run dev';
      default: return 'pnpm dev';
    }
  }

  private getBuildCommand(pm?: string): string {
    switch (pm) {
      case 'yarn': return 'yarn build';
      case 'bun': return 'bun run build';
      case 'npm': return 'npm run build';
      default: return 'pnpm build';
    }
  }
}