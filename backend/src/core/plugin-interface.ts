/**
 * 插件接口定义
 * 所有插件必须实现此接口
 */

import { Router } from 'express';
import { ConfigManager } from '@/config-center/config-manager';

export interface PluginConfig {
  name: string;
  version: string;
  description: string;
  author: string;
  dependencies?: string[];
  config?: Record<string, any>;
}

export interface PluginContext {
  app: any;
  configManager: ConfigManager;
  logger: any;
  prisma: any;
}

export interface PluginService {
  name: string;
  instance: any;
  methods: string[];
}

export interface PluginRoute {
  path: string;
  router: Router;
  middleware?: any[];
}

export interface IPlugin {
  /**
   * 插件配置
   */
  readonly config: PluginConfig;

  /**
   * 初始化插件
   */
  init(context: PluginContext): Promise<void>;

  /**
   * 注册路由
   */
  registerRoutes(): PluginRoute[];

  /**
   * 注册服务
   */
  registerServices(): PluginService[];

  /**
   * 配置更新回调
   */
  onConfigUpdate(newConfig: any): Promise<void>;

  /**
   * 插件卸载
   */
  shutdown(): Promise<void>;
}

export interface TenantPlugin extends IPlugin {
  /**
   * 租户 ID
   */
  readonly tenantId: string;

  /**
   * 租户特定配置
   */
  getTenantConfig(): Promise<any>;
}

export interface DevicePlugin extends IPlugin {
  /**
   * 设备类型
   */
  readonly deviceType: string;

  /**
   * 检查设备是否匹配此插件
   * @param deviceInfo 设备信息
   * @returns 是否匹配此设备类型
   */
  matchesDevice(deviceInfo: any): boolean;

  /**
   * 提取设备特定能力
   * @param deviceInfo 设备信息
   * @returns 设备能力列表
   */
  extractDeviceCapabilities(deviceInfo: any): string[];

  /**
   * 生成设备特定配置
   * @param deviceInfo 设备信息
   * @param baseConfig 基础配置
   * @returns 设备特定配置
   */
  generateDeviceConfig(deviceInfo: any, baseConfig: any): any;

  /**
   * 设备模板定义
   */
  getDeviceTemplate(): Promise<any>;

  /**
   * 处理设备消息
   */
  processDeviceMessage(message: any): Promise<any>;

  /**
   * 处理设备命令
   */
  processDeviceCommand(command: any): Promise<any>;
}
