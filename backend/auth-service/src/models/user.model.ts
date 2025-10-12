import { Pool } from 'pg';
import { User, UserCreateInput, UserResponse } from '../types/user';
import { getSchemaName } from '../utils/schema';

export class UserModel {
  constructor(private db: Pool) {}

  /**
   * 根据 schema 创建用户表（如果不存在）
   */
  async ensureTable(schema: string = 'tenant_001'): Promise<void> {
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS ${schema}.users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'viewer',
        tenant_id VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_users_email ON ${schema}.users(email);
      CREATE INDEX IF NOT EXISTS idx_users_tenant ON ${schema}.users(tenant_id);
    `);
  }

  /**
   * 创建用户
   */
  async create(input: UserCreateInput, passwordHash: string): Promise<User> {
    const schema = getSchemaName(input.tenant_id);
    await this.ensureTable(schema);

    const result = await this.db.query<User>(
      `INSERT INTO ${schema}.users (email, password_hash, role, tenant_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, password_hash, role, tenant_id, created_at, updated_at`,
      [input.email, passwordHash, input.role, input.tenant_id]
    );

    return result.rows[0];
  }

  /**
   * 根据邮箱查找用户
   */
  async findByEmail(email: string, tenantId: string): Promise<User | null> {
    const schema = getSchemaName(tenantId);

    try {
      const result = await this.db.query<User>(
        `SELECT id, email, password_hash, role, tenant_id, created_at, updated_at
         FROM ${schema}.users
         WHERE email = $1`,
        [email]
      );

      return result.rows[0] || null;
    } catch (error) {
      // Schema 不存在时返回 null
      return null;
    }
  }

  /**
   * 根据 ID 查找用户
   */
  async findById(id: string, tenantId: string): Promise<User | null> {
    const schema = getSchemaName(tenantId);

    try {
      const result = await this.db.query<User>(
        `SELECT id, email, password_hash, role, tenant_id, created_at, updated_at
         FROM ${schema}.users
         WHERE id = $1`,
        [id]
      );

      return result.rows[0] || null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 更新用户最后登录时间
   */
  async updateLastLogin(id: string, tenantId: string): Promise<void> {
    const schema = getSchemaName(tenantId);

    await this.db.query(
      `UPDATE ${schema}.users
       SET updated_at = NOW()
       WHERE id = $1`,
      [id]
    );
  }

  /**
   * 转换为响应格式（去除敏感信息）
   */
  toResponse(user: User): UserResponse {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      tenant_id: user.tenant_id,
      created_at: user.created_at,
    };
  }
}


