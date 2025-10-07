/**
 * 动态凭证与 ACL 校验
 * 支持设备动态凭证生成、MQTT ACL 管理
 */

import crypto from 'crypto';
import { prisma } from '@/common/config/database';
import { logger } from '@/common/logger';

export interface DeviceCredentials {
  username: string;
  password: string;
  expiresAt: Date;
  acl: ACLRule[];
}

export interface ACLRule {
  type: 'publish' | 'subscribe';
  topic: string;
  qos?: number;
}

export interface MQTTACL {
  publish: string[];
  subscribe: string[];
  qos_retain_policy: Record<string, { qos: number; retain: boolean }>;
}

export class CredentialsService {
  private static instance: CredentialsService;

  static getInstance(): CredentialsService {
    if (!CredentialsService.instance) {
      CredentialsService.instance = new CredentialsService();
    }
    return CredentialsService.instance;
  }

  /**
   * 生成设备动态凭证
   */
  async generateDeviceCredentials(
    tenantId: string, 
    deviceId: string, 
    deviceType: string,
    ttlHours: number = 24
  ): Promise<DeviceCredentials> {
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);
    const username = `iot_${tenantId}_${deviceType}_${deviceId}`;
    
    // 生成密码
    const secretKey = process.env.MQTT_SECRET_KEY || 'default-secret-key';
    const password = crypto
      .createHmac('sha256', secretKey)
      .update(`${username}_${expiresAt.getTime()}_${deviceType}`)
      .digest('base64')
      .substring(0, 32);

    // 生成 ACL 规则
    const acl = this.generateACLRules(tenantId, deviceType, deviceId);

    // 存储凭证到数据库
    await prisma.deviceCredentials.create({
      data: {
        deviceId,
        username,
        password,
        expiresAt,
        acl: acl as any
      }
    });

    logger.info('Generated device credentials', {
      deviceId,
      tenantId,
      deviceType,
      expiresAt
    });

    return {
      username,
      password,
      expiresAt,
      acl
    };
  }

  /**
   * 生成 ACL 规则
   */
  private generateACLRules(tenantId: string, deviceType: string, deviceId: string): ACLRule[] {
    const topicPrefix = `iot/${tenantId}/${deviceType}/${deviceId}`;
    
    return [
      // 发布权限
      { type: 'publish', topic: `${topicPrefix}/telemetry` },
      { type: 'publish', topic: `${topicPrefix}/status` },
      { type: 'publish', topic: `${topicPrefix}/event` },
      { type: 'publish', topic: `${topicPrefix}/cmdres` },
      { type: 'publish', topic: `${topicPrefix}/shadow/reported` },
      { type: 'publish', topic: `${topicPrefix}/ota/progress` },
      
      // 订阅权限
      { type: 'subscribe', topic: `${topicPrefix}/cmd` },
      { type: 'subscribe', topic: `${topicPrefix}/shadow/desired` },
      { type: 'subscribe', topic: `${topicPrefix}/cfg` }
    ];
  }

  /**
   * 验证设备凭证
   */
  async validateDeviceCredentials(username: string, password: string): Promise<{
    valid: boolean;
    deviceId?: string;
    tenantId?: string;
    deviceType?: string;
  }> {
    try {
      const credentials = await prisma.deviceCredentials.findFirst({
        where: {
          username,
          password,
          expiresAt: { gt: new Date() }
        },
        include: {
          device: {
            include: { tenant: true, template: true }
          }
        }
      });

      if (!credentials) {
        return { valid: false };
      }

      return {
        valid: true,
        deviceId: credentials.deviceId,
        tenantId: credentials.device.tenantId,
        deviceType: credentials.device.template.type
      };
    } catch (error) {
      logger.error('Failed to validate device credentials', error);
      return { valid: false };
    }
  }

  /**
   * 获取 MQTT ACL 配置
   */
  async getMQTTACL(tenantId: string, deviceType: string): Promise<MQTTACL> {
    const topicPrefix = `iot/${tenantId}/${deviceType}`;
    
    return {
      publish: [
        `${topicPrefix}/+/telemetry`,
        `${topicPrefix}/+/status`,
        `${topicPrefix}/+/event`,
        `${topicPrefix}/+/cmdres`,
        `${topicPrefix}/+/shadow/reported`,
        `${topicPrefix}/+/ota/progress`
      ],
      subscribe: [
        `${topicPrefix}/+/cmd`,
        `${topicPrefix}/+/shadow/desired`,
        `${topicPrefix}/+/cfg`
      ],
      qos_retain_policy: {
        [`${topicPrefix}/+/telemetry`]: { qos: 1, retain: false },
        [`${topicPrefix}/+/status`]: { qos: 1, retain: true },
        [`${topicPrefix}/+/event`]: { qos: 1, retain: false },
        [`${topicPrefix}/+/cmd`]: { qos: 1, retain: false },
        [`${topicPrefix}/+/cmdres`]: { qos: 1, retain: false },
        [`${topicPrefix}/+/shadow/desired`]: { qos: 1, retain: true },
        [`${topicPrefix}/+/shadow/reported`]: { qos: 1, retain: true },
        [`${topicPrefix}/+/cfg`]: { qos: 1, retain: true },
        [`${topicPrefix}/+/ota/progress`]: { qos: 1, retain: false }
      }
    };
  }

  /**
   * 清理过期凭证
   */
  async cleanupExpiredCredentials(): Promise<number> {
    const result = await prisma.deviceCredentials.deleteMany({
      where: {
        expiresAt: { lt: new Date() }
      }
    });

    logger.info('Cleaned up expired credentials', { count: result.count });
    return result.count;
  }
}

export const credentialsService = CredentialsService.getInstance();
