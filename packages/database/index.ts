// Export Prisma types for use in frontend and backend
export * from '@prisma/client';

import { PrismaClient } from '@prisma/client';
export const prisma = new PrismaClient();