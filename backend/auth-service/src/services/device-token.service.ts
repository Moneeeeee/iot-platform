import { Pool } from 'pg';
import Redis from 'ioredis';
import { DeviceTokenModel } from '../models/device-token.model';
import {
  DeviceToken,
  DeviceTokenCreateInput,
  DeviceTokenResponse,
  DeviceTokenVerifyInput,
  DeviceTokenVerifyResponse,
} from '../types/device-token';
import {
  generateDeviceToken,
  hashDeviceToken,
  compareDeviceToken,
  validateTokenFormat,
  parseExpiresIn,
} from '../utils/device-token';

export class DeviceTokenService {
  private deviceTokenModel: DeviceTokenModel;

  constructor(
    private db: Pool,
    private redis: Redis
  ) {
    this.deviceTokenModel = new DeviceTokenModel(db);
  }

  /**
   * 生成设备 Token
   */
  async generateToken(input: DeviceTokenCreateInput): Promise<DeviceTokenResponse> {
    // 生成 Token
    const token = generateDeviceToken();

    // 哈希 Token
    const tokenHash = await hashDeviceToken(token);

    // 解析过期时间
    const expiresIn = input.expires_in || '365d';
    const expiresAt = parseExpiresIn(expiresIn);

    // 存储到数据库
    const deviceToken = await this.deviceTokenModel.create(input, tokenHash, expiresAt);

    // 缓存到 Redis（加速验证）
    await this.redis.setex(
      `device_token:${input.device_id}`,
      365 * 24 * 60 * 60, // 1 年
      JSON.stringify({
        tokenHash,
        tenantId: input.tenant_id,
        expiresAt: expiresAt.toISOString(),
      })
    );

    return {
      token,
      device_id: deviceToken.device_id,
      tenant_id: deviceToken.tenant_id,
      expires_at: deviceToken.expires_at,
    };
  }

  /**
   * 验证设备 Token
   */
  async verifyToken(input: DeviceTokenVerifyInput): Promise<DeviceTokenVerifyResponse> {
    // 验证 Token 格式
    if (!validateTokenFormat(input.token)) {
      return { valid: false };
    }

    // 先从 Redis 缓存获取
    const cached = await this.redis.get(`device_token:${input.device_id}`);
    let deviceToken: DeviceToken | null = null;
    let tenantId: string;

    if (cached) {
      const cachedData = JSON.parse(cached);
      tenantId = cachedData.tenantId;

      // 验证 Token
      const isValid = await compareDeviceToken(input.token, cachedData.tokenHash);
      if (!isValid) {
        return { valid: false };
      }

      // 检查过期
      if (new Date() > new Date(cachedData.expiresAt)) {
        return { valid: false };
      }

      return {
        valid: true,
        device_id: input.device_id,
        tenant_id: tenantId,
      };
    }

    // 缓存未命中，从数据库查询
    // 先尝试所有租户（这里简化处理，生产环境应该从设备注册信息中获取租户 ID）
    const result = await this.db.query<DeviceToken>(
      `SELECT dt.id, dt.device_id, dt.tenant_id, dt.token_hash, dt.expires_at, dt.created_at
       FROM platform.tenants t
       CROSS JOIN LATERAL (
         SELECT * FROM (
           SELECT 'tenant_' || t.slug AS schema_name
         ) s,
         LATERAL (
           SELECT * FROM jsonb_to_recordset($1::jsonb) AS x(id uuid, device_id varchar, tenant_id varchar, token_hash varchar, expires_at timestamp, created_at timestamp)
         ) dt
       ) dt
       WHERE dt.device_id = $2
       LIMIT 1`,
      [JSON.stringify([]), input.device_id]
    );

    // 简化实现：直接查询 tenant_001
    deviceToken = await this.deviceTokenModel.findByDevice(input.device_id, 'tenant_001');

    if (!deviceToken) {
      return { valid: false };
    }

    // 检查过期
    if (this.deviceTokenModel.isExpired(deviceToken)) {
      return { valid: false };
    }

    // 验证 Token
    const isValid = await compareDeviceToken(input.token, deviceToken.token_hash);
    if (!isValid) {
      return { valid: false };
    }

    return {
      valid: true,
      device_id: deviceToken.device_id,
      tenant_id: deviceToken.tenant_id,
    };
  }

  /**
   * 撤销设备 Token
   */
  async revokeToken(deviceId: string, tenantId: string): Promise<boolean> {
    // 从数据库删除
    const revoked = await this.deviceTokenModel.revoke(deviceId, tenantId);

    // 从 Redis 删除缓存
    await this.redis.del(`device_token:${deviceId}`);

    return revoked;
  }

  /**
   * 列出租户的所有设备 Tokens
   */
  async listTokens(tenantId: string): Promise<Array<{
    device_id: string;
    created_at: Date;
    expires_at: Date;
  }>> {
    const tokens = await this.deviceTokenModel.listByTenant(tenantId);

    return tokens.map((token) => ({
      device_id: token.device_id,
      created_at: token.created_at,
      expires_at: token.expires_at,
    }));
  }
}


