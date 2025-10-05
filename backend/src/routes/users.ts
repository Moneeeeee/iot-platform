/**
 * 用户管理路由
 * 处理用户的CRUD操作和权限管理
 */

import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { UserRole, Permission, Language } from '@/types';
import { requirePermission, requireRole } from '@/middleware/auth';

const router = Router();

/**
 * 获取用户列表
 * GET /api/users
 */
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
  query('search').optional().isString().withMessage('搜索关键词必须是字符串'),
  query('role').optional().isIn(Object.values(UserRole)).withMessage('无效的用户角色'),
], async (req: Request, res: Response) => {
  try {
    // 验证请求参数
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: '请求参数验证失败',
        details: errors.array(),
        timestamp: new Date(),
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string;
    const role = req.query.role as UserRole;
    const skip = (page - 1) * limit;

    // 构建查询条件
    const where: any = {};
    
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (role) {
      where.role = role;
    }

    // 查询用户列表
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
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
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    // 记录查询日志
    logger.userAction(req.user!.id, 'USER_LIST_QUERY', 'USER');

    res.json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      timestamp: new Date(),
    });

  } catch (error) {
    logger.error('Get users list error:', error);
    res.status(500).json({
      success: false,
      error: '获取用户列表失败',
      timestamp: new Date(),
    });
  }
});

/**
 * 获取用户详情
 * GET /api/users/:id
 */
router.get('/:id', [
  param('id').isString().withMessage('用户ID必须是字符串'),
], async (req: Request, res: Response) => {
  try {
    // 验证请求参数
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: '请求参数验证失败',
        details: errors.array(),
        timestamp: new Date(),
      });
    }

    const { id } = req.params;

    // 查询用户详情
    const user = await prisma.user.findUnique({
      where: { id },
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

    if (!user) {
      return res.status(404).json({
        success: false,
        error: '用户不存在',
        timestamp: new Date(),
      });
    }

    // 记录查询日志
    logger.userAction(req.user!.id, 'USER_DETAIL_QUERY', 'USER', id);

    res.json({
      success: true,
      data: user,
      timestamp: new Date(),
    });

  } catch (error) {
    logger.error('Get user detail error:', error);
    res.status(500).json({
      success: false,
      error: '获取用户详情失败',
      timestamp: new Date(),
    });
  }
});

/**
 * 创建用户
 * POST /api/users
 */
router.post('/', [
  requirePermission(Permission.USER_CREATE),
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
    .withMessage('密码长度至少6个字符'),
  body('role')
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

    const { username, email, password, role, language = Language.ZH_CN } = req.body;

    // 检查用户名和邮箱是否已存在
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

    // 根据角色设置权限
    const permissions = getPermissionsByRole(role);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash: password, // 在实际应用中应该加密密码
        role,
        permissions,
        language,
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

    // 记录创建日志
    logger.userAction(req.user!.id, 'USER_CREATE', 'USER', user.id);

    res.status(201).json({
      success: true,
      data: user,
      message: '用户创建成功',
      timestamp: new Date(),
    });

  } catch (error) {
    logger.error('Create user error:', error);
    res.status(500).json({
      success: false,
      error: '创建用户失败',
      timestamp: new Date(),
    });
  }
});

/**
 * 更新用户
 * PUT /api/users/:id
 */
router.put('/:id', [
  requirePermission(Permission.USER_UPDATE),
  param('id').isString().withMessage('用户ID必须是字符串'),
  body('username')
    .optional()
    .isLength({ min: 3, max: 50 })
    .withMessage('用户名长度必须在3-50个字符之间'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('请输入有效的邮箱地址')
    .normalizeEmail(),
  body('role')
    .optional()
    .isIn(Object.values(UserRole))
    .withMessage('无效的用户角色'),
  body('language')
    .optional()
    .isIn(Object.values(Language))
    .withMessage('无效的语言设置'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('激活状态必须是布尔值'),
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

    const { id } = req.params;
    const updateData: any = {};

    // 检查用户是否存在
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: '用户不存在',
        timestamp: new Date(),
      });
    }

    // 构建更新数据
    if (req.body.username) updateData.username = req.body.username;
    if (req.body.email) updateData.email = req.body.email;
    if (req.body.role) {
      updateData.role = req.body.role;
      updateData.permissions = getPermissionsByRole(req.body.role);
    }
    if (req.body.language) updateData.language = req.body.language;
    if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;

    // 检查用户名和邮箱是否与其他用户冲突
    if (updateData.username || updateData.email) {
      const conflictUser = await prisma.user.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                updateData.username ? { username: updateData.username } : {},
                updateData.email ? { email: updateData.email } : {},
              ].filter(condition => Object.keys(condition).length > 0),
            },
          ],
        },
      });

      if (conflictUser) {
        return res.status(409).json({
          success: false,
          error: '用户名或邮箱已被其他用户使用',
          timestamp: new Date(),
        });
      }
    }

    // 更新用户
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
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

    // 记录更新日志
    logger.userAction(req.user!.id, 'USER_UPDATE', 'USER', id);

    res.json({
      success: true,
      data: user,
      message: '用户更新成功',
      timestamp: new Date(),
    });

  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: '更新用户失败',
      timestamp: new Date(),
    });
  }
});

/**
 * 删除用户
 * DELETE /api/users/:id
 */
router.delete('/:id', [
  requirePermission(Permission.USER_DELETE),
  param('id').isString().withMessage('用户ID必须是字符串'),
], async (req: Request, res: Response) => {
  try {
    // 验证请求参数
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: '请求参数验证失败',
        details: errors.array(),
        timestamp: new Date(),
      });
    }

    const { id } = req.params;

    // 检查用户是否存在
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: '用户不存在',
        timestamp: new Date(),
      });
    }

    // 不能删除自己
    if (id === req.user!.id) {
      return res.status(400).json({
        success: false,
        error: '不能删除自己的账户',
        timestamp: new Date(),
      });
    }

    // 删除用户
    await prisma.user.delete({
      where: { id },
    });

    // 记录删除日志
    logger.userAction(req.user!.id, 'USER_DELETE', 'USER', id);

    res.json({
      success: true,
      message: '用户删除成功',
      timestamp: new Date(),
    });

  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: '删除用户失败',
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
