
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { GeminiService } from './services/gemini.service';
import { TemplateService } from './services/template.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  GenerateCodeDto,
  ExportCodeDto,
} from './dto/code-gen.dto';
import {
  Framework,
  CodeGenStatus,
  GeneratedFile,
  TemplateContext,
  AIPromptContext,
} from './types/code-gen.types';
import AdmZip from 'adm-zip';

@Injectable()
export class CodeGenService {
  private readonly logger = new Logger(CodeGenService.name);

  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
    private gemini: GeminiService,
    private template: TemplateService,
    private eventEmitter: EventEmitter2,
  ) {}

  private async getUserFromClerkId(clerkId: string) {
    const user = await this.prisma.user.findUnique({
      where: { clerkId },
      select: { id: true, clerkId: true, name: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private async verifyProjectAccess(userId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        ownerId: userId,
      },
      include: {
        canvas: {
          include: {
            elements: {
              orderBy: [{ parentId: 'asc' }, { order: 'asc' }],
            },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found or access denied');
    }

    return project;
  }

  async generateCode(
    clerkId: string,
    projectId: string,
    dto: GenerateCodeDto,
  ) {
    const user = await this.getUserFromClerkId(clerkId);
    const project = await this.verifyProjectAccess(user.id, projectId);

    if (!project.canvas) {
      throw new BadRequestException('Project has no canvas data');
    }

    const codeGen = await this.prisma.generatedCode.create({
      data: {
        projectId,
        framework: dto.framework,
        files: [],
        dependencies: {},
        status: 'PENDING',
      },
    });

    this.generateCodeAsync(codeGen.id, project, dto).catch((error) => {
      this.logger.error('Code generation failed:', error);
      this.updateCodeGenStatus(codeGen.id, 'FAILED', error.message);
    });

    return {
      id: codeGen.id,
      status: 'PENDING',
      message: 'Code generation started',
    };
  }

  private async generateCodeAsync(
    codeGenId: string,
    project: any,
    dto: GenerateCodeDto,
  ) {
    try {
      await this.updateCodeGenStatus(codeGenId, 'GENERATING');

      const canvas = project.canvas;
      const elements = this.buildElementTree(canvas.elements);

      const context: TemplateContext = {
        projectName: project.name,
        elements,
        styles: canvas.styles,
        breakpoints: canvas.breakpoints,
        options: dto,
        metadata: dto.metadata,
      };

      const projectStructure = this.template.generateProjectStructure(context);

      const componentFiles = await this.generateComponentFiles(
        elements,
        dto,
      );

      // Combine all files
      const allFiles = [...projectStructure.files, ...componentFiles];

      await this.prisma.generatedCode.update({
        where: { id: codeGenId },
        data: {
          status: 'COMPLETED',
          files: allFiles as any,
          dependencies: projectStructure.dependencies as any,
        },
      });

      this.eventEmitter.emit('code.generated', {
        codeGenId,
        projectId: project.id,
        framework: dto.framework,
      });

      this.logger.log(`Code generation completed for ${codeGenId}`);
    } catch (error) {
      throw error;
    }
  }

  private async generateComponentFiles(
    elements: any[],
    options: GenerateCodeDto,
  ): Promise<GeneratedFile[]> {
    const files: GeneratedFile[] = [];

    const appComponent = await this.generateAppComponent(elements, options);
    files.push(appComponent);

    const complexElements = this.getComplexElements(elements);
    
    const componentPromises = complexElements.map(
      async (element) => {
        return this.generateElementComponent(element, options);
      },
    );

    const components = await Promise.all(componentPromises);
    files.push(...components);

    files.push(this.generateEntryFile(options.framework, options.typescript));

    if (options.styling !== 'tailwind') {
      files.push(this.generateGlobalStyles(options.styling));
    }

    return files;
  }

  private async generateAppComponent(
    elements: any[],
    options: GenerateCodeDto,
  ): Promise<GeneratedFile> {
    const ext = options.typescript ? 'tsx' : 'jsx';

    const context: AIPromptContext = {
      element: {
        type: 'app',
        children: elements,
      },
      framework: options.framework,
      styling: options.styling,
      typescript: options.typescript,
      accessibility: options.accessibility || false,
      bestPractices: [
        'Use functional components with hooks',
        'Implement proper prop types',
        'Follow single responsibility principle',
        'Use semantic HTML elements',
        'Optimize for performance',
      ],
    };

    const code = await this.gemini.generateComponentCode(context);

    return {
      path: `src/App.${ext}`,
      content: code,
      language: options.typescript ? 'typescript' : 'javascript',
    };
  }

  private async generateElementComponent(
    element: any,
    options: GenerateCodeDto,
  ): Promise<GeneratedFile> {
    const ext = options.typescript ? 'tsx' : 'jsx';
    const componentName = this.getComponentName(element);

    const context: AIPromptContext = {
      element,
      framework: options.framework,
      styling: options.styling,
      typescript: options.typescript,
      accessibility: options.accessibility || false,
      bestPractices: [
        'Extract reusable components',
        'Use composition over inheritance',
        'Implement proper error boundaries',
        'Handle edge cases',
        'Add loading states',
      ],
    };

    const code = await this.gemini.generateComponentCode(context);

    return {
      path: `src/components/${componentName}.${ext}`,
      content: code,
      language: options.typescript ? 'typescript' : 'javascript',
    };
  }
  private generateEntryFile(
    framework: Framework,
    typescript: boolean,
  ): GeneratedFile {
    const ext = typescript ? 'tsx' : 'jsx';

    let content = '';

    if (framework === Framework.NEXT) {
      content = `export { default } from './App'`;
    } else {
      // Standard React/Vue/Svelte entry
      content = `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}`;
    }

    return {
      path: framework === Framework.NEXT ? `src/pages/index.${ext}` : `src/main.${ext}`,
      content,
      language: typescript ? 'typescript' : 'javascript',
    };
  }

  private generateGlobalStyles(styling: string): GeneratedFile {
    let content = `/* Global Styles */

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}
`;

    if (styling === 'tailwind') {
      content = `@tailwind base;
@tailwind components;
@tailwind utilities;
`;
    }

    return {
      path: 'src/index.css',
      content,
      language: 'css',
    };
  }

  async getPreview(clerkId: string, projectId: string) {
    const user = await this.getUserFromClerkId(clerkId);
    await this.verifyProjectAccess(user.id, projectId);

    const codeGen = await this.prisma.generatedCode.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    if (!codeGen) {
      throw new NotFoundException('No generated code found for this project');
    }

    return {
      id: codeGen.id,
      status: codeGen.status,
      files: codeGen.files,
      framework: codeGen.framework,
      createdAt: codeGen.createdAt,
    };
  }

  async downloadCode(clerkId: string, projectId: string): Promise<Buffer> {
    const user = await this.getUserFromClerkId(clerkId);
     await this.verifyProjectAccess(user.id, projectId);

    const codeGen = await this.prisma.generatedCode.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    if (!codeGen || codeGen.status !== 'COMPLETED') {
      throw new BadRequestException('Code generation not completed');
    }

    // Create ZIP file
    const zip = new AdmZip();
    const files = codeGen.files as unknown as GeneratedFile[];

    files.forEach((file) => {
      zip.addFile(file.path, Buffer.from(file.content, 'utf-8'));
    });

    return zip.toBuffer();
  }

  async exportCode(
    clerkId: string,
    projectId: string,
    dto: ExportCodeDto,
  ) {
    const user = await this.getUserFromClerkId(clerkId);
    await this.verifyProjectAccess(user.id, projectId);

    const codeGen = await this.prisma.generatedCode.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    if (!codeGen || codeGen.status !== 'COMPLETED') {
      throw new BadRequestException('Code generation not completed');
    }

    const files = codeGen.files as unknown as GeneratedFile[];

    switch (dto.format) {
      case 'zip':
        return { type: 'download', message: 'Use download endpoint' };

      case 'github':
        // TODO: Implement GitHub integration
        throw new BadRequestException('GitHub export not yet implemented');

      case 'codesandbox':
        return this.exportToCodeSandbox(files);

      case 'stackblitz':
        return this.exportToStackBlitz(files);

      default:
        throw new BadRequestException('Invalid export format');
    }
  }

  async getDependencies(clerkId: string, projectId: string) {
    const user = await this.getUserFromClerkId(clerkId);
    await this.verifyProjectAccess(user.id, projectId);

    const codeGen = await this.prisma.generatedCode.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    if (!codeGen) {
      throw new NotFoundException('No generated code found');
    }

    return {
      dependencies: codeGen.dependencies,
      framework: codeGen.framework,
    };
  }

  /**
   * Build element tree from flat structure
   */
  private buildElementTree(elements: any[]): any[] {
    const elementMap = new Map();
    const roots: any[] = [];

    elements.forEach((el) => {
      elementMap.set(el.id, { ...el, children: [] });
    });

    elements.forEach((el) => {
      const element = elementMap.get(el.id);
      if (el.parentId) {
        const parent = elementMap.get(el.parentId);
        if (parent) {
          parent.children.push(element);
        } else {
          roots.push(element);
        }
      } else {
        roots.push(element);
      }
    });

    return roots;
  }

  private getComplexElements(elements: any[]): any[] {
    const complexElements: any[] = [];

    const traverse = (element: any) => {
      const isComplex =
        (element.children?.length > 3) || 
        element.type === 'form' || 
        element.type === 'carousel' ||
        element.type === 'modal' ||
        element.type === 'dialog' ||
        element.type === 'tabs';

      if (isComplex) {
        complexElements.push(element);
      }

      if (element.children?.length > 0) {
        element.children.forEach((child: any) => traverse(child));
      }
    };

    elements.forEach((element) => traverse(element));
    return complexElements;
  }

  private getComponentName(element: any): string {
    if (element.name) {
      return element.name.charAt(0).toUpperCase() + element.name.slice(1);
    }

    const typeName = element.type.charAt(0).toUpperCase() + element.type.slice(1);
    return `${typeName}Component`;
  }

  private async updateCodeGenStatus(
    id: string,
    status: string,
    error?: string,
  ) {
    await this.prisma.generatedCode.update({
      where: { id },
      data: {
        status: status as any,
        error,
      },
    });
  }

  private exportToCodeSandbox(files: GeneratedFile[]) {
    const sandboxFiles: Record<string, { content: string }> = {};

    files.forEach((file) => {
      sandboxFiles[file.path] = {
        content: file.content,
      };
    });

    return {
      type: 'codesandbox',
      url: 'https://codesandbox.io/api/v1/sandboxes/define',
      parameters: {
        files: sandboxFiles,
      },
      method: 'POST',
    };
  }

  private exportToStackBlitz(files: GeneratedFile[]) {
    const stackBlitzFiles: Record<string, string> = {};

    files.forEach((file) => {
      stackBlitzFiles[file.path] = file.content;
    });

    return {
      type: 'stackblitz',
      files: stackBlitzFiles,
      url: 'https://stackblitz.com/fork/react',
      method: 'GET',
    };
  }
}