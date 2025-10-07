/**
 * 影子机制 - desired/reported 状态管理
 * 支持设备期望态和报告态的统一管理
 */

import { EventEmitter } from 'events';
import { prisma } from '@/common/config/database';
import { logger } from '@/common/logger';

export interface ShadowState {
  desired: Record<string, any>;
  reported: Record<string, any>;
  delta?: Record<string, any>;
  timestamp: Date;
  version: number;
}

export interface ShadowUpdate {
  tenantId: string;
  deviceId: string;
  deviceType: string;
  state: Partial<ShadowState>;
  clientToken?: string;
}

export class ShadowService extends EventEmitter {
  private static instance: ShadowService;
  private shadowCache = new Map<string, ShadowState>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

  static getInstance(): ShadowService {
    if (!ShadowService.instance) {
      ShadowService.instance = new ShadowService();
    }
    return ShadowService.instance;
  }

  /**
   * 获取设备影子状态
   */
  async getShadow(tenantId: string, deviceId: string): Promise<ShadowState | null> {
    const cacheKey = `${tenantId}:${deviceId}`;
    const cached = this.shadowCache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    try {
      const shadow = await prisma.deviceShadow.findUnique({
        where: {
          tenantId_deviceId: {
            tenantId,
            deviceId
          }
        }
      });

      if (!shadow) {
        return null;
      }

      const shadowState: ShadowState = {
        desired: shadow.desired as Record<string, any>,
        reported: shadow.reported as Record<string, any>,
        timestamp: shadow.updatedAt,
        version: shadow.version
      };

      // 计算 delta
      shadowState.delta = this.calculateDelta(shadowState.desired, shadowState.reported);

      this.shadowCache.set(cacheKey, shadowState);
      return shadowState;
    } catch (error) {
      logger.error('Failed to get device shadow', { tenantId, deviceId, error });
      return null;
    }
  }

  /**
   * 更新设备影子期望态
   */
  async updateDesired(update: ShadowUpdate): Promise<ShadowState> {
    try {
      const { tenantId, deviceId, state, clientToken } = update;

      // 获取当前影子状态
      const currentShadow = await this.getShadow(tenantId, deviceId);
      
      const newDesired = {
        ...(currentShadow?.desired || {}),
        ...state.desired
      };

      const newReported = currentShadow?.reported || {};

      // 计算新的版本号
      const newVersion = (currentShadow?.version || 0) + 1;

      // 更新数据库
      const updatedShadow = await prisma.deviceShadow.upsert({
        where: {
          tenantId_deviceId: {
            tenantId,
            deviceId
          }
        },
        update: {
          desired: newDesired,
          version: newVersion,
          clientToken,
          updatedAt: new Date()
        },
        create: {
          tenantId,
          deviceId,
          desired: newDesired,
          reported: newReported,
          version: newVersion,
          clientToken
        }
      });

      const shadowState: ShadowState = {
        desired: newDesired,
        reported: newReported,
        timestamp: updatedShadow.updatedAt,
        version: newVersion
      };

      // 计算 delta
      shadowState.delta = this.calculateDelta(newDesired, newReported);

      // 更新缓存
      const cacheKey = `${tenantId}:${deviceId}`;
      this.shadowCache.set(cacheKey, shadowState);

      // 触发事件
      this.emit('desiredUpdated', {
        tenantId,
        deviceId,
        shadow: shadowState,
        clientToken
      });

      logger.info('Device shadow desired updated', {
        tenantId,
        deviceId,
        version: newVersion,
        clientToken
      });

      return shadowState;
    } catch (error) {
      logger.error('Failed to update device shadow desired', { update, error });
      throw error;
    }
  }

  /**
   * 更新设备影子报告态
   */
  async updateReported(
    tenantId: string,
    deviceId: string,
    reported: Record<string, any>
  ): Promise<ShadowState> {
    try {
      // 获取当前影子状态
      const currentShadow = await this.getShadow(tenantId, deviceId);
      
      const newDesired = currentShadow?.desired || {};
      const newReported = {
        ...(currentShadow?.reported || {}),
        ...reported
      };

      // 更新数据库
      const updatedShadow = await prisma.deviceShadow.upsert({
        where: {
          tenantId_deviceId: {
            tenantId,
            deviceId
          }
        },
        update: {
          reported: newReported,
          updatedAt: new Date()
        },
        create: {
          tenantId,
          deviceId,
          desired: newDesired,
          reported: newReported,
          version: 1
        }
      });

      const shadowState: ShadowState = {
        desired: newDesired,
        reported: newReported,
        timestamp: updatedShadow.updatedAt,
        version: updatedShadow.version
      };

      // 计算 delta
      shadowState.delta = this.calculateDelta(newDesired, newReported);

      // 更新缓存
      const cacheKey = `${tenantId}:${deviceId}`;
      this.shadowCache.set(cacheKey, shadowState);

      // 触发事件
      this.emit('reportedUpdated', {
        tenantId,
        deviceId,
        shadow: shadowState
      });

      logger.info('Device shadow reported updated', {
        tenantId,
        deviceId,
        version: updatedShadow.version
      });

      return shadowState;
    } catch (error) {
      logger.error('Failed to update device shadow reported', {
        tenantId,
        deviceId,
        error
      });
      throw error;
    }
  }

  /**
   * 计算期望态和报告态的差异
   */
  private calculateDelta(desired: Record<string, any>, reported: Record<string, any>): Record<string, any> {
    const delta: Record<string, any> = {};

    for (const key in desired) {
      if (JSON.stringify(desired[key]) !== JSON.stringify(reported[key])) {
        delta[key] = desired[key];
      }
    }

    return delta;
  }

  /**
   * 获取设备影子历史
   */
  async getShadowHistory(
    tenantId: string,
    deviceId: string,
    limit: number = 100
  ): Promise<ShadowState[]> {
    try {
      const history = await prisma.deviceShadowHistory.findMany({
        where: {
          tenantId,
          deviceId
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit
      });

      return history.map(record => ({
        desired: record.desired as Record<string, any>,
        reported: record.reported as Record<string, any>,
        timestamp: record.createdAt,
        version: record.version
      }));
    } catch (error) {
      logger.error('Failed to get device shadow history', {
        tenantId,
        deviceId,
        error
      });
      return [];
    }
  }

  /**
   * 清理过期缓存
   */
  cleanupCache(): void {
    const now = Date.now();
    for (const [key, shadow] of this.shadowCache.entries()) {
      if (now - shadow.timestamp.getTime() > this.CACHE_TTL) {
        this.shadowCache.delete(key);
      }
    }
  }

  /**
   * 清除指定设备的缓存
   */
  clearDeviceCache(tenantId: string, deviceId: string): void {
    const cacheKey = `${tenantId}:${deviceId}`;
    this.shadowCache.delete(cacheKey);
  }
}

export const shadowService = ShadowService.getInstance();
