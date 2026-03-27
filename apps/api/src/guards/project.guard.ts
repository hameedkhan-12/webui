
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ProjectGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) throw new ForbiddenException('Not authenticated');

    const projectId =
      request.params?.projectId ||
      request.headers['x-project-id'] ||
      request.query?.projectId;

    if (!projectId) {
      throw new BadRequestException(
        'projectId is required. Pass it as a route param, ' +
          'x-project-id header, or ?projectId query param.',
      );
    }

    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        ownerId: user.id,
      },
      select: { id: true },
    });

    if (!project) {
      throw new ForbiddenException(
        'Project not found or you do not have access to it',
      );
    }

    request.user.projectId = projectId;

    return true;
  }
}
