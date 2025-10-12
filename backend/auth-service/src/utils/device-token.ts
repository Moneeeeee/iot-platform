import crypto from 'crypto';
import bcrypt from 'bcrypt';

const TOKEN_PREFIX = 'dt_';
const TOKEN_LENGTH = 32;

/**
 * 生成设备 Token
 * @returns 设备 Token
 */
export const generateDeviceToken = (): string => {
  const randomBytes = crypto.randomBytes(TOKEN_LENGTH);
  const token = randomBytes.toString('hex');
  return `${TOKEN_PREFIX}${token}`;
};

/**
 * 哈希设备 Token
 * @param token 明文 Token
 * @returns 哈希后的 Token
 */
export const hashDeviceToken = async (token: string): Promise<string> => {
  return await bcrypt.hash(token, 10);
};

/**
 * 比较设备 Token
 * @param token 明文 Token
 * @param hash 哈希 Token
 * @returns 是否匹配
 */
export const compareDeviceToken = async (
  token: string,
  hash: string
): Promise<boolean> => {
  return await bcrypt.compare(token, hash);
};

/**
 * 验证 Token 格式
 * @param token Token
 * @returns 是否有效
 */
export const validateTokenFormat = (token: string): boolean => {
  return token.startsWith(TOKEN_PREFIX) && token.length === TOKEN_PREFIX.length + TOKEN_LENGTH * 2;
};

/**
 * 解析过期时间字符串
 * @param expiresIn 过期时间字符串（如 '365d', '30d', '24h'）
 * @returns 过期日期
 */
export const parseExpiresIn = (expiresIn: string): Date => {
  const regex = /^(\d+)([dhm])$/;
  const match = expiresIn.match(regex);

  if (!match) {
    throw new Error('Invalid expires_in format. Use format like "365d", "30d", or "24h"');
  }

  const value = parseInt(match[1]);
  const unit = match[2];

  const now = new Date();

  switch (unit) {
    case 'd': // days
      return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
    case 'h': // hours
      return new Date(now.getTime() + value * 60 * 60 * 1000);
    case 'm': // minutes
      return new Date(now.getTime() + value * 60 * 1000);
    default:
      throw new Error('Invalid time unit');
  }
};


