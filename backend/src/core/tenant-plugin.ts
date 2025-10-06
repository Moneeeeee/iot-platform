/**
 * 租户插件基类
 * 提供租户定制化功能的基类实现
 */

import { Router } from 'express';
import { TenantPlugin, PluginConfig, PluginContext, PluginRoute, PluginService } from './plugin-interface';
import { logger } from '../common/logger';

export abstract class BaseTenantPlugin implements TenantPlugin {
  readonly tenantId: string;
  readonly config: PluginConfig;
  protected context: PluginContext;

  constructor(tenantId: string, config: PluginConfig) {
    this.tenantId = tenantId;
    this.config = config;
  }

  /**
   * 初始化插件
   */
  async init(context: PluginContext): Promise<void> {
    this.context = context;
    logger.info('Tenant plugin initialized', {
      tenantId: this.tenantId,
      plugin: this.config.name
    });
  }

  /**
   * 注册路由 - 子类需要实现
   */
  abstract registerRoutes(): PluginRoute[];

  /**
   * 注册服务 - 子类需要实现
   */
  abstract registerServices(): PluginService[];

  /**
   * 配置更新回调
   */
  async onConfigUpdate(newConfig: any): Promise<void> {
    logger.info('Tenant plugin config updated', {
      tenantId: this.tenantId,
      plugin: this.config.name
    });
  }

  /**
   * 插件卸载
   */
  async shutdown(): Promise<void> {
    logger.info('Tenant plugin shutdown', {
      tenantId: this.tenantId,
      plugin: this.config.name
    });
  }

  /**
   * 获取租户特定配置
   */
  async getTenantConfig(): Promise<any> {
    return await this.context.configManager.getTenantConfig(this.tenantId);
  }

  /**
   * 创建租户特定的路由前缀
   */
  protected getRoutePrefix(): string {
    return `/api/tenants/${this.tenantId}`;
  }

  /**
   * 创建租户特定的中间件
   */
  protected createTenantMiddleware() {
    return (req: any, res: any, next: any) => {
      // 确保请求来自正确的租户
      const auth = req.auth;
      if (!auth || auth.tenantId !== this.tenantId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied for this tenant'
        });
      }
      next();
    };
  }

  /**
   * 记录租户特定的日志
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const logData = {
      tenantId: this.tenantId,
      plugin: this.config.name,
      ...data
    };

    switch (level) {
      case 'info':
        logger.info(message, logData);
        break;
      case 'warn':
        logger.warn(message, logData);
        break;
      case 'error':
        logger.error(message, logData);
        break;
    }
  }

  /**
   * 获取租户数据库实例
   */
  protected getTenantDB() {
    // 返回带有租户过滤的 Prisma 实例
    return this.context.prisma;
  }

  /**
   * 验证租户权限
   */
  protected async validateTenantPermission(permission: string): Promise<boolean> {
    try {
      const tenantConfig = await this.getTenantConfig();
      const permissions = tenantConfig.permissions || [];
      return permissions.includes(permission) || permissions.includes('*');
    } catch (error) {
      this.log('error', 'Failed to validate tenant permission', { permission, error });
      return false;
    }
  }

  /**
   * 发送租户通知
   */
  protected async sendTenantNotification(
    type: 'email' | 'sms' | 'webhook',
    message: string,
    data?: any
  ): Promise<void> {
    try {
      const tenantConfig = await this.getTenantConfig();
      const notifications = tenantConfig.notifications || {};
      
      if (!notifications.enabled) {
        return;
      }

      // 这里可以集成具体的通知服务
      this.log('info', 'Tenant notification sent', { type, message, data });
    } catch (error) {
      this.log('error', 'Failed to send tenant notification', { type, error });
    }
  }

  /**
   * 获取租户统计信息
   */
  protected async getTenantStats(): Promise<any> {
    try {
      const stats = await this.getTenantDB().device.count({
        where: { tenantId: this.tenantId }
      });

      return {
        deviceCount: stats,
        tenantId: this.tenantId,
        timestamp: new Date()
      };
    } catch (error) {
      this.log('error', 'Failed to get tenant stats', { error });
      return null;
    }
  }
}
