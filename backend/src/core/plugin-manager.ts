/**
 * 插件管理器
 * 负责管理所有插件，包括设备类型识别和配置生成
 */

import { DevicePlugin } from './plugin-interface';
import { Logger } from '@/common/logger';

export class PluginManager {
  private devicePlugins: Map<string, DevicePlugin> = new Map();
  private logger = new Logger('PluginManager');

  /**
   * 注册设备插件
   */
  registerDevicePlugin(plugin: DevicePlugin): void {
    this.devicePlugins.set(plugin.deviceType, plugin);
    this.logger.info(`Device plugin registered: ${plugin.deviceType}`);
  }

  /**
   * 注销设备插件
   */
  unregisterDevicePlugin(deviceType: string): void {
    this.devicePlugins.delete(deviceType);
    this.logger.info(`Device plugin unregistered: ${deviceType}`);
  }

  /**
   * 根据设备信息识别设备类型
   */
  identifyDeviceType(deviceInfo: any): string {
    // 如果设备明确指定了类型，直接使用
    if (deviceInfo.device_type) {
      return deviceInfo.device_type;
    }

    // 遍历所有插件，找到匹配的设备类型
    for (const [deviceType, plugin] of this.devicePlugins) {
      try {
        if (plugin.matchesDevice(deviceInfo)) {
          this.logger.debug(`Device identified as: ${deviceType}`, {
            boardName: deviceInfo.board_name,
            macAddress: deviceInfo.mac_address
          });
          return deviceType;
        }
      } catch (error) {
        this.logger.warn(`Error in device plugin ${deviceType}:`, error);
      }
    }

    // 如果没有匹配的插件，返回通用类型
    this.logger.debug('No specific device plugin matched, using generic type');
    return 'generic-device';
  }

  /**
   * 提取设备能力
   */
  extractDeviceCapabilities(deviceInfo: any, deviceType: string): string[] {
    const plugin = this.devicePlugins.get(deviceType);
    if (plugin) {
      try {
        return plugin.extractDeviceCapabilities(deviceInfo);
      } catch (error) {
        this.logger.warn(`Error extracting capabilities from plugin ${deviceType}:`, error);
      }
    }

    // 默认能力
    return ['telemetry', 'status', 'commands', 'ota'];
  }

  /**
   * 生成设备特定配置
   */
  generateDeviceConfig(deviceInfo: any, deviceType: string, baseConfig: any): any {
    const plugin = this.devicePlugins.get(deviceType);
    if (plugin) {
      try {
        return plugin.generateDeviceConfig(deviceInfo, baseConfig);
      } catch (error) {
        this.logger.warn(`Error generating config from plugin ${deviceType}:`, error);
      }
    }

    // 返回基础配置
    return baseConfig;
  }

  /**
   * 获取所有注册的设备插件
   */
  getDevicePlugins(): DevicePlugin[] {
    return Array.from(this.devicePlugins.values());
  }

  /**
   * 获取特定设备插件
   */
  getDevicePlugin(deviceType: string): DevicePlugin | undefined {
    return this.devicePlugins.get(deviceType);
  }

  /**
   * 检查设备插件是否存在
   */
  hasDevicePlugin(deviceType: string): boolean {
    return this.devicePlugins.has(deviceType);
  }

  /**
   * 获取所有支持设备类型
   */
  getSupportedDeviceTypes(): string[] {
    return Array.from(this.devicePlugins.keys());
  }
}

// 全局插件管理器实例
export const pluginManager = new PluginManager();
