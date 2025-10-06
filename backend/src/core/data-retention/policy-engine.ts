/**
 * 数据保留策略引擎
 * 功能：
 * 1. 租户级保留策略管理
 * 2. 冷热数据分层
 * 3. 自动压缩与归档
 * 4. 定时清理任务
 * 5. 数据降采样
 */

import { prisma } from '../common/config/database';
import { logger } from '../common/logger';
import { AppError } from '../common/errors';

// ==========================================
// 策略定义类型
// ==========================================

export interface TierConfig {
  duration: string; // '30d', '180d', '3y'
  resolution?: string; // 'raw', '1m', '5m', '1h', '1d'
  compression?: boolean;
  storage?: 'hot' | 'warm' | 'cold' | 'archive';
  format?: 'native' | 'parquet' | 'csv';
}

export interface RetentionTiers {
  hot?: TierConfig;
  warm?: TierConfig;
  cold?: TierConfig;
  archive?: TierConfig;
}

export interface PolicyScope {
  templateIds?: string[];
  deviceTags?: string[];
  deviceIds?: string[];
}

// ==========================================
// 保留策略引擎
// ==========================================

export class RetentionPolicyEngine {
  /**
   * 创建保留策略
   */
  static async createPolicy(params: {
    tenantId: string;
    name: string;
    dataType: 'TELEMETRY' | 'DEVICE_STATUS' | 'EVENTS' | 'LOGS' | 'MEASUREMENTS';
    tiers: RetentionTiers;
    scope?: PolicyScope;
  }) {
    const { tenantId, name, dataType, tiers, scope } = params;

    // 验证层级配置
    this.validateTiers(tiers);

    const policy = await prisma.retentionPolicy.create({
      data: {
        tenantId,
        name,
        dataType,
        tiers: tiers as any,
        scope: scope || {},
        isActive: true,
      },
    });

    logger.info('Retention policy created', {
      policyId: policy.id,
      tenantId,
      dataType,
    });

    return policy;
  }

  /**
   * 获取租户的保留策略
   */
  static async getPolicyForData(
    tenantId: string,
    dataType: 'TELEMETRY' | 'DEVICE_STATUS' | 'EVENTS' | 'LOGS' | 'MEASUREMENTS',
    deviceId?: string
  ) {
    // 查找匹配的策略（优先级：设备级 > 模板级 > 租户级）
    const policies = await prisma.retentionPolicy.findMany({
      where: {
        tenantId,
        dataType,
        isActive: true,
      },
    });

    if (policies.length === 0) {
      // 返回默认策略
      return this.getDefaultPolicy(dataType);
    }

    // TODO: 实现作用域匹配逻辑
    // 这里简化处理，返回第一个匹配的策略
    return policies[0];
  }

  /**
   * 执行保留策略（清理过期数据）
   */
  static async enforceRetentionPolicy(tenantId: string, dataType: string) {
    const policy = await this.getPolicyForData(
      tenantId,
      dataType as any
    );

    if (!policy) {
      logger.warn('No retention policy found', { tenantId, dataType });
      return;
    }

    const tiers = policy.tiers as RetentionTiers;

    // 计算保留截止时间
    const retentionCutoff = this.calculateRetentionCutoff(tiers);

    logger.info('Enforcing retention policy', {
      policyId: policy.id,
      tenantId,
      dataType,
      cutoff: retentionCutoff,
    });

    // 根据数据类型执行清理
    let deletedCount = 0;

    switch (dataType) {
      case 'TELEMETRY':
        deletedCount = await this.cleanupTelemetry(tenantId, retentionCutoff);
        break;

      case 'DEVICE_STATUS':
        deletedCount = await this.cleanupDeviceStatus(tenantId, retentionCutoff);
        break;

      case 'EVENTS':
        deletedCount = await this.cleanupEvents(tenantId, retentionCutoff);
        break;

      case 'LOGS':
        deletedCount = await this.cleanupLogs(tenantId, retentionCutoff);
        break;

      case 'MEASUREMENTS':
        deletedCount = await this.cleanupMeasurements(tenantId, retentionCutoff);
        break;
    }

    logger.info('Retention policy enforced', {
      policyId: policy.id,
      deletedCount,
    });

    return { deletedCount };
  }

  /**
   * 数据降采样（聚合）
   */
  static async downsampleData(
    tenantId: string,
    dataType: 'TELEMETRY' | 'DEVICE_STATUS',
    fromTime: Date,
    toTime: Date,
    resolution: '1m' | '5m' | '1h' | '1d'
  ) {
    logger.info('Downsampling data', {
      tenantId,
      dataType,
      fromTime,
      toTime,
      resolution,
    });

    if (dataType === 'TELEMETRY') {
      return await this.downsampleTelemetry(tenantId, fromTime, toTime, resolution);
    }

    // TODO: 实现其他数据类型的降采样
    return { count: 0 };
  }

  /**
   * 冷热分层迁移
   */
  static async migrateToTier(
    tenantId: string,
    dataType: string,
    tier: 'warm' | 'cold' | 'archive'
  ) {
    logger.info('Migrating data to tier', { tenantId, dataType, tier });

    const policy = await this.getPolicyForData(tenantId, dataType as any);
    if (!policy) {
      throw new AppError(404, 'No retention policy found');
    }

    const tiers = policy.tiers as RetentionTiers;
    const tierConfig = tiers[tier];

    if (!tierConfig) {
      throw new AppError(400, `Tier ${tier} not configured`);
    }

    // 计算迁移时间范围
    const cutoffTime = this.parseDuration(tierConfig.duration!);

    // 根据配置执行迁移
    if (tierConfig.compression) {
      // 压缩数据（TimescaleDB 自动处理）
      logger.info('Compression enabled for tier', { tier });
    }

    if (tierConfig.resolution && tierConfig.resolution !== 'raw') {
      // 降采样
      await this.downsampleData(
        tenantId,
        dataType as any,
        cutoffTime,
        new Date(),
        tierConfig.resolution as any
      );
    }

    return { success: true };
  }

  // ==========================================
  // 私有辅助方法
  // ==========================================

  private static validateTiers(tiers: RetentionTiers): void {
    if (!tiers.hot && !tiers.warm && !tiers.cold && !tiers.archive) {
      throw new AppError(400, 'At least one tier must be defined');
    }

    // 验证持续时间格式
    for (const tier of Object.values(tiers)) {
      if (tier && tier.duration) {
        this.parseDuration(tier.duration); // 抛出错误如果格式不正确
      }
    }
  }

  private static parseDuration(duration: string): Date {
    const match = duration.match(/^(\d+)(d|w|m|y)$/);
    if (!match) {
      throw new AppError(400, `Invalid duration format: ${duration}`);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const now = new Date();
    const cutoff = new Date(now);

    switch (unit) {
      case 'd':
        cutoff.setDate(cutoff.getDate() - value);
        break;
      case 'w':
        cutoff.setDate(cutoff.getDate() - value * 7);
        break;
      case 'm':
        cutoff.setMonth(cutoff.getMonth() - value);
        break;
      case 'y':
        cutoff.setFullYear(cutoff.getFullYear() - value);
        break;
    }

    return cutoff;
  }

  private static calculateRetentionCutoff(tiers: RetentionTiers): Date {
    // 找到最长的保留时间
    const durations: Date[] = [];

    for (const tier of Object.values(tiers)) {
      if (tier && tier.duration) {
        durations.push(this.parseDuration(tier.duration));
      }
    }

    if (durations.length === 0) {
      // 默认保留 3 年
      return this.parseDuration('3y');
    }

    // 返回最早的时间（最长的保留期）
    return new Date(Math.min(...durations.map((d) => d.getTime())));
  }

  private static async cleanupTelemetry(tenantId: string, cutoff: Date): Promise<number> {
    const result = await prisma.telemetry.deleteMany({
      where: {
        tenantId,
        timestamp: { lt: cutoff },
      },
    });

    return result.count;
  }

  private static async cleanupDeviceStatus(tenantId: string, cutoff: Date): Promise<number> {
    const result = await prisma.deviceStatusHistory.deleteMany({
      where: {
        tenantId,
        timestamp: { lt: cutoff },
      },
    });

    return result.count;
  }

  private static async cleanupEvents(tenantId: string, cutoff: Date): Promise<number> {
    const result = await prisma.eventAlert.deleteMany({
      where: {
        tenantId,
        triggeredAt: { lt: cutoff },
      },
    });

    return result.count;
  }

  private static async cleanupLogs(tenantId: string, cutoff: Date): Promise<number> {
    const result = await prisma.log.deleteMany({
      where: {
        tenantId,
        timestamp: { lt: cutoff },
      },
    });

    return result.count;
  }

  private static async cleanupMeasurements(tenantId: string, cutoff: Date): Promise<number> {
    const result = await prisma.measurement.deleteMany({
      where: {
        tenantId,
        timestamp: { lt: cutoff },
      },
    });

    return result.count;
  }

  private static async downsampleTelemetry(
    tenantId: string,
    fromTime: Date,
    toTime: Date,
    resolution: '1m' | '5m' | '1h' | '1d'
  ): Promise<{ count: number }> {
    // 这里使用 TimescaleDB 的连续聚合视图
    // 或者手动聚合并存储
    
    // 简化版本：查询原始数据并聚合
    const interval = this.getIntervalMinutes(resolution);

    // TODO: 实现实际的聚合逻辑
    // 这需要原生 SQL 或 Prisma 的 raw query

    logger.info('Telemetry downsampling completed', {
      tenantId,
      resolution,
      interval,
    });

    return { count: 0 };
  }

  private static getIntervalMinutes(resolution: string): number {
    switch (resolution) {
      case '1m':
        return 1;
      case '5m':
        return 5;
      case '1h':
        return 60;
      case '1d':
        return 1440;
      default:
        return 5;
    }
  }

  private static getDefaultPolicy(dataType: string): any {
    // 默认策略
    const defaultPolicies: Record<string, RetentionTiers> = {
      TELEMETRY: {
        hot: { duration: '30d', resolution: 'raw', compression: false },
        warm: { duration: '180d', resolution: '5m', compression: true },
        cold: { duration: '3y', resolution: '1h', compression: true },
      },
      DEVICE_STATUS: {
        hot: { duration: '90d', resolution: 'raw', compression: false },
        archive: { duration: '1y', compression: true },
      },
      EVENTS: {
        hot: { duration: '180d', resolution: 'raw', compression: false },
        archive: { duration: '3y', compression: true },
      },
      LOGS: {
        hot: { duration: '14d', resolution: 'raw', compression: false },
        archive: { duration: '90d', compression: true },
      },
      MEASUREMENTS: {
        hot: { duration: '30d', resolution: 'raw', compression: false },
        archive: { duration: '1y', compression: true },
      },
    };

    return {
      tiers: defaultPolicies[dataType] || defaultPolicies.TELEMETRY,
    };
  }
}

// ==========================================
// 定时任务调度器
// ==========================================

export class RetentionScheduler {
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * 启动定时任务
   */
  start(intervalHours: number = 24): void {
    if (this.intervalId) {
      logger.warn('Retention scheduler already running');
      return;
    }

    logger.info('Starting retention scheduler', { intervalHours });

    // 立即执行一次
    this.runRetentionTasks();

    // 定时执行
    this.intervalId = setInterval(
      () => this.runRetentionTasks(),
      intervalHours * 60 * 60 * 1000
    );
  }

  /**
   * 停止定时任务
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Retention scheduler stopped');
    }
  }

  /**
   * 执行保留任务
   */
  private async runRetentionTasks(): Promise<void> {
    try {
      logger.info('Running retention tasks...');

      // 获取所有租户
      const tenants = await prisma.tenant.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, name: true },
      });

      for (const tenant of tenants) {
        try {
          // 对每种数据类型执行保留策略
          const dataTypes = ['TELEMETRY', 'DEVICE_STATUS', 'EVENTS', 'LOGS', 'MEASUREMENTS'];

          for (const dataType of dataTypes) {
            await RetentionPolicyEngine.enforceRetentionPolicy(tenant.id, dataType);
          }

          logger.info('Retention tasks completed for tenant', {
            tenantId: tenant.id,
            tenantName: tenant.name,
          });
        } catch (error) {
          logger.error('Retention task failed for tenant', {
            tenantId: tenant.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      logger.info('All retention tasks completed');
    } catch (error) {
      logger.error('Retention scheduler error', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

export default RetentionPolicyEngine;

