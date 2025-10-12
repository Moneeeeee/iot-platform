import { Pool } from 'pg';
import { DeviceToken, DeviceTokenCreateInput } from '../types/device-token';
import { getSchemaName } from '../utils/schema';

export class DeviceTokenModel {
  constructor(private db: Pool) {}

  /**
   * 确保设备 Token 表存在
   */
  async ensureTable(schema: string = 'tenant_001'): Promise<void> {
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS ${schema}.device_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        device_id VARCHAR(100) NOT NULL,
        tenant_id VARCHAR(100) NOT NULL,
        token_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(device_id, tenant_id)
      );

      CREATE INDEX IF NOT EXISTS idx_device_tokens_device ON ${schema}.device_tokens(device_id);
      CREATE INDEX IF NOT EXISTS idx_device_tokens_tenant ON ${schema}.device_tokens(tenant_id);
    `);
  }

  /**
   * 创建设备 Token
   */
  async create(
    input: DeviceTokenCreateInput,
    tokenHash: string,
    expiresAt: Date
  ): Promise<DeviceToken> {
    const schema = getSchemaName(input.tenant_id);
    await this.ensureTable(schema);

    const result = await this.db.query<DeviceToken>(
      `INSERT INTO ${schema}.device_tokens (device_id, tenant_id, token_hash, expires_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (device_id, tenant_id) 
       DO UPDATE SET token_hash = $3, expires_at = $4, created_at = NOW()
       RETURNING id, device_id, tenant_id, token_hash, expires_at, created_at`,
      [input.device_id, input.tenant_id, tokenHash, expiresAt]
    );

    return result.rows[0];
  }

  /**
   * 根据设备 ID 查找 Token
   */
  async findByDevice(deviceId: string, tenantId: string): Promise<DeviceToken | null> {
    const schema = getSchemaName(tenantId);

    try{
      const result = await this.db.query<DeviceToken>(
        `SELECT id, device_id, tenant_id, token_hash, expires_at, created_at
         FROM ${schema}.device_tokens
         WHERE device_id = $1 AND tenant_id = $2`,
        [deviceId, tenantId]
      );

      return result.rows[0] || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 撤销设备 Token
   */
  async revoke(deviceId: string, tenantId: string): Promise<boolean> {
    const schema = getSchemaName(tenantId);

    try {
      const result = await this.db.query(
        `DELETE FROM ${schema}.device_tokens
         WHERE device_id = $1 AND tenant_id = $2`,
        [deviceId, tenantId]
      );

      return (result.rowCount || 0) > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * 列出租户的所有设备 Tokens
   */
  async listByTenant(tenantId: string): Promise<DeviceToken[]> {
    const schema = getSchemaName(tenantId);

    try {
      const result = await this.db.query<DeviceToken>(
        `SELECT id, device_id, tenant_id, token_hash, expires_at, created_at
         FROM ${schema}.device_tokens
         WHERE tenant_id = $1
         ORDER BY created_at DESC`,
        [tenantId]
      );

      return result.rows;
    } catch (error) {
      return [];
    }
  }

  /**
   * 检查 Token 是否过期
   */
  isExpired(token: DeviceToken): boolean {
    return new Date() > new Date(token.expires_at);
  }
}


