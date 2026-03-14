import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class SlugSerice {
  private readonly logger = new Logger(SlugSerice.name);

  constructor(private readonly prisma: PrismaService) {}

  async getOrAssignSlug(
    projectId: string,
    projectSlug: string,
  ): Promise<string> {
    try {
      const project = await this.prisma.project.findUnique({
        where: {
          id: projectId,
        },
        select: {
          publishSlug: true,
        },
      });

      if (project?.publishSlug) {
        return project.publishSlug;
      }

      const newSlug = await this.generateUniqueSlug(projectSlug);

      await this.prisma.project.update({
        where: {
          id: projectId,
        },
        data: {
          publishSlug: newSlug,
        },
      });

      this.logger.log(
        `Assigned publish slug ${newSlug} to project ${projectId}`,
      );

      return newSlug;
    } catch (error) {
      throw new Error(
        `Failed to get or assign slug for project ${projectId}: ${error.message}`,
      );
    }
  }

  private async generateUniqueSlug(base: string): Promise<string> {
    const sanitized = this.sanitize(base);

    for (let attempt = 0; attempt < 10; attempt++) {
      const suffix = this.randomSuffix();
      const candidate = `${sanitized}-${suffix}`.slice(0, 63);

      const existing = await this.prisma.project.findFirst({
        where: {
          publishSlug: candidate,
        },
      });

      if (!existing) {
        return candidate;
      }

      const { randomUUID } = await import('crypto');
      return `app-${randomUUID().replace(/-/g, '').slice(0, 12)}`;
    }
  }

  private sanitize(input: string): string {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40);
  }

  private randomSuffix(): string {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let result = '';
    const array = new Uint8Array(4);
    require('crypto').randomFillSync(array);
    for (const byte of array) {
      result += chars[byte % chars.length];
    }
    return result;
  }
}
