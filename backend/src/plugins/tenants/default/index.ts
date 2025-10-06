/**
 * 默认租户插件
 * 提供基础的租户功能
 */

import { Router, Request, Response } from 'express';
import { BaseTenantPlugin } from '../../../core/tenant-plugin';
import { PluginConfig, PluginContext, PluginRoute, PluginService } from '../../../core/plugin-interface';

const pluginConfig: PluginConfig = {
  name: "default-tenant-plugin",
  version: "1.0.0",
  description: "默认租户插件，提供基础功能",
  author: "IoT Platform Team",
  dependencies: [],
  config: {
    features: {
      basicAnalytics: true,
      deviceManagement: true,
      userManagement: true,
      basicReports: true
    },
    limits: {
      maxDevices: 100,
      maxUsers: 10,
      maxTemplates: 5
    }
  }
};

class DefaultTenantService {
  private context: PluginContext;
  
  constructor(context: PluginContext) {
    this.context = context;
  }

  async getTenantStats(tenantId: string) {
    this.context.logger.info(`Getting tenant stats for: ${tenantId}`);
    
    const deviceCount = await this.context.prisma.device.count({
      where: { tenantId }
    });
    
    const userCount = await this.context.prisma.user.count({
      where: { tenantId }
    });
    
    return {
      tenantId,
      deviceCount,
      userCount,
      lastActivity: new Date()
    };
  }
}

export class DefaultTenantPlugin extends BaseTenantPlugin {
  constructor(tenantId: string) {
    super(tenantId, pluginConfig);
  }

  async init(context: PluginContext): Promise<void> {
    await super.init(context);
    this.context.logger.info(`DefaultTenantPlugin for ${this.tenantId} initialized`);
  }

  registerRoutes(): PluginRoute[] {
    const router = Router();
    
    // 基础统计API
    router.get('/stats', async (req: Request, res: Response) => {
      try {
        const statsService = this.context.container.resolve<DefaultTenantService>('DefaultTenantService');
        const stats = await statsService.getTenantStats(this.tenantId);
        
        res.json({
          success: true,
          data: stats
        });
      } catch (error) {
        this.context.logger.error('Failed to get tenant stats:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get tenant stats'
        });
      }
    });

    // 基础设备管理API
    router.get('/devices', async (req: Request, res: Response) => {
      try {
        const devices = await this.context.prisma.device.findMany({
          where: { tenantId: this.tenantId },
          select: {
            id: true,
            name: true,
            type: true,
            status: true,
            lastSeen: true
          }
        });
        
        res.json({
          success: true,
          data: devices
        });
      } catch (error) {
        this.context.logger.error('Failed to get devices:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to get devices'
        });
      }
    });

    return [{
      path: `/api/tenants/${this.tenantId}/default`,
      router: router,
      middleware: []
    }];
  }

  registerServices(): PluginService[] {
    return [{
      name: 'DefaultTenantService',
      instance: new DefaultTenantService(this.context),
      methods: ['getTenantStats']
    }];
  }

  async onConfigUpdate(newConfig: any): Promise<void> {
    await super.onConfigUpdate(newConfig);
    this.context.logger.info(`DefaultTenantPlugin for ${this.tenantId} config updated:`, newConfig);
  }

  async shutdown(): Promise<void> {
    await super.shutdown();
    this.context.logger.info(`DefaultTenantPlugin for ${this.tenantId} shutting down`);
  }
}

export default DefaultTenantPlugin;
