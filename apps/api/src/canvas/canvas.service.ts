import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CacheService } from 'src/cache/cache.service';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  BulkElementOperation,
  BulkElementOperationDto,
  CreateElementDto,
  LockElementDto,
  UpdateElementDto,
  UpdateStylesDto,
} from './dto/canvas.dto';
import { BulkOperationType } from './types/canvas.types';
import { Prisma } from '@webra/database';

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
    if (order === undefined) {
      const siblings = await this.prisma.canvasElement.findMany({
        where: {
          parentId: dto.parentId,
        },
        orderBy: {
          order: 'desc',
        },
        take: 1,
      });

      order = siblings.length > 0 ? siblings[0].order + 1 : 0;
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const element = await tx.canvasElement.create({
        data: {
          canvasId: canvas.id,
          type: dto.type,
          name: dto.name,
          props: dto.props as any,
          styles: dto.styles || {},
          parentId: dto.parentId,
          order,
          locked: dto.locked || false,
          hidden: dto.hidden || false,
          responsiveStyles: dto.responsiveStyles || {},
          createdBy: user.id,
        },
      });

      await tx.canvasChange.create({
        data: {
          canvasId: canvas.id,
          userId: user.id,
          operation: BulkOperationType.CREATE,
          elementId: element.id,
          after: element as any,
          sessionId,
          timestamp: new Date(),
        },
      });

      await tx.canvas.update({
        where: {
          id: canvas.id,
        },
        data: {
          version: {
            increment: 1,
          },
          updatedAt: new Date(),
        },
      });

      return element;
    });

    await this.invalidateCanvasCache(projectId);

    this.eventEmitter.emit('canvas.element.created', {
      projectId,
      elementId: result.id,
      userId: user.id,
      sessionId,
    });
    return result;
  }

  async updateElement(
    clerkId: string,
    projectId: string,
    elementId: string,
    dto: UpdateElementDto,
    sessionId: string,
  ) {
    const user = await this.getUserFromClerkId(clerkId);
    await this.verifyProjectAccess(user.id, projectId);

    const canvas = await this.getOrCreateCanvas(projectId);

    const lock = await this.prisma.elementLock.findUnique({
      where: {
        elementId,
      },
    });

    if (lock && lock.userId !== user.id && lock.expiresAt > new Date()) {
      throw new ConflictException(
        `Element is locked by ${lock.userName} until ${lock.expiresAt.toISOString()}`,
      );
    }

    const currentElement = await this.prisma.canvasElement.findUnique({
      where: {
        id: elementId,
      },
    });
    if (!currentElement || currentElement.canvasId !== canvas.id) {
      throw new NotFoundException('Element not found');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.canvasElement.update({
        where: {
          id: elementId,
        },
        data: {
          ...dto,
          updatedBy: user.id,
          updatedAt: new Date(),
        },
      });

      await tx.canvasChange.create({
        data: {
          canvasId: canvas.id,
          userId: user.id,
          operation: BulkOperationType.UPDATE,
          elementId,
          before: currentElement as any,
          after: updated as any,
          sessionId,
          timestamp: new Date(),
        },
      });

      await tx.canvas.update({
        where: { id: canvas.id },
        data: {
          version: {
            increment: 1,
          },
        },
      });

      await this.invalidateCanvasCache(projectId);

      this.eventEmitter.emit('canvas.element.updated', {
        projectId,
        elementId,
        userId: user.id,
        sessionId,
      });
    });

    return result;
  }

  async deleteElement(
    clerkId: string,
    projectId: string,
    elementId: string,
    sessionId: string,
  ) {
    const user = await this.getUserFromClerkId(clerkId);
    await this.verifyProjectAccess(user.id, projectId);

    const canvas = await this.getOrCreateCanvas(projectId);

    const element = await this.prisma.canvasElement.findUnique({
      where: {
        id: elementId,
      },
    });

    if (!element || element.canvasId !== canvas.id) {
      throw new NotFoundException('Element not found');
    }

    const descendants = await this.getDescendants(canvas.id, elementId);
    const allIds = [elementId, ...descendants.map((el) => el.id)];

    await this.prisma.$transaction(async (tx) => {
      await tx.elementLock.deleteMany({
        where: {
          elementId: {
            in: allIds,
          },
        },
      });

      await tx.canvasElement.deleteMany({
        where: {
          id: {
            in: allIds,
          },
        },
      });

      await tx.canvasChange.create({
        data: {
          canvasId: canvas.id,
          userId: user.id,
          operation: BulkOperationType.DELETE,
          elementId,
          before: element as any,
          sessionId,
          timestamp: new Date(),
        },
      });

      await tx.canvas.update({
        where: { id: canvas.id },
        data: {
          version: {
            increment: 1,
          },
        },
      });

      await this.invalidateCanvasCache(projectId);

      this.eventEmitter.emit('canvas.element.deleted', {
        projectId,
        elementId,
        userId: user.id,
        sessionId,
      });
    });
    return {
      message: 'Element deleted successfully',
      deletedCount: allIds.length,
    };
  }

  private async getDescendants(
    canvasId: string,
    parentId: string,
  ): Promise<any[]> {
    const children = await this.prisma.canvasElement.findMany({
      where: {
        canvasId,
        parentId,
      },
    });
    const descendants = [...children];
    for (const child of children) {
      const childDescendants = await this.getDescendants(canvasId, child.id);
      descendants.push(...childDescendants);
    }
    return descendants;
  }

  async bulkOperations(
    clerkId: string,
    projectId: string,
    dto: BulkElementOperationDto,
  ) {
    const user = await this.getUserFromClerkId(clerkId);
    await this.verifyProjectAccess(user.id, projectId);

    const canvas = await this.getOrCreateCanvas(projectId);

    await this.validateBulkOperations(canvas.id, dto.operations);

    const results = await this.prisma.$transaction(
      async (tx) => {
        const opResults: any[] = [];

        for (const operation of dto.operations) {
          let result: any;
          switch (operation.type) {
            case BulkOperationType.CREATE:
              result = await tx.canvasElement.create({
                data: {
                  canvasId: canvas.id,
                  ...operation.data,
                  createdBy: user.id,
                },
              });
              break;
            case BulkOperationType.UPDATE:
              result = await tx.canvasElement.update({
                where: {
                  id: operation.elementId!,
                },
                data: {
                  ...operation.data,
                  updatedBy: user.id,
                },
              });
              break;

            case BulkOperationType.DELETE:
              result = await tx.canvasElement.delete({
                where: {
                  id: operation.elementId!,
                },
              });
              break;

            case BulkOperationType.MOVE:
              result = await tx.canvasElement.update({
                where: {
                  id: operation.elementId!,
                },
                data: {
                  parentId: operation.data?.newParentId || null,
                  order: operation.data?.newOrder || 0,
                  updatedBy: user.id,
                },
              });
              break;

            case BulkOperationType.REORDER:
              result = await tx.canvasElement.update({
                where: {
                  id: operation.elementId!,
                },
                data: {
                  order: operation.data?.newOrder || 0,
                  updatedBy: user.id,
                },
              });
              break;
          }
          await tx.canvasChange.create({
            data: {
              canvasId: canvas.id,
              userId: user.id,
              operation: operation.type,
              elementId: operation.elementId,
              after: result as any,
              sessionId: dto.sessionId,
              timestamp: new Date(),
            },
          });

          opResults.push(result);
        }

        await tx.canvas.update({
          where: { id: canvas.id },
          data: { version: { increment: 1 } },
        });

        return opResults;
      },
      {
        timeout: 30000,
      },
    );

    await this.invalidateCanvasCache(projectId);
    this.eventEmitter.emit('canvas.bulk.updated', {
      projectId,
      userId: user.id,
      sessionId: dto.sessionId,
      operationCount: dto.operations.length,
    });

    return {
      success: true,
      results,
      operationCount: dto.operations.length,
    };
  }

  private async validateBulkOperations(
    canvasId: string,
    operations: BulkElementOperation[],
  ) {
    const elementIds = operations
      .filter((op) => op.elementId)
      .map((op) => op.elementId!);

    if (elementIds.length > 0) {
      const elements = await this.prisma.canvasElement.findMany({
        where: {
          id: { in: elementIds },
          canvasId,
        },
      });

      if (elements.length !== new Set(elementIds).size) {
        throw new BadRequestException('One or more elements not found');
      }
    }

    const moveOps = operations.filter(
      (op) => op.type === BulkOperationType.MOVE,
    );
    for (const op of moveOps) {
      if (op.data?.newParentId === op.elementId) {
        throw new BadRequestException('Cannot move an element to itself');
      }
    }
  }

  async unlockElement(clerkId: string, projectId: string, elementId: string) {
    const user = await this.getUserFromClerkId(clerkId);
    await this.verifyProjectAccess(user.id, projectId);

    const lock = await this.prisma.elementLock.findUnique({
      where: { elementId },
    });

    if (!lock) {
      return {
        message: 'Element is not locked',
      };
    }

    if (lock.userId !== user.id) {
      throw new ConflictException('You do not own this lock');
    }

    await this.prisma.elementLock.delete({
      where: {
        elementId,
      },
    });

    this.eventEmitter.emit('canvas.element.unlocked', {
      projectId,
      elementId,
      userId: user.id,
    });

    return {
      message: 'Element Unlocked Successfully',
    };
  }

  async cleanupExpiredLocks(): Promise<number> {
    const result = await this.prisma.elementLock.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    this.logger.log(`Cleaned up ${result.count} expired locks`);
    return result.count;
  }

  async getChangeHistory(clerkId: string, projectId: string, limit = 50) {
    const user = await this.getUserFromClerkId(clerkId);
    await this.verifyProjectAccess(user.id, projectId);

    const canvas = await this.getOrCreateCanvas(projectId);

    const changes = await this.prisma.canvasChange.findMany({
      where: {
        canvasId: canvas.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    return changes;
  }

  async undo(clerkId: string, projectId: string, sessionId: string) {
    const user = await this.getUserFromClerkId(clerkId);
    await this.verifyProjectAccess(user.id, projectId);

    const canvas = await this.getOrCreateCanvas(projectId);

    const where: any = { canvasId: canvas.id };
    if (sessionId) {
      where.sessionId = sessionId;
    }

    const lastChange = await this.prisma.canvasChange.findFirst({
      where,
      orderBy: { timestamp: 'desc' },
    });
    if (!lastChange) {
      throw new BadRequestException('No changes found');
    }

    await this.prisma.$transaction(async (tx) => {
      if (lastChange.operation === BulkOperationType.CREATE) {
        await tx.canvasElement.delete({
          where: {
            id: lastChange.elementId!,
          },
        });
      } else if (lastChange.operation === BulkOperationType.DELETE) {
        if (lastChange.before) {
          await tx.canvasElement.create({
            data: lastChange.before as any,
          });
        }
      } else if (lastChange.operation === BulkOperationType.UPDATE) {
        if (lastChange.before && lastChange.elementId) {
          await tx.canvasElement.update({
            where: {
              id: lastChange.elementId,
            },
            data: lastChange.before as any,
          });
        }
      }

      await tx.canvasChange.delete({
        where: {
          id: lastChange.id,
        },
      });

      await tx.canvas.update({
        where: {
          id: canvas.id,
        },
        data: {
          version: {
            increment: 1,
          },
        },
      });
    });

    await this.invalidateCanvasCache(projectId);

    return {
      message: 'Change undone successfully',
    };
  }

  async updateStyles(clerkId: string, projectId: string, dto: UpdateStylesDto) {
    const user = await this.getUserFromClerkId(clerkId);
    await this.verifyProjectAccess(user.id, projectId);

    const canvas = await this.getOrCreateCanvas(projectId);

    const currentStyles = (canvas.styles as any) || {};
    const mergedStyles = { ...currentStyles, ...dto.styles };

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.canvas.update({
        where: {
          id: canvas.id,
        },
        data: {
          styles: mergedStyles,
        },
      });

      await tx.canvasChange.create({
        data: {
          canvasId: canvas.id,
          userId: user.id,
          operation: 'update',
          before: { styles: currentStyles },
          after: { styles: mergedStyles },
          sessionId: `style-update-${Date.now()}`,
          timestamp: new Date(),
        },
      });

      await tx.canvas.update({
        where: {
          id: canvas.id,
        },
        data: {
          version: {
            increment: 1,
          },
        },
      });
      return result;
    });

    await this.invalidateCanvasCache(projectId);

    this.eventEmitter.emit('canvas.styles.updated', {
      projectId,
      userId: user.id,
      styles: mergedStyles,
    });

    return {
      styles: updated.styles,
      updatedAt: updated.updatedAt,
    };
  }

  async lockElement(
    clerkId: string,
    projectId: string,
    elementId: string,
    dto: LockElementDto,
  ) {
    const user = await this.getUserFromClerkId(clerkId);
    await this.verifyProjectAccess(user.id, projectId);

    const canvas = await this.getOrCreateCanvas(projectId);

    const element = await this.prisma.canvasElement.findUnique({
      where: {
        id: elementId,
      },
    });

    if (!element || element.canvasId !== canvas.id) {
      throw new NotFoundException('Element not found');
    }

    const duration = dto.duration || 30000;
    const expiresAt = new Date(Date.now() + duration);

    try {
      const lock = await this.prisma.elementLock.create({
        data: {
          elementId,
          userId: user.id,
          userName: user.name || user.clerkId,
          lockedAt: new Date(),
          expiresAt,
        },
      });

      this.eventEmitter.emit('canvas.element.locked', {
        projectId,
        elementId,
        userId: user.id,
        userName: user.name || user.clerkId,
        lockedAt: lock.lockedAt,
        expiresAt: lock.expiresAt,
      });

      return {
        id: lock.id,
        elementId: lock.elementId,
        userId: lock.userId,
        userName: lock.userName,
        lockedAt: lock.lockedAt,
        expiresAt: lock.expiresAt,
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          const existingLock = await this.prisma.elementLock.findUnique({
            where: {
              elementId: elementId,
            },
          });
          if (existingLock && existingLock.expiresAt > new Date()) {
            throw new ConflictException(
              `Element is already locked by ${existingLock.userName}`,
            );
          }
        }
      }
      throw error;
    }
  }
}
