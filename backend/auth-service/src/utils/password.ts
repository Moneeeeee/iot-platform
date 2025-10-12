import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/**
 * 哈希密码
 * @param password 明文密码
 * @returns 哈希后的密码
 */
export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * 比较密码
 * @param password 明文密码
 * @param hash 哈希密码
 * @returns 是否匹配
 */
export const comparePassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};

/**
 * 验证密码强度
 * @param password 密码
 * @returns 是否符合强度要求
 */
export const validatePasswordStrength = (password: string): {
  valid: boolean;
  message?: string;
} => {
  if (password.length < 8) {
    return {
      valid: false,
      message: 'Password must be at least 8 characters long',
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one lowercase letter',
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one uppercase letter',
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      message: 'Password must contain at least one number',
    };
  }

  return { valid: true };
};


