/**
 * OTA策略服务
 * 
 * 基于设备固件通道、租户策略和设备信息决策OTA升级策略
 * 支持灰度发布、通道匹配、约束条件等高级功能
 */

import { DeviceBootstrapRequest } from '../types';

/**
 * 固件发布通道类型
 */
export type FirmwareChannel = 'stable' | 'beta' | 'dev';

/**
 * OTA约束条件
 */
export interface OtaConstraints {
  /** 最小电量百分比 */
  minBatteryPct?: number;
  /** 网络要求 */
  network?: string;
  /** 时间窗口 */
  timeWindow?: string;
  /** 通道匹配 */
  channelMatch?: FirmwareChannel[];
  /** 硬件版本要求 */
  hardwareVersion?: string[];
  /** 设备类型要求 */
  deviceType?: string[];
}

/**
 * OTA决策结果
 */
export interface OtaDecision {
  /** 是否有可用更新 */
  available: boolean;
  /** 目标固件信息 */
  targetFirmware?: {
    version: string;
    build: string;
    channel: FirmwareChannel;
    url: string;
    checksum: string;
    size: number;
    releaseNotes: string;
    force: number;
    constraints: OtaConstraints;
  };
  /** 升级策略 */
  strategy: {
    /** 是否强制升级 */
    force: boolean;
    /** 升级优先级 */
    priority: 'low' | 'medium' | 'high' | 'critical';
    /** 升级时间窗口 */
    timeWindow?: string;
    /** 回滚策略 */
    rollback?: boolean;
  };
}

/**
 * OTA策略配置
 */
export interface OtaPolicyConfig {
  /** 通道升级策略 */
  channelPolicies: {
    stable: {
      /** 是否允许接收beta版本 */
      allowBeta: boolean;
      /** 是否允许接收dev版本 */
      allowDev: boolean;
      /** 升级频率限制（小时） */
      upgradeIntervalHours: number;
    };
    beta: {
      /** 是否允许接收dev版本 */
      allowDev: boolean;
      /** 升级频率限制（小时） */
      upgradeIntervalHours: number;
    };
    dev: {
      /** 升级频率限制（小时） */
      upgradeIntervalHours: number;
    };
  };
  /** 租户特定策略 */
  tenantPolicies?: {
    [tenantId: string]: {
      /** 允许的通道列表 */
      allowedChannels: FirmwareChannel[];
      /** 灰度发布配置 */
      canaryConfig?: {
        percentage: number;
        deviceGroups: string[];
      };
    };
  };
}

/**
 * OTA策略服务
 */
export class OtaStrategyService {
  private readonly config: OtaPolicyConfig;

  constructor(config: OtaPolicyConfig = this.getDefaultConfig()) {
    this.config = config;
  }

  /**
   * 决策OTA升级策略
   */
  async decideOtaUpgrade(
    deviceRequest: DeviceBootstrapRequest,
    tenantId: string
  ): Promise<OtaDecision> {
    const currentChannel = deviceRequest.firmware.channel || 'stable';
    
    // 1. 检查租户策略
    const tenantPolicy = this.getTenantPolicy(tenantId);
    if (!this.isChannelAllowed(currentChannel, tenantPolicy)) {
      return { available: false, strategy: { force: false, priority: 'low' } };
    }

    // 2. 检查是否有可用更新
    const availableUpdate = await this.checkAvailableUpdate(
      deviceRequest,
      tenantId
    );

    if (!availableUpdate) {
      return { available: false, strategy: { force: false, priority: 'low' } };
    }

    // 3. 应用通道策略
    const channelPolicy = this.config.channelPolicies[currentChannel];
    const upgradeAllowed = this.checkUpgradeInterval(
      deviceRequest.deviceId,
      channelPolicy.upgradeIntervalHours
    );

    if (!upgradeAllowed) {
      return { available: false, strategy: { force: false, priority: 'low' } };
    }

    // 4. 生成升级策略
    const strategy = this.generateUpgradeStrategy(
      currentChannel,
      availableUpdate,
      tenantPolicy
    );

    return {
      available: true,
      targetFirmware: availableUpdate,
      strategy
    };
  }

  /**
   * 检查可用更新
   */
  private async checkAvailableUpdate(
    deviceRequest: DeviceBootstrapRequest,
    _tenantId: string
  ): Promise<OtaDecision['targetFirmware'] | null> {
    // 这里应该查询固件版本数据库
    // 示例实现：根据通道返回不同的更新策略
    
    const currentChannel = deviceRequest.firmware.channel || 'stable';
    const currentVersion = deviceRequest.firmware.current;

    // 模拟检查更新逻辑
    const availableVersions = {
      stable: [
        { version: '1.2.4', build: '20240102.001', channel: 'stable' as FirmwareChannel }
      ],
      beta: [
        { version: '1.3.0-beta.1', build: '20240102.002', channel: 'beta' as FirmwareChannel }
      ],
      dev: [
        { version: '1.3.0-dev.1', build: '20240102.003', channel: 'dev' as FirmwareChannel }
      ]
    };

    // 检查当前通道的更新
    const channelUpdates = availableVersions[currentChannel] || [];
    const update = channelUpdates.find(u => u.version !== currentVersion);

    if (!update) {
      return null;
    }

    return {
      version: update.version,
      build: update.build,
      channel: update.channel,
      url: `https://firmware.example.com/${update.version}/${update.build}.bin`,
      checksum: 'sha256:abc123...',
      size: 1024000,
      releaseNotes: `更新到版本 ${update.version}`,
      force: this.shouldForceUpgrade(currentChannel, update.version),
      constraints: {
        minBatteryPct: 20,
        network: 'wifi',
        timeWindow: '02:00-06:00',
        channelMatch: [currentChannel],
        hardwareVersion: [deviceRequest.hardware.version],
        deviceType: [deviceRequest.deviceType]
      }
    };
  }

  /**
   * 生成升级策略
   */
  private generateUpgradeStrategy(
    currentChannel: FirmwareChannel,
    targetFirmware: NonNullable<OtaDecision['targetFirmware']>,
    _tenantPolicy?: any
  ): OtaDecision['strategy'] {
    // 根据通道和版本确定升级策略
    let priority: OtaDecision['strategy']['priority'] = 'medium';
    let force = false;

    if (targetFirmware.channel === 'dev') {
      priority = 'low';
    } else if (targetFirmware.channel === 'beta' && currentChannel === 'stable') {
      priority = 'medium';
    } else if (targetFirmware.channel === 'stable') {
      priority = 'high';
      force = targetFirmware.force > 0;
    }

    // 安全更新强制升级
    if (targetFirmware.version.includes('security') || targetFirmware.version.includes('critical')) {
      priority = 'critical';
      force = true;
    }

    const result: OtaDecision['strategy'] = {
      force,
      priority,
      rollback: priority === 'critical'
    };
    
    if (targetFirmware.constraints.timeWindow) {
      result.timeWindow = targetFirmware.constraints.timeWindow;
    }
    
    return result;
  }

  /**
   * 检查升级间隔
   */
  private checkUpgradeInterval(
    _deviceId: string,
    _intervalHours: number
  ): boolean {
    // 这里应该查询设备上次升级时间
    // 示例实现：简单返回true
    return true;
  }

  /**
   * 获取租户策略
   */
  private getTenantPolicy(tenantId: string) {
    return this.config.tenantPolicies?.[tenantId];
  }

  /**
   * 检查通道是否被允许
   */
  private isChannelAllowed(
    channel: FirmwareChannel,
    tenantPolicy?: any
  ): boolean {
    if (!tenantPolicy) {
      return true; // 默认允许所有通道
    }

    return tenantPolicy.allowedChannels?.includes(channel) ?? true;
  }

  /**
   * 判断是否应该强制升级
   */
  private shouldForceUpgrade(
    currentChannel: FirmwareChannel,
    targetVersion: string
  ): number {
    // 安全更新强制升级
    if (targetVersion.includes('security')) {
      return 1;
    }

    // 稳定通道到稳定通道的升级
    if (currentChannel === 'stable') {
      return 0;
    }

    // 其他情况不强制
    return 0;
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): OtaPolicyConfig {
    return {
      channelPolicies: {
        stable: {
          allowBeta: false,
          allowDev: false,
          upgradeIntervalHours: 24
        },
        beta: {
          allowDev: false,
          upgradeIntervalHours: 12
        },
        dev: {
          upgradeIntervalHours: 6
        }
      },
      tenantPolicies: {
        // 示例租户策略
        'default': {
          allowedChannels: ['stable'],
          canaryConfig: {
            percentage: 10,
            deviceGroups: ['test-devices']
          }
        }
      }
    };
  }
}
