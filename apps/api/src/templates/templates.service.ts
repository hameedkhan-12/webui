import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PaginatedTemplate,
  Template,
  TemplateCategory,
  TemplateCategory_Response,
  TemplateDetail,
  TemplateFile,
  TemplateQuery,
  UseTemplateResponse,
} from '@repo/shared';
import { PrismaService } from 'src/prisma/prisma.service';

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  [TemplateCategory.LANDING_PAGE]: 'Landing Page',
  [TemplateCategory.PORTFOLIO]: 'Portfolio',
  [TemplateCategory.BLOG]: 'Blog',
  [TemplateCategory.ECOMMERCE]: 'E-Commerce',
  [TemplateCategory.DASHBOARD]: 'Dashboard',
  [TemplateCategory.SAAS]: 'SaaS',
  [TemplateCategory.AGENCY]: 'Agency',
  [TemplateCategory.PERSONAL]: 'Personal',
  [TemplateCategory.OTHER]: 'Other',
};

@Injectable()
export class TemplateService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: TemplateQuery): Promise<PaginatedTemplate<Template>> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(50, query.limit ?? 12);
    const skip = (page - 1) * limit;

    const where = {
      ...(query.category && { category: query.category }),
      ...(query.framework && { framework: query.framework }),
      ...(query.isPremium !== undefined && { isPremium: query.isPremium }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' as const } },
          {
            description: {
              contains: query.search,
              mode: 'insensitive' as const,
            },
          },
          { tags: { has: query.search.toLowerCase() } },
        ],
      }),
    };

    const [templates, total] = await Promise.all([
      this.prisma.template.findMany({
        where,
        skip,
        take: limit,
        orderBy: { usageCount: 'desc' },
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          framework: true,
          previewUrl: true,
          demoUrl: true,
          tags: true,
          isPremium: true,
          usageCount: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.template.count({ where }),
    ]);

    return {
      data: templates.map(this.toTemplate),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<TemplateDetail> {
    const template = await this.prisma.template.findFirst({
      where: { id },
    });

    if (!template) throw new NotFoundException('Template not found');

    return this.toTemplateDetail(template);
  }

  async getCategories(): Promise<TemplateCategory_Response[]> {
    const grouped = await this.prisma.template.groupBy({
      by: ['category'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    const countMap = new Map(grouped.map((g) => [g.category, g._count.id]));

    return Object.values(TemplateCategory).map((category) => ({
      category,
      count: countMap.get(category) ?? 0,
      label: CATEGORY_LABELS[category],
    }));
  }

  async useTemplate(
    templateId: string,
    projectId: string,
    userId: string,
  ): Promise<UseTemplateResponse> {
    const template = await this.prisma.template.findUnique({
      where: { id: templateId },
    });
    if (!template) throw new NotFoundException('Template not found');

    const project = await this.prisma.project.findFirst({
      where: { id: projectId, ownerId: userId },
    });
    if (!project)
      throw new NotFoundException('Project not found or access denied');

    const existingCode = await this.prisma.generatedCode.findFirst({
      where: { projectId, status: 'COMPLETED' },
    });

    if (existingCode) {
      throw new BadRequestException(
        'Project already has generated code. ' +
          'Create a new project if you want to use a different template.',
      );
    }
    await this.prisma.$transaction(async (tx) => {
      (await tx.generatedCode.create({
        data: {
          projectId,
          framework: template.framework.toLowerCase(),
          status: 'COMPLETED',
          files: template.files ?? [],
          dependencies: template.dependencies ?? {},
        },
      }),
        await tx.projectTemplate.upsert({
          where: { projectId_templateId: { projectId, templateId } },
          create: { projectId, templateId, usedBy: userId },
          update: { usedAt: new Date(), usedBy: userId },
        }),
        await tx.template.update({
          where: { id: templateId },
          data: { usageCount: { increment: 1 } },
        }));
    });

    return {
      projectId,
      templateId,
      message: `Template ${template.name} applied successfully. You can now customize and publish your project.`,
    };
  }

  private toTemplate(raw: any): Template {
    return {
      id: raw.id,
      name: raw.name,
      description: raw.description,
      category: raw.category as TemplateCategory,
      framework: raw.framework as any,
      previewUrl: raw.previewUrl,
      demoUrl: raw.demoUrl ?? undefined,
      tags: raw.tags ?? [],
      isPremium: raw.isPremium,
      usageCount: raw.usageCount,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }

  private toTemplateDetail(raw: any): TemplateDetail {
    return {
      ...this.toTemplate(raw),
      files: (raw.files as TemplateFile[]) ?? [],
      dependencies: (raw.dependencies as Record<string, string>) ?? {},
    };
  }
}
