import { Pool } from 'pg';
import Redis from 'ioredis';
import { DeviceTokenService } from './device-token.service';
import { MQTTAuthRequest, MQTTAuthResponse, MQTTACLRequest, MQTTACLResponse } from '../types/device-token';

export class MQTTService {
  private deviceTokenService: DeviceTokenService;

  constructor(
    private db: Pool,
    private redis: Redis
  ) {
    this.deviceTokenService = new DeviceTokenService(db, redis);
  }

  /**
   * MQTT 认证
   * ClientID 格式: {tenant_id}:{device_id}
   * Username: {device_id}
   * Password: {device_token}
   */
  async authenticate(request: MQTTAuthRequest): Promise<MQTTAuthResponse> {
    try {
      // 解析 ClientID: tenant_001:esp32_001
      const clientIdParts = request.clientid.split(':');
      if (clientIdParts.length !== 2) {
        return {
          result: 'deny',
          reason: 'Invalid clientid format. Expected: tenant_id:device_id',
        };
      }

      const [tenantId, deviceId] = clientIdParts;

      // 验证 device_id 与 username 一致
      if (request.username !== deviceId) {
        return {
          result: 'deny',
          reason: 'Username must match device_id',
        };
      }

      // 验证设备 Token
      const verification = await this.deviceTokenService.verifyToken({
        device_id: deviceId,
        token: request.password,
      });

      if (!verification.valid) {
        return {
          result: 'deny',
          reason: 'Invalid or expired device token',
        };
      }

      // 验证租户匹配
      if (verification.tenant_id !== tenantId) {
        return {
          result: 'deny',
          reason: 'Tenant mismatch',
        };
      }

      // 更新设备在线状态到 Redis
      await this.redis.setex(
        `device:online:${tenantId}:${deviceId}`,
        300, // 5 分钟 TTL
        Date.now().toString()
      );

      return {
        result: 'allow',
        is_superuser: false,
      };
    } catch (error) {
      console.error('MQTT auth error:', error);
      return {
        result: 'deny',
        reason: 'Authentication failed',
      };
    }
  }

  /**
   * MQTT ACL 检查
   * 设备只能发布到自己的 Topic: iot/{tenant_id}/{device_id}/*
   * 设备只能订阅命令 Topic: iot/{tenant_id}/{device_id}/command
   */
  async checkACL(request: MQTTACLRequest): Promise<MQTTACLResponse> {
    try {
      // 解析 ClientID
      const clientIdParts = request.clientid.split(':');
      if (clientIdParts.length !== 2) {
        return { result: 'deny', reason: 'Invalid clientid format' };
      }

      const [tenantId, deviceId] = clientIdParts;

      // 解析 Topic: iot/{tenant_id}/{device_id}/{type}
      const topicParts = request.topic.split('/');
      if (topicParts.length < 4 || topicParts[0] !== 'iot') {
        return { result: 'deny', reason: 'Invalid topic format' };
      }

      const [, topicTenantId, topicDeviceId] = topicParts;

      // 检查租户匹配
      if (topicTenantId !== tenantId) {
        return { result: 'deny', reason: 'Tenant mismatch in topic' };
      }

      // 检查设备匹配
      if (topicDeviceId !== deviceId) {
        return { result: 'deny', reason: 'Device can only access its own topics' };
      }

      // 发布权限：允许发布到 iot/{tenant_id}/{device_id}/*
      if (request.action === 'publish') {
        const allowedTypes = ['telemetry', 'event', 'status'];
        const messageType = topicParts[3];

        if (allowedTypes.includes(messageType)) {
          return { result: 'allow' };
        }

        return { result: 'deny', reason: 'Invalid message type' };
      }

      // 订阅权限：只允许订阅命令 Topic
      if (request.action === 'subscribe') {
        const messageType = topicParts[3];

        if (messageType === 'command' || messageType === 'config') {
          return { result: 'allow' };
        }

        return { result: 'deny', reason: 'Device can only subscribe to command/config topics' };
      }

      return { result: 'deny', reason: 'Unknown action' };
    } catch (error) {
      console.error('MQTT ACL error:', error);
      return { result: 'deny', reason: 'ACL check failed' };
    }
  }
}


