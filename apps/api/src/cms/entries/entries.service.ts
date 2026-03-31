import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CollectionField,
  CreateEntryDto,
  Entry,
  FieldType,
  Paginated as PaginatedResponse,
  PaginationQuery,
  UpdateEntryDto,
} from '@repo/shared';
import { EntryStatus } from '@webra/database';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class EntriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllEntries(
    collectionId: string,
    projectId: string,
    query: PaginationQuery,
  ): Promise<PaginatedResponse<Entry>> {
    await this.findCollection(collectionId, projectId);

    const { page = 1, limit = 20, status } = query;
    const skip = (page - 1) * limit;

    const where = {
      collectionId,
      projectId,
      ...(status && { status }),
    };

    const [entries, total] = await this.prisma.$transaction([
      this.prisma.cmsEntry.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),

      this.prisma.cmsEntry.count({
        where,
      }),
    ]);

    return {
      data: entries.map(this.toDto),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOneEntry(
    collectionId: string,
    entryId: string,
    projectId: string,
  ): Promise<Entry> {
    const entry = await this.prisma.cmsEntry.findFirst({
      where: {
        id: entryId,
        collectionId,
        projectId,
      },
    });

    if (!entry) throw new NotFoundException('Entry not found');

    return this.toDto(entry);
  }

  async createEntry(
    collectionId: string,
    projectId: string,
    userId: string,
    dto: CreateEntryDto,
  ): Promise<Entry> {
    const collection = await this.findCollection(collectionId, projectId);

    this.validateEntryData(
      dto.data,
      collection.fields as unknown as CollectionField[],
    );

    const entry = await this.prisma.cmsEntry.create({
      data: {
        collectionId,
        projectId,
        data: dto.data as any,
        status: dto.status ?? EntryStatus.DRAFT,
        publishedAt: dto.status === EntryStatus.PUBLISHED ? new Date() : null,
        createdBy: userId,
      },
    });
    return this.toDto(entry);
  }

  async updateEntry(
    collectionId: string,
    entryId: string,
    projectId: string,
    dto: UpdateEntryDto,
  ): Promise<Entry> {
    const existing = await this.findOneEntry(collectionId, entryId, projectId);

    if (dto.data) {
      const collection = await this.findCollection(collectionId, projectId);
      this.validateEntryData(
        dto.data,
        collection.fields as unknown as CollectionField[],
      );
    }

    const publishedAt =
      dto.status === EntryStatus.PUBLISHED && !existing.publishedAt
        ? new Date()
        : undefined;

    const updated = await this.prisma.cmsEntry.update({
      where: {
        id: entryId,
      },
      data: {
        ...(dto.data && { data: dto.data as any }),
        ...(dto.status && { status: dto.status }),
        ...(publishedAt && { publishedAt }),
      },
    });

    return this.toDto(updated);
  }

  async delete(
    collectionId: string,
    entryId: string,
    projectId: string,
  ): Promise<void> {
    await this.findOneEntry(collectionId, entryId, projectId);
    await this.prisma.cmsEntry.delete({ where: { id: entryId } });
  }
  /// Helpers
  private async findCollection(collectionId: string, projectId: string) {
    const collection = await this.prisma.cmsCollection.findFirst({
      where: {
        id: collectionId,
        projectId,
      },
    });

    if (!collection) throw new NotFoundException('Collection not found');
    return collection;
  }

  private validateEntryData(
    data: Record<string, unknown>,
    fields: CollectionField[],
  ): void {
    const errors: string[] = [];

    for (const field of fields) {
      const value = data[field.name];

      if (
        field.required &&
        (value === undefined || value === null || value === '')
      ) {
        errors.push(`Field ${field.label} is required`);
        continue;
      }

      if (value === undefined || value === null) continue;

      switch (field.type) {
        case FieldType.NUMBER:
          if (typeof value !== 'number') {
            errors.push(`Field ${field.label} must be a number`);
          }
          break;
        case FieldType.BOOLEAN:
          if (typeof value !== 'boolean') {
            errors.push(`Field ${field.label} must be a boolean`);
          }
          break;
        case FieldType.DATE:
          if (isNaN(Date.parse(String(value)))) {
            errors.push(`Field "${field.label}" must be a valid date`);
          }
          break;
        case FieldType.SELECT:
          if (field.options && !field.options.includes(String(value))) {
            errors.push(
              `Field "${field.label}" must be one of: ${field.options.join(', ')}`,
            );
          }
          break;
      }
    }

    if (errors.length > 0) {
      throw new BadRequestException(errors);
    }
  }

  private toDto(entry: any): Entry {
    return {
      id: entry.id,
      collectionId: entry.collectionId,
      projectId: entry.projectId,
      data: entry.data,
      status: entry.status,
      publishedAt: entry.publishedAt,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    };
  }
}
