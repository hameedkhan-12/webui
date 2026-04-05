import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AddCollaboratorDto,
  Collaborator,
  CollaboratorRole,
  UpdateCollaboratorRoleDto,
} from '@repo/shared';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CollaboratorsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    projectId: string,
    requesterId: string,
  ): Promise<Collaborator[]> {
    await this.verifyAccess(projectId, requesterId);

    const collaborators = await this.prisma.projectCollaborator.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        joinedAt: 'asc',
      },
    });

    return collaborators.map(this.toCollaborator);
  }

  async add(
    projectId: string,
    requesterId: string,
    dto: AddCollaboratorDto,
  ): Promise<Collaborator> {
    await this.verifyAdminAccess(projectId, requesterId);

    const user = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });

    if (!user) {
      throw new NotFoundException(
        `User with email ${dto.email} not found.` +
          'Please create the user first before adding them as a collaborator.',
      );
    }

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true },
    });

    if (project?.ownerId === user.id) {
      throw new BadRequestException(
        'You cannot add the project owner as a collaborator',
      );
    }

    const existing = await this.prisma.projectCollaborator.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: user.id,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        `User ${user.email} is already a collaborator`,
      );
    }

    const collaborator = await this.prisma.projectCollaborator.create({
      data: {
        projectId,
        userId: user.id,
        role: dto.role,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    return this.toCollaborator(collaborator);
  }

  async remove(
    projectId: string,
    requesterId: string,
    targetUserId: string,
  ): Promise<void> {
    if (requesterId !== targetUserId) {
      await this.verifyAdminAccess(projectId, requesterId);
    }

    const collaborator = await this.prisma.projectCollaborator.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: targetUserId,
        },
      },
    });

    if (!collaborator) {
      throw new NotFoundException(`Collaborator not found on this project`);
    }

    await this.prisma.projectCollaborator.delete({
      where: {
        projectId_userId: {
          projectId,
          userId: targetUserId,
        },
      },
    });
  }

  async updateRole(
    projectId: string,
    requesterId: string,
    targetUserId: string,
    dto: UpdateCollaboratorRoleDto,
  ): Promise<Collaborator> {
    await this.verifyAdminAccess(projectId, requesterId);

    if (requesterId === targetUserId) {
      throw new BadRequestException('You cannot update your own role');
    }

    const collaborator = await this.prisma.projectCollaborator.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: targetUserId,
        },
      },
    });

    if (!collaborator) {
      throw new NotFoundException(`Collaborator not found on this project`);
    }

    const updated = await this.prisma.projectCollaborator.update({
      where: {
        projectId_userId: {
          projectId,
          userId: targetUserId,
        },
      },
      data: {
        role: dto.role,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    return this.toCollaborator(updated);
  }
  private async verifyAccess(projectId: string, userId: string): Promise<void> {
    const [project, collaborator] = await Promise.all([
      this.prisma.project.findFirst({
        where: {
          id: projectId,
          ownerId: userId,
        },
      }),
      this.prisma.projectCollaborator.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId,
          },
        },
      }),
    ]);

    if (!project && !collaborator) {
      throw new ForbiddenException('You do not have access to this project');
    }
  }

  private async verifyAdminAccess(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true },
    });

    if (!project) throw new NotFoundException('Project not found');

    if (project.ownerId === userId) return;

    const collaborator = await this.prisma.projectCollaborator.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    if (!collaborator || collaborator.role !== CollaboratorRole.ADMIN) {
      throw new ForbiddenException('You do not have access to this project');
    }
  }

  private toCollaborator(raw: any): Collaborator {
    return {
      id: raw.id,
      projectId: raw.projectId,
      userId: raw.userId,
      role: raw.role as CollaboratorRole,
      name: raw.user.name,
      email: raw.user.email,
      avatar: raw.user.avatar,
      joinedAt: raw.joinedAt,
    };
  }
}
