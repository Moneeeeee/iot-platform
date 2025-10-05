/**
 * 数据库配置文件
 * 配置Prisma ORM和数据库连接
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';

/**
 * Prisma客户端实例
 * 使用单例模式确保全局只有一个数据库连接实例
 */
class DatabaseService {
  private static instance: DatabaseService;
  private prisma: PrismaClient;

  private constructor() {
    this.prisma = new PrismaClient({
      log: [
        {
          emit: 'stdout',
          level: 'query',
        },
        {
          emit: 'stdout',
          level: 'error',
        },
        {
          emit: 'stdout',
          level: 'info',
        },
        {
          emit: 'stdout',
          level: 'warn',
        },
      ],
    });

    // 数据库连接成功
    logger.info('Database connected successfully');
  }

  /**
   * 获取数据库服务实例
   * @returns DatabaseService实例
   */
  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * 获取Prisma客户端
   * @returns PrismaClient实例
   */
  public getClient(): PrismaClient {
    return this.prisma;
  }

  /**
   * 连接数据库
   * @returns Promise<void>
   */
  public async connect(): Promise<void> {
    try {
      await this.prisma.$connect();
      logger.info('Database connected successfully');
    } catch (error) {
      logger.error('Failed to connect to database:', error);
      throw error;
    }
  }

  /**
   * 断开数据库连接
   * @returns Promise<void>
   */
  public async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      logger.info('Database disconnected successfully');
    } catch (error) {
      logger.error('Failed to disconnect from database:', error);
      throw error;
    }
  }

  /**
   * 健康检查
   * @returns Promise<boolean>
   */
  public async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * 执行数据库事务
   * @param fn 事务函数
   * @returns Promise<T>
   */
  public async transaction<T>(fn: (prisma: PrismaClient) => Promise<T>): Promise<T> {
    return await this.prisma.$transaction(fn);
  }

  /**
   * 清理资源
   */
  public async cleanup(): Promise<void> {
    try {
      await this.disconnect();
    } catch (error) {
      logger.error('Error during database cleanup:', error);
    }
  }
}

// 导出单例实例
export const db = DatabaseService.getInstance();
export const prisma = db.getClient();

// 导出数据库服务类
export { DatabaseService };

// 默认导出
export default db;
