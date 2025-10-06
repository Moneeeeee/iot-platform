/**
 * 插件加载器
 * 扫描 plugins/tenants 和 plugins/devices，自动挂载路由和服务
 */

import fs from 'fs/promises';
import path from 'path';
import { EventEmitter } from 'events';
import { logger } from '../common/logger';
import { IPlugin, TenantPlugin, DevicePlugin, PluginContext } from './plugin-interface';
import { ConfigManager } from '../config-center/config-manager';

export interface LoadedPlugin {
  name: string;
  type: 'tenant' | 'device';
  instance: IPlugin;
  path: string;
  loadedAt: Date;
}

export class PluginLoader extends EventEmitter {
  private static instance: PluginLoader;
  private loadedPlugins = new Map<string, LoadedPlugin>();
  private pluginsPath: string;
  private context: PluginContext;

  constructor(pluginsPath: string, context: PluginContext) {
    super();
    this.pluginsPath = pluginsPath;
    this.context = context;
  }

  static getInstance(pluginsPath?: string, context?: PluginContext): PluginLoader {
    if (!PluginLoader.instance && pluginsPath && context) {
      PluginLoader.instance = new PluginLoader(pluginsPath, context);
    }
    return PluginLoader.instance;
  }

  /**
   * 初始化插件加载器
   */
  async initialize(): Promise<void> {
    try {
      // 确保插件目录存在
      await this.ensurePluginDirectories();

      // 加载所有插件
      await this.loadAllPlugins();

      logger.info('Plugin loader initialized', {
        loadedPlugins: this.loadedPlugins.size
      });
    } catch (error) {
      logger.error('Failed to initialize plugin loader', error);
      throw error;
    }
  }

  /**
   * 确保插件目录存在
   */
  private async ensurePluginDirectories(): Promise<void> {
    const tenantPluginsPath = path.join(this.pluginsPath, 'tenants');
    const devicePluginsPath = path.join(this.pluginsPath, 'devices');

    try {
      await fs.access(tenantPluginsPath);
    } catch {
      await fs.mkdir(tenantPluginsPath, { recursive: true });
    }

    try {
      await fs.access(devicePluginsPath);
    } catch {
      await fs.mkdir(devicePluginsPath, { recursive: true });
    }
  }

  /**
   * 加载所有插件
   */
  private async loadAllPlugins(): Promise<void> {
    // 加载租户插件
    await this.loadTenantPlugins();

    // 加载设备插件
    await this.loadDevicePlugins();
  }

  /**
   * 加载租户插件
   */
  private async loadTenantPlugins(): Promise<void> {
    const tenantPluginsPath = path.join(this.pluginsPath, 'tenants');
    
    try {
      const tenantDirs = await fs.readdir(tenantPluginsPath, { withFileTypes: true });
      
      for (const dir of tenantDirs) {
        if (dir.isDirectory()) {
          await this.loadTenantPlugin(dir.name);
        }
      }
    } catch (error) {
      logger.error('Failed to load tenant plugins', error);
    }
  }

  /**
   * 加载设备插件
   */
  private async loadDevicePlugins(): Promise<void> {
    const devicePluginsPath = path.join(this.pluginsPath, 'devices');
    
    try {
      const deviceDirs = await fs.readdir(devicePluginsPath, { withFileTypes: true });
      
      for (const dir of deviceDirs) {
        if (dir.isDirectory()) {
          await this.loadDevicePlugin(dir.name);
        }
      }
    } catch (error) {
      logger.error('Failed to load device plugins', error);
    }
  }

  /**
   * 加载单个租户插件
   */
  private async loadTenantPlugin(tenantName: string): Promise<void> {
    try {
      const pluginPath = path.join(this.pluginsPath, 'tenants', tenantName);
      const configPath = path.join(pluginPath, 'config.json');
      const indexPath = path.join(pluginPath, 'index.ts');

      // 检查必要文件
      await fs.access(configPath);
      await fs.access(indexPath);

      // 加载插件配置
      const configContent = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configContent);

      // 动态导入插件
      const pluginModule = await import(indexPath);
      const PluginClass = pluginModule.default || pluginModule[config.className];

      if (!PluginClass) {
        throw new Error(`Plugin class not found: ${config.className}`);
      }

      // 创建插件实例
      const pluginInstance = new PluginClass(tenantName) as TenantPlugin;
      
      // 初始化插件
      await pluginInstance.init(this.context);

      // 注册插件
      const loadedPlugin: LoadedPlugin = {
        name: `${tenantName}-tenant`,
        type: 'tenant',
        instance: pluginInstance,
        path: pluginPath,
        loadedAt: new Date()
      };

      this.loadedPlugins.set(loadedPlugin.name, loadedPlugin);

      logger.info('Tenant plugin loaded', {
        name: loadedPlugin.name,
        path: pluginPath
      });

      this.emit('pluginLoaded', loadedPlugin);
    } catch (error) {
      logger.error(`Failed to load tenant plugin: ${tenantName}`, error);
    }
  }

  /**
   * 加载单个设备插件
   */
  private async loadDevicePlugin(deviceType: string): Promise<void> {
    try {
      const pluginPath = path.join(this.pluginsPath, 'devices', deviceType);
      const configPath = path.join(pluginPath, 'config.json');
      const indexPath = path.join(pluginPath, 'index.ts');

      // 检查必要文件
      await fs.access(configPath);
      await fs.access(indexPath);

      // 加载插件配置
      const configContent = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configContent);

      // 动态导入插件
      const pluginModule = await import(indexPath);
      const PluginClass = pluginModule.default || pluginModule[config.className];

      if (!PluginClass) {
        throw new Error(`Plugin class not found: ${config.className}`);
      }

      // 创建插件实例
      const pluginInstance = new PluginClass(deviceType) as DevicePlugin;
      
      // 初始化插件
      await pluginInstance.init(this.context);

      // 注册插件
      const loadedPlugin: LoadedPlugin = {
        name: `${deviceType}-device`,
        type: 'device',
        instance: pluginInstance,
        path: pluginPath,
        loadedAt: new Date()
      };

      this.loadedPlugins.set(loadedPlugin.name, loadedPlugin);

      logger.info('Device plugin loaded', {
        name: loadedPlugin.name,
        path: pluginPath
      });

      this.emit('pluginLoaded', loadedPlugin);
    } catch (error) {
      logger.error(`Failed to load device plugin: ${deviceType}`, error);
    }
  }

  /**
   * 获取所有已加载的插件
   */
  getLoadedPlugins(): LoadedPlugin[] {
    return Array.from(this.loadedPlugins.values());
  }

  /**
   * 获取指定类型的插件
   */
  getPluginsByType(type: 'tenant' | 'device'): LoadedPlugin[] {
    return Array.from(this.loadedPlugins.values()).filter(p => p.type === type);
  }

  /**
   * 获取指定名称的插件
   */
  getPlugin(name: string): LoadedPlugin | undefined {
    return this.loadedPlugins.get(name);
  }

  /**
   * 重新加载插件
   */
  async reloadPlugin(name: string): Promise<void> {
    const plugin = this.loadedPlugins.get(name);
    if (!plugin) {
      throw new Error(`Plugin not found: ${name}`);
    }

    try {
      // 卸载插件
      await plugin.instance.shutdown();
      this.loadedPlugins.delete(name);

      // 重新加载
      if (plugin.type === 'tenant') {
        const tenantName = name.replace('-tenant', '');
        await this.loadTenantPlugin(tenantName);
      } else {
        const deviceType = name.replace('-device', '');
        await this.loadDevicePlugin(deviceType);
      }

      logger.info('Plugin reloaded', { name });
    } catch (error) {
      logger.error(`Failed to reload plugin: ${name}`, error);
      throw error;
    }
  }

  /**
   * 卸载所有插件
   */
  async unloadAllPlugins(): Promise<void> {
    const plugins = Array.from(this.loadedPlugins.values());
    
    for (const plugin of plugins) {
      try {
        await plugin.instance.shutdown();
        this.loadedPlugins.delete(plugin.name);
        logger.info('Plugin unloaded', { name: plugin.name });
      } catch (error) {
        logger.error(`Failed to unload plugin: ${plugin.name}`, error);
      }
    }
  }
}

export const pluginLoader = PluginLoader.getInstance();
