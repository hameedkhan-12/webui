import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIPromptContext } from '../types/code-gen.types';

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
      this.model = this.genAI.getGenerativeModel({
        model: 'gemini-2.0-flash-exp',
      });
    }
  }

  /**
   * Generate component code using Gemini AI
   */
  async generateComponentCode(context: AIPromptContext): Promise<string> {
    try {
      const prompt = this.buildComponentPrompt(context);

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const code = response.text();

      // Clean up the response (remove markdown code blocks if present)
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
    const promises = contexts.map((context) =>
      this.generateComponentCode(context),
    );

    return Promise.all(promises);
  }

  /**
   * Optimize generated code
   */
  async optimizeCode(code: string, language: string): Promise<string> {
    try {
      const prompt = `
You are an expert code optimizer. Optimize the following ${language} code for:
- Performance
- Readability
- Best practices
- Accessibility
- Type safety

Code:
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
   * Generate tests for component
   */
  async generateTests(
    componentCode: string,
    componentName: string,
    framework: string,
  ): Promise<string> {
    try {
      const prompt = `
Generate comprehensive unit tests for this ${framework} component using Jest and React Testing Library.

Component code:
\`\`\`typescript
${componentCode}
\`\`\`

Requirements:
- Test all props variations
- Test user interactions
- Test accessibility
- Test responsive behavior
- Use modern testing best practices

Return ONLY the test code without explanations.
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
   * Build prompt for component generation
   */
  private buildComponentPrompt(context: AIPromptContext): string {
    const {
      element,
      framework,
      styling,
      typescript,
      accessibility,
      bestPractices,
    } = context;

    const language = typescript ? 'TypeScript' : 'JavaScript';
    const extension = typescript ? 'tsx' : 'jsx';

    return `
You are an expert ${framework} developer. Generate a production-ready component based on this specification.

ELEMENT SPECIFICATION:
${JSON.stringify(element, null, 2)}

REQUIREMENTS:
- Framework: ${framework}
- Language: ${language}
- Styling: ${styling}
- Accessibility: ${accessibility ? 'WCAG 2.1 Level AA compliant' : 'Basic'}
- File extension: .${extension}

BEST PRACTICES TO FOLLOW:
${bestPractices.map((practice) => `- ${practice}`).join('\n')}

STYLING RULES:
${this.getStylingRules(styling)}

STRUCTURE:
1. Import statements
2. Type definitions (if TypeScript)
3. Component definition
4. Prop validation
5. Export statement

IMPORTANT:
- Use semantic HTML
- Include proper ARIA labels if accessibility is enabled
- Make it responsive
- Follow ${framework} best practices
- Use modern ES6+ syntax
- Add JSDoc comments
- Return ONLY the code without explanations
- No markdown code blocks in output

Generate the complete, production-ready component now:
`;
  }

  /**
   * Get styling-specific rules
   */
  private getStylingRules(styling: string): string {
    switch (styling) {
      case 'tailwind':
        return `
- Use Tailwind CSS utility classes
- Follow Tailwind best practices
- Use responsive modifiers (sm:, md:, lg:)
- Use Tailwind's spacing scale
- Don't use inline styles
        `;
      case 'css-modules':
        return `
- Import styles from CSS module
- Use camelCase class names
- Scope all styles to component
- Use CSS variables for theming
        `;
      case 'styled-components':
        return `
- Use styled-components for styling
- Create styled components for each element
- Use props for dynamic styling
- Follow styled-components best practices
        `;
      case 'emotion':
        return `
- Use @emotion/react for styling
- Use css prop for styling
- Follow Emotion best practices
        `;
      default:
        return '- Use inline styles or CSS as appropriate';
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
    const codeStart = cleaned.search(
      /^(import|export|const|function|class|interface|type)/m,
    );
    if (codeStart > 0) {
      cleaned = cleaned.substring(codeStart);
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
    };
  }
}
