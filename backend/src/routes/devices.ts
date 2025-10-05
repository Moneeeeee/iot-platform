/**
 * 设备管理路由
 * 处理设备的CRUD操作、数据查询和控制功能
 */

import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { prisma } from '@/config/database';
import { logger } from '@/utils/logger';
import { DeviceType, DeviceStatus, ProtocolType, Permission } from '@/types';
import { requirePermission } from '@/middleware/auth';

const router = Router();

/**
 * 获取设备列表
 * GET /api/devices
 */
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
  query('search').optional().isString().withMessage('搜索关键词必须是字符串'),
  query('type').optional().isIn(Object.values(DeviceType)).withMessage('无效的设备类型'),
  query('status').optional().isIn(Object.values(DeviceStatus)).withMessage('无效的设备状态'),
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
    const type = req.query.type as DeviceType;
    const status = req.query.status as DeviceStatus;
    const skip = (page - 1) * limit;

    // 构建查询条件
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (type) {
      where.type = type;
    }
    
    if (status) {
      where.status = status;
    }

    // 查询设备列表
    const [devices, total] = await Promise.all([
      prisma.device.findMany({
        where,
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
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.device.count({ where }),
    ]);

    // 记录查询日志
    logger.userAction(req.user!.id, 'DEVICE_LIST_QUERY', 'DEVICE');

    res.json({
      success: true,
      data: devices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      timestamp: new Date(),
    });

  } catch (error) {
    logger.error('Get devices list error:', error);
    res.status(500).json({
      success: false,
      error: '获取设备列表失败',
      timestamp: new Date(),
    });
  }
});

/**
 * 获取设备详情
 * GET /api/devices/:id
 */
router.get('/:id', [
  param('id').isString().withMessage('设备ID必须是字符串'),
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

    // 查询设备详情
    const device = await prisma.device.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        name: true,
        type: true,
        status: true,
        config: true,
        capabilities: true,
        lastSeenAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        error: '设备不存在',
        timestamp: new Date(),
      });
    }

    // 记录查询日志
    logger.userAction(req.user!.id, 'DEVICE_DETAIL_QUERY', 'DEVICE', id);

    res.json({
      success: true,
      data: device,
      timestamp: new Date(),
    });

  } catch (error) {
    logger.error('Get device detail error:', error);
    res.status(500).json({
      success: false,
      error: '获取设备详情失败',
      timestamp: new Date(),
    });
  }
});

/**
 * 创建设备
 * POST /api/devices
 */
router.post('/', [
  requirePermission(Permission.DEVICE_CREATE),
  body('slug')
    .isLength({ min: 3, max: 50 })
    .withMessage('设备标识长度必须在3-50个字符之间')
    .matches(/^[a-z0-9-]+$/)
    .withMessage('设备标识只能包含小写字母、数字和连字符'),
  body('name')
    .isLength({ min: 1, max: 100 })
    .withMessage('设备名称长度必须在1-100个字符之间'),
  body('type')
    .isIn(Object.values(DeviceType))
    .withMessage('无效的设备类型'),
  body('config')
    .isObject()
    .withMessage('设备配置必须是对象'),
  body('capabilities')
    .isArray()
    .withMessage('设备能力必须是数组'),
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

    const { slug, name, type, config, capabilities } = req.body;

    // 检查设备标识是否已存在
    const existingDevice = await prisma.device.findUnique({
      where: { slug },
    });

    if (existingDevice) {
      return res.status(409).json({
        success: false,
        error: '设备标识已存在',
        timestamp: new Date(),
      });
    }

    // 创建设备
    const device = await prisma.device.create({
      data: {
        slug,
        name,
        type,
        config,
        capabilities,
        userId: req.user!.id,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        type: true,
        status: true,
        config: true,
        capabilities: true,
        lastSeenAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // 记录创建日志
    logger.userAction(req.user!.id, 'DEVICE_CREATE', 'DEVICE', device.id);

    res.status(201).json({
      success: true,
      data: device,
      message: '设备创建成功',
      timestamp: new Date(),
    });

  } catch (error) {
    logger.error('Create device error:', error);
    res.status(500).json({
      success: false,
      error: '创建设备失败',
      timestamp: new Date(),
    });
  }
});

/**
 * 更新设备
 * PUT /api/devices/:id
 */
router.put('/:id', [
  requirePermission(Permission.DEVICE_UPDATE),
  param('id').isString().withMessage('设备ID必须是字符串'),
  body('name')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('设备名称长度必须在1-100个字符之间'),
  body('config')
    .optional()
    .isObject()
    .withMessage('设备配置必须是对象'),
  body('capabilities')
    .optional()
    .isArray()
    .withMessage('设备能力必须是数组'),
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

    // 检查设备是否存在
    const existingDevice = await prisma.device.findUnique({
      where: { id },
    });

    if (!existingDevice) {
      return res.status(404).json({
        success: false,
        error: '设备不存在',
        timestamp: new Date(),
      });
    }

    // 构建更新数据
    if (req.body.name) updateData.name = req.body.name;
    if (req.body.config) updateData.config = req.body.config;
    if (req.body.capabilities) updateData.capabilities = req.body.capabilities;

    // 更新设备
    const device = await prisma.device.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        slug: true,
        name: true,
        type: true,
        status: true,
        config: true,
        capabilities: true,
        lastSeenAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // 记录更新日志
    logger.userAction(req.user!.id, 'DEVICE_UPDATE', 'DEVICE', id);

    res.json({
      success: true,
      data: device,
      message: '设备更新成功',
      timestamp: new Date(),
    });

  } catch (error) {
    logger.error('Update device error:', error);
    res.status(500).json({
      success: false,
      error: '更新设备失败',
      timestamp: new Date(),
    });
  }
});

/**
 * 删除设备
 * DELETE /api/devices/:id
 */
router.delete('/:id', [
  requirePermission(Permission.DEVICE_DELETE),
  param('id').isString().withMessage('设备ID必须是字符串'),
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

    // 检查设备是否存在
    const existingDevice = await prisma.device.findUnique({
      where: { id },
    });

    if (!existingDevice) {
      return res.status(404).json({
        success: false,
        error: '设备不存在',
        timestamp: new Date(),
      });
    }

    // 删除设备
    await prisma.device.delete({
      where: { id },
    });

    // 记录删除日志
    logger.userAction(req.user!.id, 'DEVICE_DELETE', 'DEVICE', id);

    res.json({
      success: true,
      message: '设备删除成功',
      timestamp: new Date(),
    });

  } catch (error) {
    logger.error('Delete device error:', error);
    res.status(500).json({
      success: false,
      error: '删除设备失败',
      timestamp: new Date(),
    });
  }
});

/**
 * 获取设备数据
 * GET /api/devices/:id/data
 */
router.get('/:id/data', [
  param('id').isString().withMessage('设备ID必须是字符串'),
  query('startTime').optional().isISO8601().withMessage('开始时间必须是有效的ISO8601格式'),
  query('endTime').optional().isISO8601().withMessage('结束时间必须是有效的ISO8601格式'),
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('限制数量必须在1-1000之间'),
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
    const startTime = req.query.startTime ? new Date(req.query.startTime as string) : undefined;
    const endTime = req.query.endTime ? new Date(req.query.endTime as string) : undefined;
    const limit = parseInt(req.query.limit as string) || 100;

    // 检查设备是否存在
    const device = await prisma.device.findUnique({
      where: { id },
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        error: '设备不存在',
        timestamp: new Date(),
      });
    }

    // 构建查询条件
    const where: any = { deviceId: id };
    
    if (startTime || endTime) {
      where.timestamp = {};
      if (startTime) where.timestamp.gte = startTime;
      if (endTime) where.timestamp.lte = endTime;
    }

    // 查询设备数据
    const data = await prisma.deviceData.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: limit,
    });

    // 记录查询日志
    logger.userAction(req.user!.id, 'DEVICE_DATA_QUERY', 'DEVICE', id);

    res.json({
      success: true,
      data,
      timestamp: new Date(),
    });

  } catch (error) {
    logger.error('Get device data error:', error);
    res.status(500).json({
      success: false,
      error: '获取设备数据失败',
      timestamp: new Date(),
    });
  }
});

/**
 * 控制设备
 * POST /api/devices/:id/control
 */
router.post('/:id/control', [
  requirePermission(Permission.DEVICE_CONTROL),
  param('id').isString().withMessage('设备ID必须是字符串'),
  body('command')
    .isString()
    .withMessage('控制命令必须是字符串'),
  body('parameters')
    .optional()
    .isObject()
    .withMessage('命令参数必须是对象'),
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
    const { command, parameters } = req.body;

    // 检查设备是否存在
    const device = await prisma.device.findUnique({
      where: { id },
    });

    if (!device) {
      return res.status(404).json({
        success: false,
        error: '设备不存在',
        timestamp: new Date(),
      });
    }

    // 检查设备是否在线
    if (device.status !== DeviceStatus.ONLINE) {
      return res.status(400).json({
        success: false,
        error: '设备不在线，无法执行控制命令',
        timestamp: new Date(),
      });
    }

    // TODO: 实现设备控制逻辑
    // 这里应该根据设备的协议类型发送控制命令
    
    // 记录控制日志
    logger.userAction(req.user!.id, 'DEVICE_CONTROL', 'DEVICE', id, {
      command,
      parameters,
    });

    res.json({
      success: true,
      message: '控制命令已发送',
      data: {
        deviceId: id,
        command,
        parameters,
        timestamp: new Date(),
      },
      timestamp: new Date(),
    });

  } catch (error) {
    logger.error('Control device error:', error);
    res.status(500).json({
      success: false,
      error: '控制设备失败',
      timestamp: new Date(),
    });
  }
});

/**
 * 更新设备状态
 * PUT /api/devices/:id/status
 */
router.put('/:id/status', [
  requirePermission(Permission.DEVICE_UPDATE),
  param('id').isString().withMessage('设备ID必须是字符串'),
  body('status')
    .isIn(Object.values(DeviceStatus))
    .withMessage('无效的设备状态'),
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
    const { status } = req.body;

    // 检查设备是否存在
    const existingDevice = await prisma.device.findUnique({
      where: { id },
    });

    if (!existingDevice) {
      return res.status(404).json({
        success: false,
        error: '设备不存在',
        timestamp: new Date(),
      });
    }

    // 更新设备状态
    const device = await prisma.device.update({
      where: { id },
      data: { 
        status,
        lastSeenAt: status === DeviceStatus.ONLINE ? new Date() : existingDevice.lastSeenAt,
      },
      select: {
        id: true,
        slug: true,
        name: true,
        type: true,
        status: true,
        lastSeenAt: true,
        updatedAt: true,
      },
    });

    // 记录状态更新日志
    logger.userAction(req.user!.id, 'DEVICE_STATUS_UPDATE', 'DEVICE', id, {
      oldStatus: existingDevice.status,
      newStatus: status,
    });

    res.json({
      success: true,
      data: device,
      message: '设备状态更新成功',
      timestamp: new Date(),
    });

  } catch (error) {
    logger.error('Update device status error:', error);
    res.status(500).json({
      success: false,
      error: '更新设备状态失败',
      timestamp: new Date(),
    });
  }
});

export default router;
