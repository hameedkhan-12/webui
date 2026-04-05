import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Comment, CreateCommentDto } from '@repo/shared';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(projectId: string, requesterId: string): Promise<Comment[]> {
    await this.verifyAccess(projectId, requesterId);

    const comments = await this.prisma.projectComment.findMany({
      where: {
        projectId,
        parentId: null,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        replies: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return comments.map(this.toComment);
  }

  async create(
    projectId: string,
    authorId: string,
    dto: CreateCommentDto,
  ): Promise<Comment> {
    await this.verifyAccess(projectId, authorId);

    if (dto.parentId) {
      const parent = await this.prisma.projectComment.findFirst({
        where: {
          id: dto.parentId,
          projectId,
        },
      });

      if (!parent) {
        throw new NotFoundException('Invalid parent comment');
      }

      if (parent.parentId) {
        throw new BadRequestException(
          'Cannot reply to a reply. Only one level of thread is allowed.',
        );
      }
    }

    const comment = await this.prisma.projectComment.create({
      data: {
        projectId,
        authorId,
        content: dto.content.trim(),
        elementId: dto.elementId,
        parentId: dto.parentId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            avatar: true,
          },
        },
        replies: {
          include: {
            author: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    return this.toComment(comment);
  }

  private async verifyAccess(projectId: string, userId: string) {
    const [project, collaborator] = await Promise.all([
      await this.prisma.project.findFirst({
        where: {
          id: projectId,
          ownerId: userId,
        },
        select: {
          id: true,
        },
      }),
      await this.prisma.projectCollaborator.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId,
          },
        },
        select: {
          id: true,
        },
      }),
    ]);

    if (!project && !collaborator) {
      throw new ForbiddenException('You do not have access to this project');
    }
  }

  private toComment(raw: any): Comment {
    return {
      id: raw.id,
      projectId: raw.projectId,
      authorId: raw.authorId,
      authorName: raw.author?.name ?? null,
      authorAvatar: raw.author?.avatar ?? null,
      content: raw.content,
      elementId: raw.elementId ?? undefined,
      parentId: raw.parentId ?? undefined,
      replies: raw.replies?.map((r: any) => this.toComment(r)) ?? [],
      resolved: raw.resolved,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }
}
