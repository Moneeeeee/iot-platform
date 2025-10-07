/**
 * 插件加载器
 * 自动发现和加载所有插件
 */

import { PluginManager } from './plugin-manager';
import { DevicePlugin } from './plugin-interface';
import { Logger } from '@/common/logger';
import path from 'path';
import fs from 'fs';

export class PluginLoader {
  private static instance: PluginLoader;
  private pluginManager: PluginManager;
  private logger = new Logger('PluginLoader');
  private loadedPlugins: Map<string, DevicePlugin> = new Map();
  private pluginDir: string;
  private context: any;

  constructor(pluginManager: PluginManager, pluginDir?: string, context?: any) {
    this.pluginManager = pluginManager;
    this.pluginDir = pluginDir || path.join(__dirname, '../plugins');
    this.context = context || {};
  }

  /**
   * 获取PluginLoader实例（单例）
   */
  static getInstance(pluginDir?: string, context?: any): PluginLoader {
    if (!PluginLoader.instance) {
      PluginLoader.instance = new PluginLoader(new PluginManager(), pluginDir, context);
    }
    return PluginLoader.instance;
  }

  /**
   * 初始化插件系统
   */
  async initialize(): Promise<void> {
    try {
      await this.loadDevicePlugins();
      await this.loadTenantPlugins();
      this.logger.info('Plugin system initialized');
    } catch (error) {
      this.logger.error('Failed to initialize plugin system', { error });
      throw error;
    }
  }

  /**
   * 卸载所有插件
   */
  async unloadAllPlugins(): Promise<void> {
    try {
      for (const [deviceType, plugin] of this.loadedPlugins) {
        try {
          if (typeof plugin.shutdown === 'function') {
            await plugin.shutdown();
          }
          this.pluginManager.unregisterDevicePlugin(deviceType);
        } catch (error) {
          this.logger.error(`Failed to unload plugin ${deviceType}`, { error });
        }
      }
      
      this.loadedPlugins.clear();
      this.logger.info('All plugins unloaded');
    } catch (error) {
      this.logger.error('Failed to unload all plugins', { error });
    }
  }

  /**
   * 加载租户插件
   */
  private async loadTenantPlugins(): Promise<void> {
    const tenantsPath = path.join(this.pluginDir, 'tenants');
    
    if (!fs.existsSync(tenantsPath)) {
      this.logger.warn('Tenants plugins directory not found');
      return;
    }

    const tenantDirs = fs.readdirSync(tenantsPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    this.logger.info(`Found ${tenantDirs.length} tenant plugin directories:`, tenantDirs);
    
    // TODO: 实现租户插件加载逻辑
  }

  /**
   * 加载所有设备插件
   */
  async loadDevicePlugins(): Promise<void> {
    const devicesPath = path.join(__dirname, '../plugins/devices');
    
    if (!fs.existsSync(devicesPath)) {
      this.logger.warn('Devices plugins directory not found');
      return;
    }

    const deviceDirs = fs.readdirSync(devicesPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    this.logger.info(`Found ${deviceDirs.length} device plugin directories:`, deviceDirs);

    for (const deviceDir of deviceDirs) {
      try {
        await this.loadDevicePlugin(deviceDir);
      } catch (error) {
        this.logger.error(`Failed to load device plugin ${deviceDir}:`, error);
      }
    }
  }

  /**
   * 加载单个设备插件
   */
  private async loadDevicePlugin(deviceDir: string): Promise<void> {
    const pluginPath = path.join(__dirname, '../plugins/devices', deviceDir, 'index.ts');
    
    if (!fs.existsSync(pluginPath)) {
      this.logger.warn(`Plugin index file not found: ${pluginPath}`);
      return;
    }

    try {
      // 动态导入插件
      const pluginModule = await import(pluginPath);
      const PluginClass = pluginModule.default || pluginModule[Object.keys(pluginModule)[0]];
      
      if (!PluginClass) {
        this.logger.warn(`No default export found in ${pluginPath}`);
        return;
      }

      // 创建插件实例
      const plugin = new PluginClass();
      
      if (!plugin.deviceType) {
        this.logger.warn(`Plugin ${deviceDir} does not have deviceType property`);
        return;
      }

      // 注册插件
      this.pluginManager.registerDevicePlugin(plugin);
      this.loadedPlugins.set(plugin.deviceType, plugin);
      
      this.logger.info(`Device plugin loaded: ${plugin.deviceType} (${deviceDir})`);
    } catch (error) {
      this.logger.error(`Error loading plugin ${deviceDir}:`, error);
    }
  }

  /**
   * 获取已加载的插件
   */
  getLoadedPlugins(): Array<{ name: string; instance: DevicePlugin }> {
    const plugins: Array<{ name: string; instance: DevicePlugin }> = [];
    for (const [deviceType, plugin] of this.loadedPlugins) {
      plugins.push({
        name: deviceType,
        instance: plugin
      });
    }
    return plugins;
  }

  /**
   * 获取已加载的插件Map
   */
  getLoadedPluginsMap(): Map<string, DevicePlugin> {
    return this.loadedPlugins;
  }

  /**
   * 重新加载所有插件
   */
  async reloadPlugins(): Promise<void> {
    this.logger.info('Reloading all plugins...');
    
    // 清理现有插件
    for (const [deviceType, plugin] of this.loadedPlugins) {
      try {
        await plugin.shutdown();
        this.pluginManager.unregisterDevicePlugin(deviceType);
      } catch (error) {
        this.logger.error(`Error shutting down plugin ${deviceType}:`, error);
      }
    }
    
    this.loadedPlugins.clear();
    
    // 重新加载
    await this.loadDevicePlugins();
    
    this.logger.info(`Plugin reload completed. Loaded ${this.loadedPlugins.size} plugins.`);
  }

  /**
   * 获取插件统计信息
   */
  getPluginStats(): {
    totalPlugins: number;
    loadedPlugins: string[];
    supportedDeviceTypes: string[];
  } {
    return {
      totalPlugins: this.loadedPlugins.size,
      loadedPlugins: Array.from(this.loadedPlugins.keys()),
      supportedDeviceTypes: this.pluginManager.getSupportedDeviceTypes()
    };
  }
}

// 全局插件加载器实例
import { pluginManager } from './plugin-manager';
export const pluginLoader = new PluginLoader(pluginManager);
