// apps/api/src/modules/code-gen/services/gemini.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  AIPromptContext,
  Framework,
  StylingApproach,
} from '../types/code-gen.types';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');

    if (!apiKey) {
      this.logger.warn('GEMINI_API_KEY not set. Code generation will fail.');
    } else {
      this.genAI = new GoogleGenerativeAI(apiKey);
      // Using latest Gemini 2.0 Flash Experimental
      this.model = this.genAI.getGenerativeModel({
        model: 'gemini-2.0-flash-exp',
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 8192,
        },
      });
    }
  }

  /**
   * Generate component code using Gemini AI with React 19+ best practices
   */
  async generateComponentCode(context: AIPromptContext): Promise<string> {
    try {
      const prompt = this.buildComponentPrompt(context);

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const code = response.text();

      // Clean up the response
      return this.cleanCodeResponse(code);
    } catch (error) {
      this.logger.error('Gemini API error:', error);
      throw new Error('Failed to generate code with Gemini AI');
    }
  }

  /**
   * Generate multiple components in batch
   */
  async generateBatchComponents(
    contexts: AIPromptContext[],
  ): Promise<string[]> {
    // Process in batches of 3 to avoid rate limits
    const batchSize = 3;
    const results: string[] = [];

    for (let i = 0; i < contexts.length; i += batchSize) {
      const batch = contexts.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((context) => this.generateComponentCode(context)),
      );
      results.push(...batchResults);

      // Small delay between batches
      if (i + batchSize < contexts.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Optimize generated code
   */
  async optimizeCode(code: string, language: string): Promise<string> {
    try {
      const prompt = `
You are an expert code optimizer specializing in modern ${language} and React 19+.

Optimize this code for:
- Performance (memoization, lazy loading, code splitting)
- Accessibility (ARIA labels, semantic HTML, keyboard navigation)
- Type safety (strict TypeScript)
- Modern patterns (React 19 features, hooks, Server Components)
- Bundle size (tree-shaking friendly exports)

Code to optimize:
\`\`\`${language}
${code}
\`\`\`

Return ONLY the optimized code without explanations or markdown.
`;

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      return this.cleanCodeResponse(response.text());
    } catch (error) {
      this.logger.error('Code optimization error:', error);
      return code; // Return original if optimization fails
    }
  }

  /**
   * Generate tests for component using Vitest
   */
  async generateTests(
    componentCode: string,
    componentName: string,
    framework: string,
  ): Promise<string> {
    try {
      const prompt = `
Generate comprehensive unit tests for this ${framework} component using Vitest and React Testing Library.

Component code:
\`\`\`typescript
${componentCode}
\`\`\`

Requirements:
- Use Vitest (not Jest)
- Use React Testing Library with React 19
- Test all props variations
- Test user interactions (click, input, etc.)
- Test accessibility (screen reader text, keyboard navigation)
- Test responsive behavior
- Use modern testing patterns (avoid act warnings)
- Use TypeScript
- Include setup and cleanup

Return ONLY the test code without explanations.
File should be named: ${componentName}.test.tsx
`;

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      return this.cleanCodeResponse(response.text());
    } catch (error) {
      this.logger.error('Test generation error:', error);
      throw error;
    }
  }

  /**
   * Build comprehensive prompt for component generation
   */
  private buildComponentPrompt(context: AIPromptContext): string {
    const {
      element,
      framework,
      styling,
      typescript,
      accessibility,
      bestPractices,
      reactVersion = '19',
      useServerComponents = false,
    } = context;

    const language = typescript ? 'TypeScript' : 'JavaScript';
    const extension = typescript ? 'tsx' : 'jsx';

    return `
You are an expert ${framework} developer specializing in React ${reactVersion}+ and modern web development.

ELEMENT SPECIFICATION:
${JSON.stringify(element, null, 2)}

REQUIREMENTS:
- Framework: ${framework}
- React Version: ${reactVersion}
- Language: ${language}
- Styling: ${styling}
- Accessibility: ${accessibility ? 'WCAG 2.1 Level AA compliant' : 'Basic'}
- File extension: .${extension}

${
  framework === Framework.NEXT && useServerComponents
    ? `
NEXT.JS 16 SPECIFIC:
- Use Server Components by default (async function components)
- Only add 'use client' directive if component uses:
  * useState, useEffect, or other React hooks
  * Event handlers (onClick, onChange, etc.)
  * Browser-only APIs
- Use Server Actions for form submissions
- Leverage React 19's async components
`
    : ''
}

REACT 19+ FEATURES TO USE:
- Use the new 'use' hook for data fetching in Server Components
- Use useActionState for form handling
- Use useOptimistic for optimistic UI updates
- Prefer async Server Components over useEffect
- Use React.cache for deduplication
- Automatic batching (no need for extra handling)

BEST PRACTICES TO FOLLOW:
${bestPractices.map((practice) => `- ${practice}`).join('\n')}
- Use React 19+ features and patterns
- Implement proper error boundaries
- Add loading states with Suspense
- Use modern TypeScript (5.7+)
- Optimize for Core Web Vitals
- Implement proper SEO tags if applicable
- Use semantic HTML5 elements
- Follow component composition patterns
- Extract reusable logic into custom hooks
- Use proper TypeScript generics where needed

STYLING RULES:
${this.getStylingRules(styling)}

${
  framework === Framework.NEXT
    ? `
NEXT.JS 16 FEATURES:
- Use next/image for all images
- Use next/link for navigation
- Use next/font for font optimization
- Leverage automatic code splitting
- Use Turbopack optimizations
- Implement proper metadata API
`
    : ''
}

STRUCTURE:
1. File header with 'use client' or 'use server' if needed
2. Import statements (group by: React, external libs, internal)
3. Type definitions (if TypeScript)
4. Component definition with proper JSDoc
5. Prop validation with TypeScript interfaces
6. Export statement

CODE QUALITY:
- Write production-ready code
- Add comprehensive TypeScript types
- Include JSDoc comments for complex logic
- Handle edge cases and errors
- Add proper loading and error states
- Optimize for performance (memo, lazy, etc.)
- Make it accessible
- Make it responsive
- Follow modern React patterns

IMPORTANT:
- Return ONLY the code without explanations
- NO markdown code blocks in output
- NO additional text or commentary
- Production-ready, copy-paste ready code

Generate the complete, production-ready component now:
`;
  }

  /**
   * Get styling-specific rules with latest versions
   */
  private getStylingRules(styling: string): string {
    switch (styling) {
      case StylingApproach.TAILWIND:
        return `
TAILWIND CSS 4 (CSS-FIRST CONFIG):
- Use Tailwind 4 utility classes
- Leverage @theme directive for custom values
- Use modern responsive modifiers (sm:, md:, lg:)
- Use color opacity modifiers (bg-blue-500/50)
- Use arbitrary values [value] when needed
- Follow container queries pattern
- Use @apply sparingly (prefer utility classes)
- Implement dark mode with dark: prefix
- Use modern space and sizing utilities
- Leverage new Tailwind 4 features
`;

      case StylingApproach.CSS_MODULES:
        return `
CSS MODULES:
- Import styles: import styles from './Component.module.css'
- Use camelCase class names
- Scope all styles to component
- Use CSS custom properties for theming
- Leverage :global() for global styles
- Use composes for style composition
`;

      case StylingApproach.STYLED_COMPONENTS:
        return `
STYLED COMPONENTS 6:
- Use styled-components v6+ syntax
- Create styled components with proper TypeScript types
- Use props for dynamic styling with type safety
- Leverage theme provider for global styles
- Use css helper for reusable styles
- Implement proper transient props ($prop)
`;

      case StylingApproach.EMOTION:
        return `
EMOTION 11:
- Use @emotion/react v11+
- Use css prop for styling
- Leverage theme with useTheme hook
- Use keyframes for animations
- Implement proper TypeScript support
- Use Global component for global styles
`;

      case StylingApproach.PANDA_CSS:
        return `
PANDA CSS:
- Use Panda CSS atomic styling
- Leverage styled system props
- Use recipes for component variants
- Implement proper TypeScript types
- Use tokens for design system
`;

      case StylingApproach.UNO_CSS:
        return `
UNO CSS:
- Use UnoCSS utility classes
- Leverage preset-mini utilities
- Use shortcuts for common patterns
- Implement proper Tailwind compatibility
`;

      default:
        return '- Use modern CSS with custom properties and container queries';
    }
  }

  /**
   * Clean code response from AI
   */
  private cleanCodeResponse(code: string): string {
    // Remove markdown code blocks
    let cleaned = code.replace(/```[\w]*\n/g, '').replace(/```\n?/g, '');

    // Remove leading/trailing whitespace
    cleaned = cleaned.trim();

    // Remove any explanatory text before the code
    const codePatterns = [
      /^(import|export|const|function|class|interface|type|\/\/|\/\*)/m,
      /^'use (client|server)'/m,
    ];

    for (const pattern of codePatterns) {
      const codeStart = cleaned.search(pattern);
      if (codeStart > 0) {
        cleaned = cleaned.substring(codeStart);
        break;
      }
    }

    return cleaned;
  }

  /**
   * Validate API key is configured
   */
  isConfigured(): boolean {
    return !!this.genAI && !!this.model;
  }

  /**
   * Get model info
   */
  getModelInfo() {
    return {
      configured: this.isConfigured(),
      model: 'gemini-2.0-flash-exp',
      provider: 'Google Generative AI',
      features: [
        'React 19+ support',
        'Next.js 16 support',
        'Server Components',
        'Modern TypeScript',
        'Latest framework versions',
      ],
    };
  }

  /**
   * Generate Server Component (Next.js 16)
   */
  async generateServerComponent(element: any, options: any): Promise<string> {
    const context: AIPromptContext = {
      element,
      framework: Framework.NEXT,
      styling: options.styling,
      typescript: options.typescript,
      accessibility: options.accessibility,
      bestPractices: [
        'Use async Server Components',
        'Fetch data directly in component',
        'Use React.cache for deduplication',
        'Implement proper error boundaries',
        'Add loading.tsx for Suspense',
      ],
      reactVersion: '19',
      useServerComponents: true,
    };

    return this.generateComponentCode(context);
  }

  /**
   * Generate Client Component with proper 'use client' directive
   */
  async generateClientComponent(element: any, options: any): Promise<string> {
    const code = await this.generateComponentCode({
      element,
      framework: options.framework,
      styling: options.styling,
      typescript: options.typescript,
      accessibility: options.accessibility,
      bestPractices: [
        'Add "use client" directive at top',
        'Use React 19 hooks properly',
        'Implement proper event handlers',
        'Add loading and error states',
        'Optimize with useMemo and useCallback',
      ],
      reactVersion: '19',
      useServerComponents: false,
    });

    // Ensure 'use client' is at the top
    if (!code.startsWith("'use client'") && !code.startsWith('"use client"')) {
      return `'use client'\n\n${code}`;
    }

    return code;
  }
}
