import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Asset,
  AssetQuery,
  AssetType,
  AssetUsage,
  OptimizationStatus,
  OptimizeAssetDto,
  OptimizeAssetResponse,
  Paginated,
} from '@repo/shared';
import { PrismaService } from 'src/prisma/prisma.service';
import { CloudinaryService } from 'src/storage/cloudinary.service';

@Injectable()
export class AssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async findAll(
    projectId: string,
    query: AssetQuery,
  ): Promise<Paginated<Asset>> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, query.limit ?? 20);
    const skip = (page - 1) * limit;

    const tagFilter = query.tags
      ? query.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
      : undefined;

    const where = {
      projectId,
      ...(query.assetType && { assetType: query.assetType }),
      ...(query.search && {
        name: { contains: query.search, mode: 'insensitive' as const },
      }),
      ...(tagFilter?.length && { tags: { hasSome: tagFilter } }),
    };

    const [assets, total] = await Promise.all([
      this.prisma.asset.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc',
        },
      }),

      this.prisma.asset.count({ where }),
    ]);

    return {
      data: assets.map(this.toAsset),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(projectId: string, id: string): Promise<Asset> {
    const asset = await this.prisma.asset.findFirst({
      where: { id, projectId },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    return this.toAsset(asset);
  }

  async upload(
    projectId: string,
    userId: string,
    file: Express.Multer.File,
    tags: string[],
  ): Promise<Asset> {
    const result = await this.cloudinary.upload(file, {
      folder: `projects/${projectId}/assets`,
      tags,
    });

    const assetType = this.resolveAssetType(file.mimetype);

    const asset = await this.prisma.asset.create({
      data: {
        projectId,
        name: file.originalname,
        url: result.url,
        secureUrl: result.secureUrl,
        publicId: result.publicId,
        mimeType: file.mimetype,
        size: result.size,
        width: result.width,
        height: result.height,
        duration: result.duration,
        assetType,
        uploadedBy: userId,
        tags,
        optimizationStatus: OptimizationStatus.PENDING,
      },
    });

    return this.toAsset(asset);
  }

  async remove(projectId: string, id: string): Promise<void> {
    const asset = await this.prisma.asset.findFirst({
      where: { id, projectId },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    await this.cloudinary.delete(asset.publicId, asset.mimeType);
    await this.prisma.asset.delete({ where: { id } });
  }

  async optimize(
    projectId: string,
    id: string,
    dto: OptimizeAssetDto,
  ): Promise<OptimizeAssetResponse> {
    const asset = await this.prisma.asset.findFirst({
      where: { id, projectId },
    });

    if (!asset) throw new NotFoundException('Asset not found');

    if (asset.assetType !== AssetType.IMAGE) {
      throw new BadRequestException('Only image assets can be optimized');
    }

    await this.prisma.asset.update({
      where: { id },
      data: {
        optimizationStatus: OptimizationStatus.PROCESSING,
      },
    });

    try {
      const result = await this.cloudinary.optimize(asset.publicId, {
        quality: dto.quality,
        maxWidth: dto.maxWidth,
        maxHeight: dto.maxHeight,
        format: dto.format,
      });

      const updated = await this.prisma.asset.update({
        where: { id },
        data: {
          optimizedUrl: result.optimizedUrl,
          optimizedSize: result.optimizedSize,
          optimizationStatus: OptimizationStatus.DONE,
        },
      });

      const savedBytes = asset.size - result.optimizedSize;
      const savedPercent =
        asset.size > 0 ? Math.round((savedBytes / asset.size) * 100) : 0;

      return {
        asset: this.toAsset(updated),
        savedBytes: Math.max(0, savedBytes),
        savedPercent: Math.max(0, savedPercent),
      };
    } catch (error) {
      await this.prisma.asset.update({
        where: { id },
        data: {
          optimizationStatus: OptimizationStatus.FAILED,
        },
      });
      throw error;
    }
  }

  async getUsage(projectId: string): Promise<AssetUsage> {
    const [assets, byTypeRaw] = await Promise.all([
      this.prisma.asset.findMany({
        where: { projectId },
        select: {
          size: true,
          optimizedSize: true,
          optimizationStatus: true,
        },
      }),

      this.prisma.asset.groupBy({
        by: ['assetType'],
        where: {
          projectId,
        },
        _count: { id: true },
        _sum: { size: true },
      }),
    ]);

    const optimizedAssets = assets.filter(
      (a) =>
        a.optimizationStatus === OptimizationStatus.DONE && a.optimizedSize,
    );

    return {
      totalSize: assets.reduce((acc, a) => acc + a.size, 0),
      totalAssets: assets.length,
      byType: byTypeRaw.map((r) => ({
        type: r.assetType as AssetType,
        count: r._count.id,
        size: r._sum.size ?? 0,
      })),
      optimizedCount: optimizedAssets.length,
      savedBytes: optimizedAssets.reduce(
        (sum, a) => sum + Math.max(0, a.size - (a.optimizedSize ?? a.size)),
        0,
      ),
    };
  }
  private resolveAssetType(mimeType: string): AssetType {
    if (mimeType.startsWith('image/')) return AssetType.IMAGE;
    if (mimeType.startsWith('video/')) return AssetType.VIDEO;
    if (mimeType.startsWith('font/')) return AssetType.FONT;
    if (mimeType.startsWith('application/pdf')) return AssetType.DOCUMENT;
    if (mimeType.includes('word')) return AssetType.DOCUMENT;
    return AssetType.OTHER;
  }

  private toAsset(raw: any): Asset {
    return {
      id: raw.id,
      projectId: raw.projectId,
      name: raw.name,
      url: raw.url,
      secureUrl: raw.secureUrl,
      publicId: raw.publicId,
      assetType: raw.assetType as AssetType,
      mimeType: raw.mimeType,
      size: raw.size,
      optimizedSize: raw.optimizedSize ?? undefined,
      width: raw.width ?? undefined,
      height: raw.height ?? undefined,
      duration: raw.duration ?? undefined,
      optimizationStatus: raw.optimizationStatus as OptimizationStatus,
      optimizedUrl: raw.optimizedUrl ?? undefined,
      tags: raw.tags ?? [],
      uploadedBy: raw.uploadedBy,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    };
  }
}
