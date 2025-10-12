import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { JWTPayload } from '../types/user';

export const generateToken = (
  payload: Omit<JWTPayload, 'type'>,
  expiresIn?: string
): string => {
  const tokenPayload: JWTPayload = {
    ...payload,
    type: 'access',
  };

  return jwt.sign(tokenPayload, config.jwt.secret, {
    expiresIn: expiresIn || config.jwt.expiresIn,
    issuer: 'auth-service',
    audience: 'iot-platform',
  } as jwt.SignOptions);
};

export const generateRefreshToken = (
  payload: Omit<JWTPayload, 'type'>
): string => {
  const tokenPayload: JWTPayload = {
    ...payload,
    type: 'refresh',
  };

  return jwt.sign(tokenPayload, config.jwt.secret, {
    expiresIn: config.jwt.refreshExpiresIn,
    issuer: 'auth-service',
    audience: 'iot-platform',
  } as jwt.SignOptions);
};

export const verifyToken = async (token: string): Promise<JWTPayload> => {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      config.jwt.secret,
      {
        issuer: 'auth-service',
        audience: 'iot-platform',
      },
      (err, decoded) => {
        if (err) {
          reject(new Error('Invalid or expired token'));
        } else {
          resolve(decoded as JWTPayload);
        }
      }
    );
  });
};

export const refreshToken = async (oldToken: string): Promise<{
  token: string;
  refreshToken: string;
}> => {
  try {
    const decoded = await verifyToken(oldToken);

    if (decoded.type !== 'refresh') {
      throw new Error('Invalid refresh token');
    }

    // 生成新的 token
    const { type, ...payload } = decoded;
    const newToken = generateToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    return {
      token: newToken,
      refreshToken: newRefreshToken,
    };
  } catch (error) {
    throw new Error('Unable to refresh token');
  }
};

export const extractToken = (authHeader?: string): string | null => {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
};


