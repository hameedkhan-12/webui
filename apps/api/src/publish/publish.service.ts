import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { BuildFile, getConfig, PublishResult } from '@repo/shared';
import { PrismaService } from 'src/prisma/prisma.service';
import { BundlerService } from './bundler.service';
import { R2StorageService } from './r2-storage.service';
import { SlugService } from './slug.service';
import { PublishStatus, PublishTrigger } from '@webra/database';
import { Response } from 'express';

@Injectable()
export class PublishService {
  private readonly logger = new Logger(PublishService.name);
  private readonly config = getConfig();

  constructor(
    private readonly prisma: PrismaService,
    private readonly bundler: BundlerService,
    private readonly r2: R2StorageService,
    private readonly slug: SlugService,
  ) {}

  async publishProject(
    projectId: string,
    userId: string,
    trigger: PublishTrigger = PublishTrigger.MANUAL,
  ): Promise<PublishResult> {
    this.logger.log(`Publishing project ${projectId} for user ${userId}`);

    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        ownerId: userId,
      },
      include: {
        generatedCode: {
          where: { status: 'COMPLETED' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        publishRecords: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!project) throw new NotFoundException('Project not found');

    if (!project.generatedCode?.length) {
      throw new BadRequestException(
        'No completed generated code found for this project. Please generate code first.',
      );
    }

    const latestRecord = project.publishRecords[0];
    if (
      latestRecord?.status === PublishStatus.BUNDLING ||
      latestRecord?.status === PublishStatus.UPLOADING
    ) {
      throw new ConflictException(
        'A publish is already in progress for this project',
      );
    }

    const generatedCode = project.generatedCode[0];
    const files = generatedCode.files as unknown as BuildFile[];

    const projectSlug = await this.slug.getOrAssignSlug(
      projectId,
      project.slug,
    );
    const publishUrl = `https://${projectSlug}.${this.config.publishing?.baseDomain}`;

    const publishRecord = await this.prisma.publishRecord.create({
      data: {
        projectId,
        publishedBy: userId,
        projectSlug,
        url: publishUrl,
        status: PublishStatus.BUNDLING,
        version: await this.getNextVersion(projectId),
        framework: generatedCode.framework,
        trigger,
      },
    });

    const publishId = publishRecord.id;

    try {
      this.logger.log(`Bundling project ${projectId} for user ${userId}`);
      await this.updateStatus(publishId, PublishStatus.BUNDLING);

      const bundleResult = await this.bundler.bundle(
        files,
        generatedCode.framework,
      );

      if (!bundleResult.success) {
        throw new Error(bundleResult.error ?? 'Failed to bundle project');
      }

      this.logger.log(
        `[${publishId}] Bundle Complete: ${bundleResult.files.length} files,` +
          `${bundleResult.totalSize} bytes, ${bundleResult.buildTime}ms`,
      );

      await this.updateStatus(publishId, PublishStatus.UPLOADING);
      this.logger.log(`[${publishId}] Uploading to R2...`);

      await this.r2.uploadSite({
        projectSlug,
        files: bundleResult.files,
        deploymentVersion: publishRecord.version,
      });

      const finalRecord = await this.prisma.publishRecord.update({
        where: {
          id: publishId,
        },
        data: {
          status: PublishStatus.PUBLISHED,
          buildTime: bundleResult.buildTime,
          totalSize: BigInt[bundleResult.totalSize],
          fileCount: bundleResult.files.length,
          publishedAt: new Date(),
          errorMessage: null,
        },
      });

      await this.prisma.project.update({
        where: {
          id: projectId,
        },
        data: {
          publishedUrl: publishUrl,
          publishedAt: new Date(),
          publishSlug: projectSlug,
          lastPublishId: publishId,
        },
      });

      this.logger.log(
        `[${publishId}] Publish Completed successfully → ${publishUrl}`,
      );

      return {
        publishId,
        projectSlug,
        url: publishUrl,
        publishedAt: finalRecord.publishedAt!,
        buildTime: bundleResult.buildTime,
        totalSize: bundleResult.totalSize,
        fileCount: bundleResult.files.length,
      };
    } catch (error) {
      this.logger.error(
        `[${publishId}] Error publishing project: ${error.message}`,
        error.stack,
      );

      await this.prisma.publishRecord.update({
        where: {
          id: publishId,
        },
        data: {
          status: PublishStatus.FAILED,
          errorMessage: error.message,
          publishedAt: null,
        },
      });

      throw error;
    }
  }

  async unpublishProject(projectId: string, userId: string): Promise<void> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        ownerId: userId,
      },
    });

    if (!project) throw new NotFoundException('Project not found');
    if (!project.publishSlug) {
      throw new BadRequestException('Project is not published');
    }

    await this.r2.deleteSite(project.publishSlug);

    await this.prisma.project.update({
      where: {
        id: projectId,
      },
      data: {
        publishedAt: null,
        publishedUrl: null,
        lastPublishId: null,
      },
    });

    await this.prisma.publishRecord.updateMany({
      where: {
        projectId,
        status: PublishStatus.PUBLISHED,
      },
      data: {
        status: PublishStatus.IDLE,
      },
    });

    this.logger.log(
      `Project ${projectId} unpublished. Slug ${project.publishSlug} cleared from R2.`,
    );
  }

  async getPublishStatus(projectId: string, userId: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        ownerId: userId,
      },
      select: {
        id: true,
        publishedUrl: true,
        publishSlug: true,
        publishedAt: true,
        publishRecords: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
          select: {
            id: true,
            status: true,
            buildTime: true,
            totalSize: true,
            fileCount: true,
            version: true,
            errorMessage: true,
            publishedAt: true,
          },
        },
      },
    });

    if (!project) throw new NotFoundException('Project not found');

    const latest = project.publishRecords[0];
    return {
      isPublished: !!project.publishedUrl,
      url: project.publishedUrl,
      publishedAt: project.publishedAt,
      slug: project.publishSlug,
      latestPublish: latest ?? null,
    };
  }

  async getPublishHistory(projectId: string, userId: string, limit = 10) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        ownerId: userId,
      },
    });

    if (!project) throw new NotFoundException('Project not found');

    return this.prisma.publishRecord.findMany({
      where: {
        projectId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: Math.min(limit, 50),
    });
  }

  async serveLocalFile(
  slug: string,
  filepath: string,
  res: Response,
): Promise<void> {
  const key = `sites/${slug}/${filepath}`;
  let file = await this.r2.getFile(key);

  if (!file) {
    // SPA fallback — unknown paths go to index.html
    // so client-side routing works (React Router etc)
    file = await this.r2.getFile(`sites/${slug}/index.html`);

    if (!file) {
      res.status(404).send('Site not found. Make sure the project is published.');
      return;
    }
  }

  res.setHeader('Content-Type', file.contentType);
  res.setHeader('Content-Length', file.size);
  res.send(file.content);
}
  private async updateStatus(
    publishId: string,
    status: PublishStatus,
  ): Promise<void> {
    await this.prisma.publishRecord.update({
      where: {
        id: publishId,
      },
      data: {
        status,
      },
    });
  }

  private async getNextVersion(projectId: string): Promise<number> {
    const last = await this.prisma.publishRecord.findFirst({
      where: {
        projectId,
      },
      orderBy: {
        version: 'desc',
      },
      select: {
        version: true,
      },
    });

    return (last?.version || 0) + 1;
  }
}
