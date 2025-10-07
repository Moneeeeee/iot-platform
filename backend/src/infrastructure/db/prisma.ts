// Infrastructure Layer - Prisma 元数据管理
import { PrismaClient } from '@prisma/client';
import { env } from '@/env';

// 单例模式
let prisma: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: env.DATABASE_URL
        }
      },
      log: env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error']
    });
  }
  return prisma;
}

export async function disconnectPrisma(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}
