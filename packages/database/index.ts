// Export Prisma types for use in frontend and backend
export * from './src/generated/client/index.js';

import { PrismaClient } from './src/generated/client/index.js';
export const prisma = new PrismaClient();