import { Pool } from 'pg';
import Redis from 'ioredis';
import { UserModel } from '../models/user.model';
import { User, UserCreateInput, UserLoginInput, AuthTokens, UserResponse } from '../types/user';
import { hashPassword, comparePassword, validatePasswordStrength } from '../utils/password';
import { generateToken, generateRefreshToken } from '../utils/jwt';

export class AuthService {
  private userModel: UserModel;

  constructor(
    private db: Pool,
    private redis: Redis
  ) {
    this.userModel = new UserModel(db);
  }

  /**
   * 用户注册
   */
  async register(input: UserCreateInput): Promise<UserResponse> {
    // 验证密码强度
    const passwordValidation = validatePasswordStrength(input.password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.message);
    }

    // 检查邮箱是否已存在
    const existingUser = await this.userModel.findByEmail(input.email, input.tenant_id);
    if (existingUser) {
      throw new Error('Email already exists');
    }

    // 哈希密码
    const passwordHash = await hashPassword(input.password);

    // 创建用户
    const user = await this.userModel.create(input, passwordHash);

    return this.userModel.toResponse(user);
  }

  /**
   * 用户登录
   */
  async login(input: UserLoginInput, tenantId: string): Promise<{
    user: UserResponse;
    tokens: AuthTokens;
  }> {
    // 查找用户
    const user = await this.userModel.findByEmail(input.email, tenantId);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // 验证密码
    const isPasswordValid = await comparePassword(input.password, user.password_hash);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // 生成 Tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id,
    };

    const token = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // 存储会话到 Redis
    await this.redis.setex(
      `session:${user.id}`,
      7 * 24 * 60 * 60, // 7 天
      JSON.stringify(tokenPayload)
    );

    // 更新最后登录时间
    await this.userModel.updateLastLogin(user.id, tenantId);

    return {
      user: this.userModel.toResponse(user),
      tokens: {
        token,
        refreshToken,
      },
    };
  }

  /**
   * 退出登录
   */
  async logout(userId: string): Promise<void> {
    await this.redis.del(`session:${userId}`);
  }

  /**
   * 获取用户信息
   */
  async getProfile(userId: string, tenantId: string): Promise<UserResponse> {
    const user = await this.userModel.findById(userId, tenantId);
    if (!user) {
      throw new Error('User not found');
    }

    return this.userModel.toResponse(user);
  }

  /**
   * 验证会话是否存在
   */
  async isSessionValid(userId: string): Promise<boolean> {
    const session = await this.redis.get(`session:${userId}`);
    return session !== null;
  }
}


