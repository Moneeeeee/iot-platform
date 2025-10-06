/**
 * OTA 灰度发布管理器
 * 功能：
 * 1. 灰度策略执行
 * 2. 设备筛选与分配
 * 3. 进度追踪
 * 4. 自动回滚
 * 5. 失败率监控
 */

import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { messageBus, Channels, MessageType, OTAProgressMessage, OTAStatusMessage } from '@/services/message-bus';
import { AppError } from '@/utils/errors';

// ==========================================
// 灰度策略类型
// ==========================================

export interface RolloutStrategy {
  type: 'percentage' | 'tag' | 'region' | 'schedule' | 'device_list';
  
  // 百分比策略
  percentage?: number;
  increments?: number[]; // 阶段式推进 [10, 25, 50, 100]
  
  // 设备筛选
  filters?: {
    tags?: string[];
    regions?: string[];
    deviceList?: string[];
    templateIds?: string[];
  };
  
  // 约束条件
  constraints?: {
    minBattery?: number; // 最低电量百分比
    wifiOnly?: boolean;  // 仅 WiFi
    timeWindow?: {
      start: string; // HH:mm
      end: string;   // HH:mm
      timezone?: string;
    };
  };
  
  // 回滚配置
  rollback?: {
    autoRollback?: boolean;
    failureThreshold?: number; // 失败率阈值 (0-1)
    timeoutMinutes?: number;
  };
}

export interface RolloutStats {
  total: number;
  pending: number;
  downloading: number;
  installing: number;
  success: number;
  failed: number;
  successRate: number;
}

// ==========================================
// OTA 灰度发布管理器
// ==========================================

export class RolloutManager {
  /**
   * 创建灰度发布
   */
  static async createRollout(params: {
    tenantId: string;
    firmwareId: string;
    name: string;
    description?: string;
    strategy: RolloutStrategy;
  }) {
    const { tenantId, firmwareId, name, description, strategy } = params;

    // 验证固件存在
    const firmware = await prisma.firmware.findUnique({
      where: { id: firmwareId },
    });

    if (!firmware || firmware.tenantId !== tenantId) {
      throw new AppError(404, 'Firmware not found');
    }

    if (firmware.status !== 'PUBLISHED') {
      throw new AppError(400, 'Firmware is not published');
    }

    // 创建发布记录
    const rollout = await prisma.firmwareRollout.create({
      data: {
        tenantId,
        firmwareId,
        name,
        description,
        strategy: strategy as any,
        status: 'DRAFT',
        stats: {
          total: 0,
          pending: 0,
          downloading: 0,
          installing: 0,
          success: 0,
          failed: 0,
          successRate: 0,
        },
      },
    });

    logger.info('Rollout created', { rolloutId: rollout.id, name });
    return rollout;
  }

  /**
   * 启动灰度发布
   */
  static async startRollout(tenantId: string, rolloutId: string) {
    const rollout = await prisma.firmwareRollout.findUnique({
      where: { id: rolloutId },
      include: { firmware: true },
    });

    if (!rollout || rollout.tenantId !== tenantId) {
      throw new AppError(404, 'Rollout not found');
    }

    if (rollout.status !== 'DRAFT' && rollout.status !== 'PAUSED') {
      throw new AppError(400, `Cannot start rollout in ${rollout.status} status`);
    }

    // 筛选目标设备
    const targetDevices = await this.selectTargetDevices(tenantId, rollout.strategy as RolloutStrategy);

    if (targetDevices.length === 0) {
      throw new AppError(400, 'No devices match the rollout criteria');
    }

    // 应用百分比限制
    const strategy = rollout.strategy as RolloutStrategy;
    let selectedDevices = targetDevices;

    if (strategy.type === 'percentage' && strategy.percentage) {
      const count = Math.ceil((targetDevices.length * strategy.percentage) / 100);
      selectedDevices = targetDevices.slice(0, count);
    }

    // 创建更新任务
    const updateTasks = selectedDevices.map((deviceId) => ({
      tenantId,
      deviceId,
      rolloutId,
      status: 'PENDING' as const,
      progress: 0,
    }));

    await prisma.firmwareUpdateStatus.createMany({
      data: updateTasks,
      skipDuplicates: true,
    });

    // 更新发布状态
    const stats: RolloutStats = {
      total: selectedDevices.length,
      pending: selectedDevices.length,
      downloading: 0,
      installing: 0,
      success: 0,
      failed: 0,
      successRate: 0,
    };

    await prisma.firmwareRollout.update({
      where: { id: rolloutId },
      data: {
        status: 'ACTIVE',
        startedAt: new Date(),
        stats: stats as any,
      },
    });

    logger.info('Rollout started', {
      rolloutId,
      targetDevices: selectedDevices.length,
    });

    // 触发设备通知（通过消息总线）
    await this.notifyDevices(rollout, selectedDevices);

    return { rolloutId, targetDevices: selectedDevices.length };
  }

  /**
   * 暂停灰度发布
   */
  static async pauseRollout(tenantId: string, rolloutId: string) {
    const rollout = await prisma.firmwareRollout.findUnique({
      where: { id: rolloutId },
    });

    if (!rollout || rollout.tenantId !== tenantId) {
      throw new AppError(404, 'Rollout not found');
    }

    if (rollout.status !== 'ACTIVE') {
      throw new AppError(400, 'Rollout is not active');
    }

    await prisma.firmwareRollout.update({
      where: { id: rolloutId },
      data: {
        status: 'PAUSED',
        pausedAt: new Date(),
      },
    });

    logger.info('Rollout paused', { rolloutId });
    return { success: true };
  }

  /**
   * 继续灰度发布
   */
  static async resumeRollout(tenantId: string, rolloutId: string) {
    const rollout = await prisma.firmwareRollout.findUnique({
      where: { id: rolloutId },
    });

    if (!rollout || rollout.tenantId !== tenantId) {
      throw new AppError(404, 'Rollout not found');
    }

    if (rollout.status !== 'PAUSED') {
      throw new AppError(400, 'Rollout is not paused');
    }

    await prisma.firmwareRollout.update({
      where: { id: rolloutId },
      data: {
        status: 'ACTIVE',
        pausedAt: null,
      },
    });

    logger.info('Rollout resumed', { rolloutId });
    return { success: true };
  }

  /**
   * 回滚灰度发布
   */
  static async rollbackRollout(tenantId: string, rolloutId: string, reason?: string) {
    const rollout = await prisma.firmwareRollout.findUnique({
      where: { id: rolloutId },
      include: { firmware: true },
    });

    if (!rollout || rollout.tenantId !== tenantId) {
      throw new AppError(404, 'Rollout not found');
    }

    // 取消所有待处理的更新
    await prisma.firmwareUpdateStatus.updateMany({
      where: {
        rolloutId,
        status: { in: ['PENDING', 'SCHEDULED', 'DOWNLOADING'] },
      },
      data: {
        status: 'CANCELLED',
      },
    });

    // 更新发布状态
    await prisma.firmwareRollout.update({
      where: { id: rolloutId },
      data: {
        status: 'ROLLBACK',
        completedAt: new Date(),
      },
    });

    logger.warn('Rollout rolled back', { rolloutId, reason });
    return { success: true };
  }

  /**
   * 更新设备 OTA 进度
   */
  static async updateDeviceProgress(params: {
    tenantId: string;
    deviceId: string;
    rolloutId: string;
    status: string;
    progress: number;
    error?: string;
  }) {
    const { tenantId, deviceId, rolloutId, status, progress, error } = params;

    await prisma.firmwareUpdateStatus.update({
      where: {
        deviceId_rolloutId: {
          deviceId,
          rolloutId,
        },
      },
      data: {
        status,
        progress,
        error,
        updatedAt: new Date(),
        ...(status === 'DOWNLOADING' && { startedAt: new Date() }),
        ...(status === 'SUCCESS' || status === 'FAILED' ? { completedAt: new Date() } : {}),
      },
    });

    // 更新统计
    await this.updateRolloutStats(rolloutId);

    // 发布进度消息
    const progressMessage: OTAProgressMessage = {
      type: MessageType.OTA_PROGRESS,
      tenantId,
      deviceId,
      rolloutId,
      progress,
      stage: status as any,
      timestamp: new Date(),
      protocol: 'websocket',
      source: 'ota-manager',
    };

    await messageBus.publish(Channels.OTA_PROGRESS, progressMessage);

    // 检查是否需要自动回滚
    await this.checkAutoRollback(rolloutId);

    logger.debug('Device OTA progress updated', {
      deviceId,
      rolloutId,
      status,
      progress,
    });
  }

  /**
   * 更新统计信息
   */
  private static async updateRolloutStats(rolloutId: string) {
    const statuses = await prisma.firmwareUpdateStatus.groupBy({
      by: ['status'],
      where: { rolloutId },
      _count: true,
    });

    const stats: RolloutStats = {
      total: 0,
      pending: 0,
      downloading: 0,
      installing: 0,
      success: 0,
      failed: 0,
      successRate: 0,
    };

    for (const { status, _count } of statuses) {
      stats.total += _count;
      
      switch (status) {
        case 'PENDING':
        case 'SCHEDULED':
          stats.pending += _count;
          break;
        case 'DOWNLOADING':
        case 'DOWNLOADED':
          stats.downloading += _count;
          break;
        case 'INSTALLING':
          stats.installing += _count;
          break;
        case 'SUCCESS':
          stats.success += _count;
          break;
        case 'FAILED':
          stats.failed += _count;
          break;
      }
    }

    const completed = stats.success + stats.failed;
    stats.successRate = completed > 0 ? stats.success / completed : 0;

    await prisma.firmwareRollout.update({
      where: { id: rolloutId },
      data: { stats: stats as any },
    });

    // 检查是否全部完成
    if (stats.pending === 0 && stats.downloading === 0 && stats.installing === 0) {
      await prisma.firmwareRollout.update({
        where: { id: rolloutId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      logger.info('Rollout completed', { rolloutId, stats });
    }
  }

  /**
   * 检查自动回滚条件
   */
  private static async checkAutoRollback(rolloutId: string) {
    const rollout = await prisma.firmwareRollout.findUnique({
      where: { id: rolloutId },
    });

    if (!rollout || rollout.status !== 'ACTIVE') {
      return;
    }

    const strategy = rollout.strategy as RolloutStrategy;
    const stats = rollout.stats as RolloutStats;

    // 检查失败率阈值
    if (strategy.rollback?.autoRollback && strategy.rollback.failureThreshold) {
      const threshold = strategy.rollback.failureThreshold;
      
      if (stats.successRate < (1 - threshold) && (stats.success + stats.failed) >= 10) {
        logger.warn('Auto-rollback triggered: failure threshold exceeded', {
          rolloutId,
          successRate: stats.successRate,
          threshold,
        });

        await this.rollbackRollout(rollout.tenantId, rolloutId, 'Auto-rollback: failure threshold exceeded');
      }
    }

    // 检查超时
    if (strategy.rollback?.timeoutMinutes && rollout.startedAt) {
      const elapsed = Date.now() - rollout.startedAt.getTime();
      const timeout = strategy.rollback.timeoutMinutes * 60 * 1000;

      if (elapsed > timeout) {
        logger.warn('Auto-rollback triggered: timeout', { rolloutId });
        await this.rollbackRollout(rollout.tenantId, rolloutId, 'Auto-rollback: timeout');
      }
    }
  }

  /**
   * 筛选目标设备
   */
  private static async selectTargetDevices(
    tenantId: string,
    strategy: RolloutStrategy
  ): Promise<string[]> {
    const where: any = {
      tenantId,
      isDeleted: false,
      status: { in: ['ONLINE', 'OFFLINE'] }, // 排除错误和维护中的设备
    };

    // 按标签筛选
    if (strategy.filters?.tags && strategy.filters.tags.length > 0) {
      // 假设 tags 存储在 metadata.tags 数组中
      where.metadata = {
        path: ['tags'],
        array_contains: strategy.filters.tags,
      };
    }

    // 按模板筛选
    if (strategy.filters?.templateIds && strategy.filters.templateIds.length > 0) {
      where.templateId = { in: strategy.filters.templateIds };
    }

    // 按设备列表筛选
    if (strategy.filters?.deviceList && strategy.filters.deviceList.length > 0) {
      where.id = { in: strategy.filters.deviceList };
    }

    const devices = await prisma.device.findMany({
      where,
      select: { id: true },
    });

    return devices.map((d) => d.id);
  }

  /**
   * 通知设备（通过消息总线）
   */
  private static async notifyDevices(rollout: any, deviceIds: string[]) {
    // 这里可以通过 MQTT/WebSocket 通知设备有新固件
    for (const deviceId of deviceIds) {
      const message: OTAStatusMessage = {
        type: MessageType.OTA_STATUS,
        tenantId: rollout.tenantId,
        deviceId,
        rolloutId: rollout.id,
        status: 'SUCCESS', // 此处应为 'AVAILABLE'
        timestamp: new Date(),
        protocol: 'mqtt',
        source: 'ota-manager',
      };

      await messageBus.publish(
        Channels.deviceChannel(deviceId, 'ota'),
        message
      );
    }
  }

  /**
   * 阶段式推进
   */
  static async advanceToNextIncrement(tenantId: string, rolloutId: string) {
    const rollout = await prisma.firmwareRollout.findUnique({
      where: { id: rolloutId },
    });

    if (!rollout || rollout.tenantId !== tenantId) {
      throw new AppError(404, 'Rollout not found');
    }

    const strategy = rollout.strategy as RolloutStrategy;
    const stats = rollout.stats as RolloutStats;

    if (!strategy.increments || strategy.increments.length === 0) {
      throw new AppError(400, 'No increments defined for this rollout');
    }

    // 找到当前阶段
    const currentPercentage = (stats.total / (stats.total + stats.pending)) * 100;
    const nextIncrement = strategy.increments.find((inc) => inc > currentPercentage);

    if (!nextIncrement) {
      throw new AppError(400, 'Already at final increment');
    }

    // 选择更多设备
    const allTargetDevices = await this.selectTargetDevices(tenantId, strategy);
    const newTargetCount = Math.ceil((allTargetDevices.length * nextIncrement) / 100);
    const currentTargetCount = stats.total;
    const additionalDevices = allTargetDevices.slice(currentTargetCount, newTargetCount);

    // 创建新的更新任务
    const updateTasks = additionalDevices.map((deviceId) => ({
      tenantId,
      deviceId,
      rolloutId,
      status: 'PENDING' as const,
      progress: 0,
    }));

    await prisma.firmwareUpdateStatus.createMany({
      data: updateTasks,
      skipDuplicates: true,
    });

    await this.updateRolloutStats(rolloutId);

    logger.info('Advanced to next increment', {
      rolloutId,
      increment: nextIncrement,
      additionalDevices: additionalDevices.length,
    });

    return { success: true, increment: nextIncrement };
  }
}

export default RolloutManager;

