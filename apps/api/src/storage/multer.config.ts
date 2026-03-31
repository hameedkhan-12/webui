
import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from './cloudinary.service';

export const multerConfig = {
  storage: memoryStorage(),   // buffer → Cloudinary directly, never hits disk
  limits:  { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req: any, file: Express.Multer.File, cb: any) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new BadRequestException(
          `File type "${file.mimetype}" is not supported. ` +
          `Allowed: images, videos, fonts, PDF, Word documents.`,
        ),
        false,
      );
    }
  },
};