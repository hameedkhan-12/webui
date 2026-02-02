import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateProjectDto } from './dto/create-project.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreateVersionDto } from './dto/create-version.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}
  async createProject(userId: string, createProjectDto: CreateProjectDto) {
    const slug =
      createProjectDto.slug || this.generateSlug(createProjectDto.name);

    const existingProject = await this.prisma.project.findUnique({
      where: { slug },
    });

    if (existingProject) {
      throw new BadRequestException(`Project with slug ${slug} already exists`);
    }

    return this.prisma.project.create({
      data: {
        name: createProjectDto.name,
        slug,
        description: createProjectDto.description,
        thumbnail: createProjectDto.thumbnail,
        ownerId: userId,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });
  }

  async findAllProjects(userId: string) {
    return this.prisma.project.findMany({
      where: {
        ownerId: userId,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        _count: {
          select: {
            versions: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  async findOneProject(id: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        versions: {
          orderBy: {
            version: 'desc',
          },
        },
      },
    });
    if (!project) {
      throw new NotFoundException(`Project with id ${id} not found`);
    }

    if (project.ownerId !== userId) {
      throw new BadRequestException(`You do not have access to this project`);
    }

    return project;
  }

  async updateProject(
    id: string,
    userId: string,
    updateProjectDto: UpdateProjectDto,
  ) {
    const project = await this.findOneProject(id, userId);
    if (updateProjectDto.slug && updateProjectDto.slug !== project.slug) {
      const existingProject = await this.prisma.project.findUnique({
        where: { slug: updateProjectDto.slug },
      });
      if (existingProject) {
        throw new BadRequestException(
          `Project with slug ${updateProjectDto.slug} already exists`,
        );
      }
    }
    return this.prisma.project.update({
      where: { id },
      data: updateProjectDto,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });
  }

  async removeProject(id: string, userId: string) {
    await this.findOneProject(id, userId);
    return this.prisma.project.delete({ where: { id } });
  }

  async duplicateProject(id: string, userId: string) {
    const originalProject = await this.findOneProject(id, userId);

    const newSlug = `${originalProject.slug}-copy-${Date.now()}`;

    return this.prisma.project.create({
      data: {
        name: `${originalProject.name} - Copy`,
        slug: newSlug,
        description: originalProject.description,
        thumbnail: originalProject.thumbnail,
        ownerId: userId,
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });
  }

  async getVersions(projectId: string, userId: string) {
    await this.findOneProject(projectId, userId);

    return this.prisma.projectVersion.findMany({
      where: {
        projectId,
      },
      orderBy: {
        version: 'desc',
      },
    });
  }

  async createVersion(
    projectId: string,
    userId: string,
    userClerkId: string,
    createVersionDto: CreateVersionDto,
  ) {
    await this.findOneProject(projectId, userId);

    const latestVersion = await this.prisma.projectVersion.findFirst({
      where: {
        projectId,
      },
      orderBy: {
        version: 'desc',
      },
    });

    const nextVersion = latestVersion ? latestVersion.version + 1 : 1;

    return this.prisma.projectVersion.create({
      data: {
        projectId,
        version: nextVersion,
        snapshot: createVersionDto.snapshot,
        message: createVersionDto.message,
        createdBy: userClerkId,
      },
    });
  }
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
