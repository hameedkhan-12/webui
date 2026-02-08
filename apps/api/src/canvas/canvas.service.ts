import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CacheService } from 'src/cache/cache.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateElementDto } from './dto/canvas.dto';

@Injectable()
export class CanvasService {
  private readonly logger = new Logger(CanvasService.name);

  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
    private eventEmitter: EventEmitter2,
  ) {}

  private async getUserFromClerkId(clerkId: string) {
    const user = await this.prisma.user.findUnique({
      where: { clerkId },
      select: {
        id: true,
        clerkId: true,
        name: true,
      },
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
    });

    if (!project) {
      throw new NotFoundException('Project not found or access denied');
    }

    return project;
  }

  private async getOrCreateCanvas(projectId: string) {
    const cacheKey = `canvas:${projectId}`;
    const cached = await this.cache.get<any>(cacheKey);

    if (cached) {
      this.logger.debug(`Using cached canvas for project ${projectId}`);
      return cached;
    }

    let canvas = await this.prisma.canvas.findUnique({
      where: {
        projectId,
      },
      include: {
        elements: {
          orderBy: [
            {
              parentId: 'asc',
            },
            {
              order: 'asc',
            },
          ],
        },
      },
    });

    if (!canvas) {
      canvas = await this.prisma.canvas.create({
        data: {
          projectId,
          elements: {
            create: [],
          },
          styles: {},
          breakpoints: {
            mobile: 640,
            tablet: 768,
            desktop: 1024,
          },
        },
        include: {
          elements: true,
        },
      });
    }

    await this.cache.set(cacheKey, canvas, 300);
    return canvas;
  }

  private async invalidateCanvasCache(projectId: string) {
    await this.cache.del(`canvas:${projectId}`);
  }

  async getCanvas(clerkId: string, projectId: string, includeHidden = false) {
    const user = await this.getUserFromClerkId(clerkId);
    await this.verifyProjectAccess(user.id, projectId);

    const canvas = await this.getOrCreateCanvas(projectId);

    let elements = canvas.elements;
    if (!includeHidden) {
      elements = elements.filter((el) => !el.hidden);
    }

    return {
      id: canvas.id,
      projectId: canvas.projectId,
      elements: this.buildElementTree(elements),
      styles: canvas.styles,
      breakpoints: canvas.breakpoints,
      version: canvas.version,
      updatedAt: canvas.updatedAt,
    };
  }

  private buildElementTree(elements: any[]): any[] {
    const elementMap = new Map<string, any>();
    const rootElements: any[] = [];

    elements.forEach((element) => {
      elementMap.set(element.id, { ...element, children: [] });
    });

    elements.forEach((el) => {
      const element = elementMap.get(el.id);
      if (el.parentId) {
        const parent = elementMap.get(el.parentId);
        if (parent) {
          parent.children.push(element);
        } else {
          rootElements.push(element);
        }
      } else {
        rootElements.push(element);
      }
    });

    const sortChildren = (elements: any[]) => {
      elements.sort((a, b) => a.order - b.order);
      elements.forEach((el) => {
        if (el.children.length > 0) {
          sortChildren(el.children);
        }
      });
    };

    sortChildren(rootElements);

    return rootElements;
  }

  async createElement(
    clerkId: string,
    projectId: string,
    dto: CreateElementDto,
    sessionId: string,
  ) {
    const user = await this.getUserFromClerkId(clerkId);
    await this.verifyProjectAccess(user.id, projectId);

    const canvas = await this.getOrCreateCanvas(projectId);
    if (dto.parentId) {
      const parent = await this.prisma.canvasElement.findUnique({
        where: {
          id: dto.parentId,
        },
      });

      if (!parent || parent.canvasId !== canvas.id) {
        throw new BadRequestException('Invalid Parent Element');
      }
    }

    let order = dto.order;
    if(order === undefined){
      const siblings = await this.prisma.canvasElement.findMany({
        where: {
          parentId: dto.parentId,
        },
        orderBy: {
          order: 'desc',
        },
        take: 1,
      })

      order = siblings.length > 0 ? siblings[0].order + 1 : 0;
    }
  }
}
