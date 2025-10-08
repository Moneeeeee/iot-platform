/**
 * 设备引导服务路由
 * 
 * 定义设备引导相关的API端点，包括：
 * 1. 设备引导配置接口
 * 2. 设备配置管理接口
 * 3. 设备状态查询接口
 * 
 * 设计原则：
 * 1. RESTful设计：遵循REST API设计规范
 * 2. 中间件集成：复用现有的认证和租户解析中间件
 * 3. 错误处理：统一的错误响应格式
 * 4. 文档化：清晰的接口文档和示例
 */

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { BootstrapController } from '@/modules/bootstrap/bootstrap.controller.v2';

/**
 * 引导服务路由插件
 * 
 * @param fastify Fastify实例
 * @param options 插件选项
 */
export async function bootstrapRoutes(
  fastify: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> {
  const controller = new BootstrapController();

  /**
   * 设备引导配置接口
   * 
   * POST /api/config/bootstrap
   * 
   * 设备上电时调用此接口获取引导配置，包括MQTT连接信息、
   * OTA策略、设备策略等。
   * 
   * 请求体：
   * {
   *   "deviceId": "device_001",
   *   "mac": "00:11:22:33:44:55",
   *   "firmware": {
   *     "current": "1.0.0",
   *     "minRequired": "1.0.0"
   *   },
   *   "hardware": {
   *     "version": "v2.1",
   *     "description": "IoT Sensor Node"
   *   },
   *   "capabilities": [
   *     {"name": "temperature_sensor", "version": "1.0"},
   *     {"name": "humidity_sensor", "version": "1.0"}
   *   ],
   *   "deviceType": "sensor",
   *   "timestamp": 1640995200000,
   *   "signature": "abc123..."
   * }
   * 
   * 响应：
   * {
   *   "success": true,
   *   "data": {
   *     "cfg": { ... },
   *     "mqtt": { ... },
   *     "shadowDesired": { ... },
   *     "ota": { ... },
   *     "policies": { ... },
   *     "signature": "def456..."
   *   },
   *   "message": "Success",
   *   "timestamp": "2024-01-01T00:00:00.000Z"
   * }
   */
  fastify.post('/api/config/bootstrap', {
    schema: {
      description: '设备引导配置接口',
      tags: ['bootstrap'],
      summary: '获取设备引导配置',
      body: {
        type: 'object',
        required: ['deviceId', 'mac', 'deviceType', 'timestamp'],
        properties: {
          deviceId: { type: 'string', description: '设备唯一标识符' },
          mac: { type: 'string', description: '设备MAC地址' },
          firmware: {
            type: 'object',
            properties: {
              current: { type: 'string', description: '当前固件版本' },
              build: { type: 'string', description: '固件构建号' },
              minRequired: { type: 'string', description: '最低要求版本' },
              channel: { 
                type: 'string', 
                enum: ['stable', 'beta', 'dev'],
                description: '发布通道（可选）' 
              }
            }
          },
          hardware: {
            type: 'object',
            properties: {
              version: { type: 'string', description: '硬件版本' },
              serial: { type: 'string', description: '硬件序列号' },
              description: { type: 'string', description: '硬件描述' }
            }
          },
          capabilities: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                version: { type: 'string' },
                params: { type: 'object' }
              }
            }
          },
          deviceType: { type: 'string', description: '设备类型' },
          tenantId: { type: 'string', description: '租户ID（可选）' },
          timestamp: { type: 'number', description: '请求时间戳' },
          signature: { type: 'string', description: '请求签名（可选）' },
          messageId: { type: 'string', description: '消息ID（用于幂等性）' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { 
              type: 'object',
              additionalProperties: true  // 允许额外的属性
            },
            message: { type: 'string' },
            timestamp: { type: 'string' }
          },
          additionalProperties: true  // 允许额外的属性
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            timestamp: { type: 'string' }
          },
          additionalProperties: true
        },
        500: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            timestamp: { type: 'string' }
          }
        }
      }
    },
    preHandler: [
      // 注意：幂等性检查在controller内部处理
    ]
  }, controller.handleBootstrap.bind(controller));

  /**
   * 设备配置刷新接口
   * 
   * PUT /api/config/device/:deviceId/refresh
   * 
   * 用于刷新设备的引导配置，通常在设备需要获取新的MQTT凭证
   * 或配置更新时调用。
   * 
   * 路径参数：
   * - deviceId: 设备ID
   * 
   * 响应格式同引导接口
   */
  fastify.put('/api/config/device/:deviceId/refresh', {
    schema: {
      description: '刷新设备配置',
      tags: ['bootstrap'],
      summary: '刷新设备引导配置',
      params: {
        type: 'object',
        required: ['deviceId'],
        properties: {
          deviceId: { type: 'string', description: '设备ID' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { 
              type: 'object',
              additionalProperties: true
            },
            message: { type: 'string' },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  }, controller.handleRefreshConfig.bind(controller));

  /**
   * 设备配置查询接口
   * 
   * GET /api/config/device/:deviceId
   * 
   * 查询设备的当前配置状态，包括最后引导时间、
   * 配置版本等信息。
   * 
   * 路径参数：
   * - deviceId: 设备ID
   */
  fastify.get('/api/config/device/:deviceId', {
    schema: {
      description: '查询设备配置',
      tags: ['bootstrap'],
      summary: '获取设备当前配置信息',
      params: {
        type: 'object',
        required: ['deviceId'],
        properties: {
          deviceId: { type: 'string', description: '设备ID' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                deviceId: { type: 'string' },
                tenantId: { type: 'string' },
                lastBootstrap: { type: 'string' },
                status: { type: 'string' }
              }
            },
            message: { type: 'string' },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  }, controller.handleGetDeviceConfig.bind(controller));

  /**
   * 兼容性接口：OTA检查
   * 
   * POST /api/ota/check-device
   * 
   * 为了兼容现有的OTA检查接口，将此接口重定向到引导接口。
   * 这样可以保持向后兼容性，同时统一设备初始化流程。
   */
  fastify.post('/api/ota/check-device', {
    schema: {
      deprecated: true,
      description: 'Device bootstrap API (deprecated - use /api/config/bootstrap instead)',
      tags: ['bootstrap'],
      summary: 'OTA设备检查接口（已废弃）',
      body: {
        type: 'object',
        required: ['deviceId', 'mac', 'firmware', 'hardware', 'deviceType', 'timestamp'],
        properties: {
          deviceId: { type: 'string', description: '设备唯一标识符' },
          mac: { type: 'string', description: '设备MAC地址' },
          firmware: {
            type: 'object',
            properties: {
              current: { type: 'string', description: '当前固件版本' },
              build: { type: 'string', description: '固件构建号' },
              minRequired: { type: 'string', description: '最低要求版本' },
              channel: { 
                type: 'string', 
                enum: ['stable', 'beta', 'dev'],
                description: '发布通道（可选）' 
              }
            }
          },
          hardware: {
            type: 'object',
            properties: {
              version: { type: 'string', description: '硬件版本' },
              serial: { type: 'string', description: '硬件序列号' },
              description: { type: 'string', description: '硬件描述' }
            }
          },
          capabilities: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                version: { type: 'string' },
                params: { type: 'object' }
              }
            }
          },
          deviceType: { type: 'string', description: '设备类型' },
          tenantId: { type: 'string', description: '租户ID（可选）' },
          timestamp: { type: 'number', description: '请求时间戳' },
          signature: { type: 'string', description: '请求签名（可选）' },
          messageId: { type: 'string', description: '消息ID（用于幂等性）' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { 
              type: 'object',
              additionalProperties: true
            },
            message: { type: 'string' },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  }, controller.handleBootstrap.bind(controller));

  // 注册完成后记录日志
  fastify.log.info('Bootstrap routes registered successfully');
}
/**
 * 导出路由插件
 */
export default bootstrapRoutes;

