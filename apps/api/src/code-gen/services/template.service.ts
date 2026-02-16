
import { Injectable, Logger } from '@nestjs/common';
import {
  Framework,
  StylingApproach,
  GeneratedFile,
  ProjectStructure,
  TemplateContext,
} from '../types/code-gen.types';

@Injectable()
export class TemplateService {
  generateProjectStructure(context: TemplateContext): ProjectStructure {
    const { framework, options } = context;

    const files: GeneratedFile[] = [];

    files.push(this.generatePackageJson(context));

    // Generate tsconfig.json if TypeScript
    if (options.typescript) {
      files.push(this.generateTsConfig(framework as Framework));
    }

    // Generate framework-specific config
    files.push(...this.generateFrameworkConfig(context));

    // Generate .gitignore
    files.push(this.generateGitignore());

    // Generate README
    files.push(this.generateReadme(context));

    // Generate styling config
    files.push(...this.generateStylingConfig(context));

    return {
      framework: framework as Framework,
      files,
      dependencies: this.getDependencies(context),
      devDependencies: this.getDevDependencies(context),
      scripts: this.getScripts(framework as Framework),
      configuration: this.getConfiguration(context),
    };
  }

  /**
   * Generate package.json
   */
  private generatePackageJson(context: TemplateContext): GeneratedFile {
    const { projectName, options, framework } = context;

    const packageJson = {
      name: projectName.toLowerCase().replace(/\s+/g, '-'),
      version: '1.0.0',
      private: true,
      description: context.metadata?.description || 'Generated with AI',
      author: context.metadata?.author || '',
      scripts: this.getScripts(framework as Framework),
      dependencies: this.getDependencies(context),
      devDependencies: this.getDevDependencies(context),
      keywords: context.metadata?.keywords || [],
      license: 'MIT',
    };

    return {
      path: 'package.json',
      content: JSON.stringify(packageJson, null, 2),
      language: 'json',
    };
  }

  /**
   * Generate tsconfig.json
   */
  private generateTsConfig(framework: Framework): GeneratedFile {
    const baseConfig = {
      compilerOptions: {
        target: 'ES2020',
        lib: ['ES2020', 'DOM', 'DOM.Iterable'],
        jsx: 'react-jsx',
        module: 'ESNext',
        moduleResolution: 'bundler',
        resolveJsonModule: true,
        allowJs: true,
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        skipLibCheck: true,
        allowSyntheticDefaultImports: true,
        forceConsistentCasingInFileNames: true,
        isolatedModules: true,
      },
      include: ['src'],
      exclude: ['node_modules'],
    };

    // Framework-specific adjustments
    if (framework === Framework.NEXT) {
      baseConfig.compilerOptions.jsx = 'preserve';
      (baseConfig as any).compilerOptions.incremental = true;
      (baseConfig as any).compilerOptions.plugins = [{ name: 'next' }];
      baseConfig.include = ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'];
    }

    return {
      path: 'tsconfig.json',
      content: JSON.stringify(baseConfig, null, 2),
      language: 'json',
    };
  }

  /**
   * ///////////////////////// Generate framework-specific configuration
   */
  private generateFrameworkConfig(context: TemplateContext): GeneratedFile[] {
    const { framework, options } = context;
    const files: GeneratedFile[] = [];

    switch (framework) {
      case Framework.NEXT:
        files.push({
          path: 'next.config.js',
          content: this.getNextConfig(options),
          language: 'javascript',
        });
        break;

      case Framework.REACT:
      case Framework.VUE:
      case Framework.SVELTE:
        files.push({
          path: 'vite.config.ts',
          content: this.getViteConfig(framework, options),
          language: 'typescript',
        });
        break;
    }

    return files;
  }

  /**
   * ////////////////////////////////////// Generate styling configuration
   */
  private generateStylingConfig(context: TemplateContext): GeneratedFile[] {
    const { options } = context;
    const files: GeneratedFile[] = [];

    if (options.styling === StylingApproach.TAILWIND) {
      // tailwind.config.js
      files.push({
        path: 'tailwind.config.js',
        content: this.getTailwindConfig(context),
        language: 'javascript',
      });

      // postcss.config.js
      files.push({
        path: 'postcss.config.js',
        content: `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`,
        language: 'javascript',
      });
    }

    return files;
  }

  /**
   * ///////////////////////////////////// Get Tailwind configuration
   */
  private getTailwindConfig(context: TemplateContext): string {
    const { breakpoints, options } = context;

    return `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './public/index.html',
  ],
  theme: {
    extend: {
      screens: {
        sm: '${breakpoints?.mobile || 640}px',
        md: '${breakpoints?.tablet || 768}px',
        lg: '${breakpoints?.desktop || 1024}px',
      },
    },
  },
  plugins: [],
  ${options.darkMode ? "darkMode: 'class'," : ''}
}`;
  }

  /**
   * Get Next.js configuration
   */
  private getNextConfig(options: any): string {
    return `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  ${options.i18n ? "i18n: {\n    locales: ['en', 'es', 'fr'],\n    defaultLocale: 'en',\n  }," : ''}
  images: {
    domains: [],
  },
}

module.exports = nextConfig`;
  }

  /**
   * Get Vite configuration
   */
  private getViteConfig(framework: Framework, options: any): string {
    let plugin = '';

    switch (framework) {
      case Framework.REACT:
        plugin = "import react from '@vitejs/plugin-react'";
        break;
      case Framework.VUE:
        plugin = "import vue from '@vitejs/plugin-vue'";
        break;
      case Framework.SVELTE:
        plugin = "import { svelte } from '@sveltejs/vite-plugin-svelte'";
        break;
    }

    return `import { defineConfig } from 'vite'
${plugin}

export default defineConfig({
  plugins: [${framework}()],
  server: {
    port: 3000,
  },
})`;
  }

  /**
   * Generate .gitignore
   */
  private generateGitignore(): GeneratedFile {
    return {
      path: '.gitignore',
      content: `# Dependencies
node_modules/
/.pnp
.pnp.js

# Testing
/coverage

# Production
/build
/dist
/.next/
/out/

# Misc
.DS_Store
*.pem

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Local env files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# IDE
.vscode/
.idea/
*.swp
*.swo`,
      language: 'javascript',
    };
  }

  /**
   * //////////////////////// Generate README
   */
  private generateReadme(context: TemplateContext): GeneratedFile {
    const { projectName, options, framework } = context;

    return {
      path: 'README.md',
      content: `# ${projectName}

Generated with AI-powered code generation.

## Tech Stack

- Framework: ${framework}
- Styling: ${options.styling}
- Language: ${options.typescript ? 'TypeScript' : 'JavaScript'}

## Getting Started

\`\`\`bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
\`\`\`

## Features

${options.seo ? '- ✅ SEO optimized' : ''}
${options.accessibility ? '- ✅ Accessibility (WCAG 2.1)' : ''}
${options.darkMode ? '- ✅ Dark mode support' : ''}
${options.i18n ? '- ✅ Internationalization' : ''}
${options.responsiveBreakPoints ? '- ✅ Responsive design' : ''}

## License

MIT
`,
      language: 'javascript',
    };
  }

  /**
   * ///////////////////// Get dependencies based on options
   */
  private getDependencies(context: TemplateContext): Record<string, string> {
    const { framework, options } = context;
    const deps: Record<string, string> = {};

    // Base framework dependencies
    switch (framework) {
      case Framework.REACT:
        deps['react'] = '^18.3.1';
        deps['react-dom'] = '^18.3.1';
        break;
      case Framework.NEXT:
        deps['next'] = '^14.2.0';
        deps['react'] = '^18.3.1';
        deps['react-dom'] = '^18.3.1';
        break;
      case Framework.VUE:
        deps['vue'] = '^3.4.0';
        break;
      case Framework.NUXT:
        deps['nuxt'] = '^3.11.0';
        break;
      case Framework.SVELTE:
        deps['svelte'] = '^4.2.0';
        break;
    }

    // Styling dependencies
    switch (options.styling) {
      case StylingApproach.TAILWIND:
        deps['tailwindcss'] = '^3.4.0';
        deps['autoprefixer'] = '^10.4.0';
        deps['postcss'] = '^8.4.0';
        break;
      case StylingApproach.STYLED_COMPONENTS:
        deps['styled-components'] = '^6.1.0';
        break;
      case StylingApproach.EMOTION:
        deps['@emotion/react'] = '^11.11.0';
        deps['@emotion/styled'] = '^11.11.0';
        break;
      case StylingApproach.SASS:
        deps['sass'] = '^1.70.0';
        break;
    }

    return deps;
  }

  /**
   * ////////////////////////// Get dev dependencies
   */
  private getDevDependencies(context: TemplateContext): Record<string, string> {
    const { framework, options } = context;
    const devDeps: Record<string, string> = {};

    if (options.typescript) {
      devDeps['typescript'] = '^5.4.0';
      devDeps['@types/react'] = '^18.3.0';
      devDeps['@types/react-dom'] = '^18.3.0';
      devDeps['@types/node'] = '^20.12.0';
    }

    // Build tools
    if (framework !== Framework.NEXT) {
      devDeps['vite'] = '^5.2.0';
      
      switch (framework) {
        case Framework.REACT:
          devDeps['@vitejs/plugin-react'] = '^4.2.0';
          break;
        case Framework.VUE:
          devDeps['@vitejs/plugin-vue'] = '^5.0.0';
          break;
        case Framework.SVELTE:
          devDeps['@sveltejs/vite-plugin-svelte'] = '^3.1.0';
          break;
      }
    }

    // Testing
    if (options.includeTests) {
      devDeps['@testing-library/react'] = '^15.0.0';
      devDeps['@testing-library/jest-dom'] = '^6.4.0';
      devDeps['vitest'] = '^1.5.0';
    }

    return devDeps;
  }

  /**
   * Get npm scripts
   */
  private getScripts(framework: Framework): Record<string, string> {
    const scripts: Record<string, string> = {};

    switch (framework) {
      case Framework.NEXT:
        scripts['dev'] = 'next dev';
        scripts['build'] = 'next build';
        scripts['start'] = 'next start';
        scripts['lint'] = 'next lint';
        break;

      default:
        scripts['dev'] = 'vite';
        scripts['build'] = 'vite build';
        scripts['preview'] = 'vite preview';
        break;
    }

    scripts['test'] = 'vitest';

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
}