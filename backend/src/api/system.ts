/**
 * 系统管理路由
 * 处理系统配置、日志查询、监控数据等系统级功能
 */

import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { prisma } from '../common/config/database';
import { logger } from '../common/logger';
import { Permission, LogLevel } from '../common/types';
import { requirePermission, requireAdmin } from '../core/middleware/auth';

const router = Router();

/**
 * 获取系统配置
 * GET /api/system/config
 */
router.get('/config', [
  requirePermission(Permission.SYSTEM_CONFIG),
], async (req: Request, res: Response) => {
  try {
    // 查询系统配置
    const configs = await prisma.systemConfig.findMany({
      orderBy: { key: 'asc' },
    });

    // 将配置转换为对象格式
    const configObject = configs.reduce((acc, config) => {
      acc[config.key] = config.value;
      return acc;
    }, {} as Record<string, any>);

    // 记录查询日志
    logger.userAction(req.user!.id, 'SYSTEM_CONFIG_QUERY', 'SYSTEM');

    res.json({
      success: true,
      data: configObject,
      timestamp: new Date(),
    });

  } catch (error) {
    logger.error('Get system config error:', error);
    res.status(500).json({
      success: false,
      error: '获取系统配置失败',
      timestamp: new Date(),
    });
  }
});

/**
 * 更新系统配置
 * PUT /api/system/config
 */
router.put('/config', [
  requireAdmin,
  body('config')
    .isObject()
    .withMessage('配置必须是对象'),
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

    const { config } = req.body;

    // 使用事务更新配置
    const updatedConfigs = await prisma.$transaction(
      Object.entries(config).map(([key, value]) =>
        prisma.systemConfig.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        })
      )
    );

    // 记录更新日志
    logger.userAction(req.user!.id, 'SYSTEM_CONFIG_UPDATE', 'SYSTEM', undefined, {
      updatedKeys: Object.keys(config),
    });

    res.json({
      success: true,
      data: updatedConfigs,
      message: '系统配置更新成功',
      timestamp: new Date(),
    });

  } catch (error) {
    logger.error('Update system config error:', error);
    res.status(500).json({
      success: false,
      error: '更新系统配置失败',
      timestamp: new Date(),
    });
  }
});

/**
 * 获取系统日志
 * GET /api/system/logs
 */
router.get('/logs', [
  requirePermission(Permission.SYSTEM_LOGS),
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('每页数量必须在1-1000之间'),
  query('level').optional().isIn(Object.values(LogLevel)).withMessage('无效的日志级别'),
  query('startTime').optional().isISO8601().withMessage('开始时间必须是有效的ISO8601格式'),
  query('endTime').optional().isISO8601().withMessage('结束时间必须是有效的ISO8601格式'),
  query('userId').optional().isString().withMessage('用户ID必须是字符串'),
  query('deviceId').optional().isString().withMessage('设备ID必须是字符串'),
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
    const limit = parseInt(req.query.limit as string) || 100;
    const level = req.query.level as LogLevel;
    const startTime = req.query.startTime ? new Date(req.query.startTime as string) : undefined;
    const endTime = req.query.endTime ? new Date(req.query.endTime as string) : undefined;
    const userId = req.query.userId as string;
    const deviceId = req.query.deviceId as string;
    const skip = (page - 1) * limit;

    // 构建查询条件
    const where: any = {};
    
    if (level) {
      where.level = level;
    }
    
    if (startTime || endTime) {
      where.timestamp = {};
      if (startTime) where.timestamp.gte = startTime;
      if (endTime) where.timestamp.lte = endTime;
    }
    
    if (userId) {
      where.userId = userId;
    }
    
    if (deviceId) {
      where.deviceId = deviceId;
    }

    // 查询日志
    const [logs, total] = await Promise.all([
      prisma.log.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
          device: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
      }),
      prisma.log.count({ where }),
    ]);

    // 记录查询日志
    logger.userAction(req.user!.id, 'SYSTEM_LOGS_QUERY', 'SYSTEM');

    res.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      timestamp: new Date(),
    });

  } catch (error) {
    logger.error('Get system logs error:', error);
    res.status(500).json({
      success: false,
      error: '获取系统日志失败',
      timestamp: new Date(),
    });
  }
});

/**
 * 获取系统监控数据
 * GET /api/system/monitor
 */
router.get('/monitor', [
  requirePermission(Permission.SYSTEM_MONITOR),
], async (req: Request, res: Response) => {
  try {
    // 获取系统统计信息
    const [
      totalUsers,
      totalDevices,
      onlineDevices,
      totalAlerts,
      activeAlerts,
      recentLogs,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.device.count(),
      prisma.device.count({ where: { status: 'ONLINE' } }),
      prisma.alert.count(),
      prisma.alert.count({ where: { status: 'ACTIVE' } }),
      prisma.log.count({
        where: {
          timestamp: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // 最近24小时
          },
        },
      }),
    ]);

    // 获取设备类型分布
    const deviceTypeStats = await prisma.device.groupBy({
      by: ['type'],
      _count: {
        type: true,
      },
    });

    // 获取设备状态分布
    const deviceStatusStats = await prisma.device.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
    });

    // 获取告警级别分布
    const alertLevelStats = await prisma.alert.groupBy({
      by: ['level'],
      _count: {
        level: true,
      },
      where: {
        status: 'ACTIVE',
      },
    });

    // 获取最近的活动日志
    const recentActivities = await prisma.log.findMany({
      where: {
        level: {
          in: ['INFO', 'WARN', 'ERROR'],
        },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
        device: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 10,
    });

    const monitorData = {
      overview: {
        totalUsers,
        totalDevices,
        onlineDevices,
        totalAlerts,
        activeAlerts,
        recentLogs,
      },
      deviceTypeStats: deviceTypeStats.map(stat => ({
        type: stat.type,
        count: stat._count.type,
      })),
      deviceStatusStats: deviceStatusStats.map(stat => ({
        status: stat.status,
        count: stat._count.status,
      })),
      alertLevelStats: alertLevelStats.map(stat => ({
        level: stat.level,
        count: stat._count.level,
      })),
      recentActivities,
    };

    // 记录查询日志
    logger.userAction(req.user!.id, 'SYSTEM_MONITOR_QUERY', 'SYSTEM');

    res.json({
      success: true,
      data: monitorData,
      timestamp: new Date(),
    });

  } catch (error) {
    logger.error('Get system monitor error:', error);
    res.status(500).json({
      success: false,
      error: '获取系统监控数据失败',
      timestamp: new Date(),
    });
  }
});

/**
 * 获取系统统计信息
 * GET /api/system/stats
 */
router.get('/stats', [
  requirePermission(Permission.SYSTEM_MONITOR),
  query('days').optional().isInt({ min: 1, max: 365 }).withMessage('天数必须在1-365之间'),
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

    const days = parseInt(req.query.days as string) || 7;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // 获取历史统计数据
    const stats = await prisma.systemStats.findMany({
      where: {
        date: {
          gte: startDate,
        },
      },
      orderBy: { date: 'asc' },
    });

    // 记录查询日志
    logger.userAction(req.user!.id, 'SYSTEM_STATS_QUERY', 'SYSTEM');

    res.json({
      success: true,
      data: stats,
      timestamp: new Date(),
    });

  } catch (error) {
    logger.error('Get system stats error:', error);
    res.status(500).json({
      success: false,
      error: '获取系统统计信息失败',
      timestamp: new Date(),
    });
  }
});

/**
 * 清理系统数据
 * POST /api/system/cleanup
 */
router.post('/cleanup', [
  requireAdmin,
  body('dataType')
    .isIn(['logs', 'deviceData', 'alerts', 'all'])
    .withMessage('数据类型必须是 logs、deviceData、alerts 或 all'),
  body('olderThanDays')
    .optional()
    .isInt({ min: 1 })
    .withMessage('天数必须是正整数'),
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

    const { dataType, olderThanDays = 30 } = req.body;
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    let deletedCount = 0;

    // 根据数据类型执行清理
    switch (dataType) {
      case 'logs':
        const logResult = await prisma.log.deleteMany({
          where: {
            timestamp: {
              lt: cutoffDate,
            },
          },
        });
        deletedCount = logResult.count;
        break;

      case 'deviceData':
        const dataResult = await prisma.deviceData.deleteMany({
          where: {
            timestamp: {
              lt: cutoffDate,
            },
          },
        });
        deletedCount = dataResult.count;
        break;

      case 'alerts':
        const alertResult = await prisma.alert.deleteMany({
          where: {
            AND: [
              { status: 'RESOLVED' },
              { resolvedAt: { lt: cutoffDate } },
            ],
          },
        });
        deletedCount = alertResult.count;
        break;

      case 'all':
        const [logCount, dataCount, alertCount] = await Promise.all([
          prisma.log.deleteMany({
            where: { timestamp: { lt: cutoffDate } },
          }),
          prisma.deviceData.deleteMany({
            where: { timestamp: { lt: cutoffDate } },
          }),
          prisma.alert.deleteMany({
            where: {
              AND: [
                { status: 'RESOLVED' },
                { resolvedAt: { lt: cutoffDate } },
              ],
            },
          }),
        ]);
        deletedCount = logCount.count + dataCount.count + alertCount.count;
        break;
    }

    // 记录清理日志
    logger.userAction(req.user!.id, 'SYSTEM_CLEANUP', 'SYSTEM', undefined, {
      dataType,
      olderThanDays,
      deletedCount,
    });

    res.json({
      success: true,
      data: {
        dataType,
        olderThanDays,
        deletedCount,
      },
      message: '系统数据清理完成',
      timestamp: new Date(),
    });

  } catch (error) {
    logger.error('System cleanup error:', error);
    res.status(500).json({
      success: false,
      error: '系统数据清理失败',
      timestamp: new Date(),
    });
  }
});

/**
 * 导出系统数据
 * GET /api/system/export
 */
router.get('/export', [
  requireAdmin,
  query('dataType')
    .isIn(['users', 'devices', 'logs', 'alerts'])
    .withMessage('数据类型必须是 users、devices、logs 或 alerts'),
  query('format')
    .optional()
    .isIn(['json', 'csv'])
    .withMessage('导出格式必须是 json 或 csv'),
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

    const { dataType, format = 'json' } = req.query;

    let data: any[] = [];

    // 根据数据类型查询数据
    switch (dataType) {
      case 'users':
        data = await prisma.user.findMany({
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
            language: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true,
            updatedAt: true,
          },
        });
        break;

      case 'devices':
        data = await prisma.device.findMany({
          select: {
            id: true,
            slug: true,
            name: true,
            type: true,
            status: true,
            capabilities: true,
            lastSeenAt: true,
            createdAt: true,
            updatedAt: true,
          },
        });
        break;

      case 'logs':
        data = await prisma.log.findMany({
          include: {
            user: {
              select: {
                username: true,
              },
            },
            device: {
              select: {
                name: true,
                slug: true,
              },
            },
          },
          orderBy: { timestamp: 'desc' },
          take: 10000, // 限制导出数量
        });
        break;

      case 'alerts':
        data = await prisma.alert.findMany({
          include: {
            device: {
              select: {
                name: true,
                slug: true,
              },
            },
            user: {
              select: {
                username: true,
              },
            },
          },
          orderBy: { triggeredAt: 'desc' },
        });
        break;
    }

    // 记录导出日志
    logger.userAction(req.user!.id, 'SYSTEM_EXPORT', 'SYSTEM', undefined, {
      dataType,
      format,
      recordCount: data.length,
    });

    // 设置响应头
    const filename = `${dataType}_export_${new Date().toISOString().split('T')[0]}.${format}`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    if (format === 'csv') {
      // TODO: 实现CSV导出逻辑
      res.setHeader('Content-Type', 'text/csv');
      res.json({
        success: true,
        message: 'CSV导出功能待实现',
        data,
        timestamp: new Date(),
      });
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.json({
        success: true,
        data,
        timestamp: new Date(),
      });
    }

  } catch (error) {
    logger.error('System export error:', error);
    res.status(500).json({
      success: false,
      error: '系统数据导出失败',
      timestamp: new Date(),
    });
  }
});

export default router;
