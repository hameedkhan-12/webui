
import { Injectable, Logger } from '@nestjs/common';
import { getConfig, MediaType } from '@repo/shared';
import { v2 as cloudinary } from 'cloudinary';


export interface CloudinaryUploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
  width?: number;
  height?: number;
  format: string;
  bytes: number;
  resourceType: string;
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor() {
    const config = getConfig();

    if (!config.cloudinary) {
      throw new Error(
        'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in your .env file.',
      );
    }

    cloudinary.config({
      cloud_name: config.cloudinary.cloudName,
      api_key: config.cloudinary.apiKey,
      api_secret: config.cloudinary.apiSecret,
      secure: true,
    });
  }

  async upload(
    buffer: Buffer,
    options: {
      folder: string;
      filename: string;
      resourceType?: 'image' | 'video' | 'raw' | 'auto';
    },
  ): Promise<CloudinaryUploadResult> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: options.folder,
          public_id: options.filename,
          resource_type: options.resourceType ?? 'auto',
          overwrite: false,
          unique_filename: true,
        },
        (error, result) => {
          if (error) {
            this.logger.error(`Cloudinary upload failed: ${error.message}`);
            return reject(new Error(`Upload failed: ${error.message}`));
          }

          if (!result) return reject(new Error('Upload returned no result'));

          resolve({
            publicId: result.public_id,
            url: result.url,
            secureUrl: result.secure_url,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes,
            resourceType: result.resource_type,
          });
        },
      );

      stream.end(buffer);
    });
  }

  async delete(
    publicId: string,
    resourceType: 'image' | 'video' | 'raw' = 'image',
  ): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });
      this.logger.log(`Deleted Cloudinary asset: ${publicId}`);
    } catch (error) {
      this.logger.error(`Failed to delete ${publicId}: ${error.message}`);
      throw error;
    }
  }

  getMediaType(mimeType: string): MediaType {
    if (mimeType.startsWith('image/')) return MediaType.IMAGE;
    if (mimeType.startsWith('video/')) return MediaType.VIDEO;
    if (
      mimeType === 'application/pdf' ||
      mimeType.includes('document') ||
      mimeType.includes('text/')
    ) {
      return MediaType.DOCUMENT;
    }
    return MediaType.IMAGE;
  }

  getResourceType(mimeType: string): 'image' | 'video' | 'raw' {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    return 'raw';
  }
}