import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  Collection,
  CreateCollectionDto,
  PaginatedResponse,
  UpdateCollectionDto,
} from '@repo/shared';
@Injectable()
export class CollectionService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllCollections(
    projectId: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<Collection>> {
    const skip = (page - 1) * limit;
    const [collections, total] = await this.prisma.$transaction([
      this.prisma.cmsCollection.findMany({
        where: {
          id: projectId,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              entries: true,
            },
          },
        },
      }),
      this.prisma.cmsCollection.count({
        where: {
          projectId,
        },
      }),
    ]);

    return {
      data: collections.map(this.toDto),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOneCollection(id: string, projectId: string): Promise<Collection> {
    const collection = await this.prisma.cmsCollection.findFirst({
      where: {
        id,
        projectId,
      },
    });
    if (!collection) throw new NotFoundException('Collection not found');

    return this.toDto(collection);
  }

  async createCollection(
    projectId: string,
    userId: string,
    dto: CreateCollectionDto,
  ) {
    const existing = await this.prisma.cmsCollection.findFirst({
      where: {
        projectId,
        slug: dto.slug,
      },
    });

    if (existing) {
      throw new ConflictException('Collection with this slug already exists');
    }

    this.validateFields(dto.fields);

    const collection = await this.prisma.cmsCollection.create({
      data: {
        projectId,
        createdBy: userId,
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        fields: dto.fields as any,
      },
      include: {
        _count: {
          select: {
            entries: true,
          },
        },
      },
    });

    return this.toDto(collection);
  }

  async updateCollection(
    id: string,
    projectId: string,
    dto: UpdateCollectionDto,
  ): Promise<Collection> {
    await this.findOneCollection(id, projectId);

    if (dto.fields) {
      this.validateFields(dto.fields);
    }

    const updated = await this.prisma.cmsCollection.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.fields && { fields: dto.fields as any }),
      },
      include: { _count: { select: { entries: true } } },
    });

    return this.toDto(updated);
  }

  async deleteCollection(id: string, projectId: string): Promise<void> {
    await this.findOneCollection(id, projectId);
    await this.prisma.cmsCollection.delete({ where: { id } });
  }
  private toDto(collection: any): Collection {
    return {
      id: collection.id,
      projectId: collection.projectId,
      name: collection.name,
      slug: collection.slug,
      description: collection.description,
      fields: collection.fields,
      entryCount: collection._count.entries,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
    };
  }

  private validateFields(fields: CreateCollectionDto['fields']): void {
    if (!fields || fields.length === 0) {
      throw new BadRequestException('Collection must have at least one field');
    }

    const names = fields.map((f) => f.name);
    const duplicates = names.filter(
      (name, index) => names.indexOf(name) !== index,
    );

    if (duplicates.length > 0) {
      throw new BadRequestException('Field names must be unique');
    }
  }
}
