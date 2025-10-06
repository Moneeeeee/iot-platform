/**
 * 认证路由
 * 处理用户登录、注册、令牌刷新等认证相关功能
 */

import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { UserRole, Permission, Language } from '@/types';
import { config } from '@/config/config';

const router = Router();

/**
 * 用户注册
 * POST /api/auth/register
 */
router.post('/register', [
  body('username')
    .isLength({ min: 3, max: 50 })
    .withMessage('用户名长度必须在3-50个字符之间')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('用户名只能包含字母、数字和下划线'),
  body('email')
    .isEmail()
    .withMessage('请输入有效的邮箱地址')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('密码长度至少6个字符')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('密码必须包含至少一个小写字母、一个大写字母和一个数字'),
  body('role')
    .optional()
    .isIn(Object.values(UserRole))
    .withMessage('无效的用户角色'),
  body('language')
    .optional()
    .isIn(Object.values(Language))
    .withMessage('无效的语言设置'),
], async (req: Request, res: Response) => {
  try {
    // 验证请求数据
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: '请求数据验证失败',
        details: errors.array(),
        timestamp: new Date(),
      });
    }

    const { username, email, password, role = UserRole.VIEWER, language = Language.ZH_CN } = req.body;

    // 检查用户名是否已存在
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email },
        ],
      },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: '用户名或邮箱已存在',
        timestamp: new Date(),
      });
    }

    // 加密密码
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 根据角色设置权限
    const permissions = getPermissionsByRole(role);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        role,
        permissions,
        language,
        tenant: 'default', // 添加必需的tenant字段
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        permissions: true,
        language: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // 记录用户注册日志
    logger.info('User registered', { userId: user.id, action: 'USER_REGISTER' });

    res.status(201).json({
      success: true,
      data: user,
      message: '用户注册成功',
      timestamp: new Date(),
    });

  } catch (error) {
    logger.error('User registration error:', error);
    res.status(500).json({
      success: false,
      error: '用户注册失败',
      timestamp: new Date(),
    });
  }
});

/**
 * 用户登录
 * POST /api/auth/login
 */
router.post('/login', [
  body('username')
    .notEmpty()
    .withMessage('用户名不能为空'),
  body('password')
    .notEmpty()
    .withMessage('密码不能为空'),
], async (req: Request, res: Response) => {
  try {
    // 验证请求数据
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: '请求数据验证失败',
        details: errors.array(),
        timestamp: new Date(),
      });
    }

    const { username, password } = req.body;

    // 查找用户
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email: username },
        ],
        isActive: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: '用户名或密码错误',
        timestamp: new Date(),
      });
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: '用户名或密码错误',
        timestamp: new Date(),
      });
    }

    // 生成JWT令牌
    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        permissions: user.permissions,
      },
      config.jwt.secret,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      } as any
    );

    // 更新最后登录时间
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // 记录用户登录日志
    logger.info('User login', { userId: user.id, action: 'USER_LOGIN' });

    // 返回用户信息和令牌
    const { passwordHash, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      data: {
        user: userWithoutPassword,
        token,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      },
      message: '登录成功',
      timestamp: new Date(),
    });

  } catch (error) {
    logger.error('User login error:', error);
    res.status(500).json({
      success: false,
      error: '登录失败',
      timestamp: new Date(),
    });
  }
});

/**
 * 获取当前用户信息
 * GET /api/auth/me
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    // 从请求头获取令牌
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: '未提供认证令牌',
        timestamp: new Date(),
      });
    }

    const token = authHeader.substring(7);
    
    // 验证令牌
    const decoded = jwt.verify(token, config.jwt.secret) as any;
    
    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        permissions: true,
        language: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: '用户不存在或已被禁用',
        timestamp: new Date(),
      });
    }

    res.json({
      success: true,
      data: user,
      timestamp: new Date(),
    });

  } catch (error) {
    logger.error('Get current user error:', error);
    res.status(401).json({
      success: false,
      error: '令牌无效或已过期',
      timestamp: new Date(),
    });
  }
});

/**
 * 刷新令牌
 * POST /api/auth/refresh
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: '未提供认证令牌',
        timestamp: new Date(),
      });
    }

    const token = authHeader.substring(7);
    
    // 验证令牌（即使过期也要能解析）
    const decoded = jwt.verify(token, config.jwt.secret, { ignoreExpiration: true }) as any;
    
    // 获取用户信息
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        role: true,
        permissions: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: '用户不存在或已被禁用',
        timestamp: new Date(),
      });
    }

    // 生成新的令牌
    const newToken = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        permissions: user.permissions,
      },
      config.jwt.secret,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      } as any
    );

    res.json({
      success: true,
      data: {
        token: newToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      },
      message: '令牌刷新成功',
      timestamp: new Date(),
    });

  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(401).json({
      success: false,
      error: '令牌刷新失败',
      timestamp: new Date(),
    });
  }
});

/**
 * 用户登出
 * POST /api/auth/logout
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    // 记录登出日志
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, config.jwt.secret) as any;
        logger.info('User logout', { userId: decoded.userId, action: 'USER_LOGOUT' });
      } catch (error) {
        // 忽略令牌解析错误
      }
    }

    res.json({
      success: true,
      message: '登出成功',
      timestamp: new Date(),
    });

  } catch (error) {
    logger.error('User logout error:', error);
    res.status(500).json({
      success: false,
      error: '登出失败',
      timestamp: new Date(),
    });
  }
});

/**
 * 根据角色获取权限列表
 * @param role 用户角色
 * @returns 权限列表
 */
function getPermissionsByRole(role: UserRole): Permission[] {
  const rolePermissions: Record<UserRole, Permission[]> = {
    [UserRole.ADMIN]: [
      Permission.USER_CREATE,
      Permission.USER_READ,
      Permission.USER_UPDATE,
      Permission.USER_DELETE,
      Permission.DEVICE_CREATE,
      Permission.DEVICE_READ,
      Permission.DEVICE_UPDATE,
      Permission.DEVICE_DELETE,
      Permission.DEVICE_CONTROL,
      Permission.SYSTEM_CONFIG,
      Permission.SYSTEM_LOGS,
      Permission.SYSTEM_MONITOR,
    ],
    [UserRole.OPERATOR]: [
      Permission.USER_READ,
      Permission.DEVICE_CREATE,
      Permission.DEVICE_READ,
      Permission.DEVICE_UPDATE,
      Permission.DEVICE_CONTROL,
      Permission.SYSTEM_LOGS,
      Permission.SYSTEM_MONITOR,
    ],
    [UserRole.VIEWER]: [
      Permission.USER_READ,
      Permission.DEVICE_READ,
      Permission.SYSTEM_MONITOR,
    ],
  };

  return rolePermissions[role] || [];
}

export default router;
