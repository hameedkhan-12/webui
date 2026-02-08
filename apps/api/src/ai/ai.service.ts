// apps/api/src/modules/ai/ai.service.ts

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JobStatus } from '@webra/database';
import { InngestService } from '../inngest/inngest.service';
import {
  GenerateDto,
  ModifyDto,
  RegenerateDto,
  SuggestionsDto,
  VariationsDto,
} from './dto/ai.dto';

@Injectable()
export class AiService {
  constructor(
    private prisma: PrismaService,
    private inngest: InngestService,
  ) {}

  /**
   * Helper method to get user from clerkId and convert to database userId
   * This is necessary because Clerk uses clerkId but our database relations use the internal user.id
   */
  private async getUserFromClerkId(clerkId: string) {
    const user = await this.prisma.user.findUnique({
      where: { clerkId },
      select: { id: true, clerkId: true, email: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async generate(clerkId: string, dto: GenerateDto) {
    const user = await this.getUserFromClerkId(clerkId);

    // Validate project if provided
    if (dto.projectId) {
      await this.validateProjectAccess(user.id, dto.projectId);
    }

    // Create AI generation job
    const job = await this.prisma.aIGenerationJob.create({
      data: {
        userId: user.id,
        projectId: dto.projectId,
        prompt: dto.prompt,
        context: dto.context || {},
        jobType: 'generate',
        status: JobStatus.PENDING,
      },
    });

    // Send to Inngest
    await this.inngest.send({
      name: 'ai/generation',
      data: {
        jobId: job.id,
        userId: user.id,
        projectId: dto.projectId,
        prompt: dto.prompt,
        context: dto.context || {},
      },
    });

    return {
      jobId: job.id,
      status: job.status,
      message: 'Generation job created successfully',
    };
  }

  async modify(clerkId: string, dto: ModifyDto) {
    const user = await this.getUserFromClerkId(clerkId);
    await this.validateProjectAccess(user.id, dto.projectId);

    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const job = await this.prisma.aIGenerationJob.create({
      data: {
        userId: user.id,
        projectId: dto.projectId,
        prompt: dto.prompt,
        context: {
          ...dto.context,
          elementId: dto.elementId,
        },
        jobType: 'modify',
        status: JobStatus.PENDING,
      },
    });

    // Send to Inngest
    await this.inngest.send({
      name: 'ai/modification',
      data: {
        jobId: job.id,
        userId: user.id,
        projectId: dto.projectId,
        elementId: dto.elementId,
        prompt: dto.prompt,
        context: job.context as any,
      },
    });

    return {
      jobId: job.id,
      status: job.status,
      message: 'Modification job created successfully',
    };
  }

  async getSuggestions(clerkId: string, dto: SuggestionsDto) {
    const user = await this.getUserFromClerkId(clerkId);
    await this.validateProjectAccess(user.id, dto.projectId);

    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const job = await this.prisma.aIGenerationJob.create({
      data: {
        userId: user.id,
        projectId: dto.projectId,
        prompt: `Generate ${dto.suggestionType || 'design'} suggestions`,
        context: {
          ...dto.context,
          suggestionType: dto.suggestionType,
          currentSnapshot: project.versions[0]?.snapshot,
        },
        jobType: 'suggestions',
        status: JobStatus.PENDING,
      },
    });

    // Send to Inngest
    await this.inngest.send({
      name: 'ai/suggestions',
      data: {
        jobId: job.id,
        userId: user.id,
        projectId: dto.projectId,
        suggestionType: dto.suggestionType,
        context: job.context as any,
      },
    });

    return {
      jobId: job.id,
      status: job.status,
      message: 'Suggestions job created successfully',
    };
  }

  async getJobStatus(clerkId: string, jobId: string) {
    const user = await this.getUserFromClerkId(clerkId);

    const job = await this.prisma.aIGenerationJob.findUnique({
      where: { id: jobId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // Verify user has access to this job
    if (job.userId !== user.id) {
      if (job.projectId) {
        await this.validateProjectAccess(user.id, job.projectId);
      } else {
        throw new NotFoundException('Job not found');
      }
    }

    return {
      id: job.id,
      status: job.status,
      jobType: job.jobType,
      prompt: job.prompt,
      result: job.result,
      error: job.error,
      project: job.project,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }

  async regenerate(clerkId: string, dto: RegenerateDto) {
    const user = await this.getUserFromClerkId(clerkId);

    const originalJob = await this.prisma.aIGenerationJob.findUnique({
      where: { id: dto.jobId },
    });

    if (!originalJob) {
      throw new NotFoundException('Original job not found');
    }

    if (originalJob.userId !== user.id) {
      throw new NotFoundException('Job not found');
    }

    const newJob = await this.prisma.aIGenerationJob.create({
      data: {
        userId: user.id,
        projectId: originalJob.projectId,
        prompt: dto.prompt || originalJob.prompt,
        context: originalJob.context as any,
        jobType: 'regenerate',
        status: JobStatus.PENDING,
      },
    });

    // Send to Inngest
    await this.inngest.send({
      name: 'ai/regeneration',
      data: {
        jobId: newJob.id,
        originalJobId: originalJob.id,
        userId: user.id,
        prompt: newJob.prompt,
        context: newJob.context as any,
      },
    });

    return {
      jobId: newJob.id,
      status: newJob.status,
      message: 'Regeneration job created successfully',
    };
  }

  async generateVariations(clerkId: string, dto: VariationsDto) {
    const user = await this.getUserFromClerkId(clerkId);

    let baseJob = await this.prisma.aIGenerationJob.findUnique({
      where: { id: dto.baseId },
    });

    let projectId: string | undefined;

    if (!baseJob) {
      const project = await this.validateProjectAccess(user.id, dto.baseId);
      projectId = project.id;
    } else {
      if (baseJob.userId !== user.id) {
        throw new NotFoundException('Base job not found');
      }
      projectId = baseJob.projectId || undefined;
    }

    const variationCount = dto.variationCount || 3;
    const jobs: any[] = [];

    // Create multiple variation jobs
    for (let i = 0; i < variationCount; i++) {
      const job = await this.prisma.aIGenerationJob.create({
        data: {
          userId: user.id,
          projectId,
          prompt: baseJob?.prompt || `Generate variation ${i + 1}`,
          context: {
            ...(baseJob?.context as any),
            ...dto.parameters,
            variationIndex: i + 1,
            baseJobId: baseJob?.id,
          },
          jobType: 'variations',
          status: JobStatus.PENDING,
        },
      });

      jobs.push(job);

      // Send to Inngest
      await this.inngest.send({
        name: 'ai/variation',
        data: {
          jobId: job.id,
          userId: user.id,
          variationIndex: i + 1,
          baseJobId: baseJob?.id,
          context: job.context as any,
        },
      });
    }

    return {
      jobs: jobs.map((job) => ({
        jobId: job.id,
        status: job.status,
      })),
      message: `${variationCount} variation jobs created successfully`,
    };
  }

  async cancelJob(clerkId: string, jobId: string) {
    const user = await this.getUserFromClerkId(clerkId);

    const job = await this.prisma.aIGenerationJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job.userId !== user.id) {
      throw new NotFoundException('Job not found');
    }

    if (job.status === JobStatus.COMPLETED || job.status === JobStatus.FAILED) {
      throw new BadRequestException('Cannot cancel completed or failed job');
    }

    await this.prisma.aIGenerationJob.update({
      where: { id: jobId },
      data: {
        status: JobStatus.FAILED,
        error: 'Cancelled by user',
      },
    });

    // Send cancellation event to Inngest
    await this.inngest.send({
      name: 'ai/generation.cancelled',
      data: {
        jobId,
      },
    });

    return { message: 'Job cancelled successfully' };
  }

  async getUserJobs(
    clerkId: string,
    options?: {
      status?: JobStatus;
      jobType?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const user = await this.getUserFromClerkId(clerkId);

    const where: any = { userId: user.id };

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.jobType) {
      where.jobType = options.jobType;
    }

    const [jobs, total] = await Promise.all([
      this.prisma.aIGenerationJob.findMany({
        where,
        include: {
          project: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 20,
        skip: options?.offset || 0,
      }),
      this.prisma.aIGenerationJob.count({ where }),
    ]);

    return {
      jobs,
      total,
      limit: options?.limit || 20,
      offset: options?.offset || 0,
    };
  }

  private async validateProjectAccess(userId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [{ ownerId: userId }],
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found or access denied');
    }

    return project;
  }
}