
import Fastify, { FastifyInstance } from 'fastify';
import { env } from '@/env';
import { connectRedis, disconnectRedis } from '@/infrastructure/cache/redis';
import { AdapterFactory } from '@/core/adapters/factory';
import { DeviceService } from '@/modules/devices/service';
import { HealthService } from '@/infrastructure/health/health.service';
import { tenantResolver } from '@/core/middlewares/tenant-resolver';
import { authJwt } from '@/core/middlewares/auth-jwt';
import { idempotency } from '@/core/middlewares/idempotency';
import { createStartupConfig } from '@/infrastructure/config/app-startup.config';

// 创建 Fastify 实例
const fastify: FastifyInstance = Fastify({
  logger: env.NODE_ENV === 'development' 
    ? { transport: { target: 'pino-pretty', options: { colorize: true } }, level: env.LOG_LEVEL }
    : { level: env.LOG_LEVEL }
});

// 注册插件
async function registerPlugins() {
  // CORS - 验证 origin 配置
  const cors = await import('@fastify/cors');
  const corsOrigin = env.CORS_ORIGIN;
  
  if (corsOrigin === '*') {
    fastify.log.warn('CORS_ORIGIN is set to "*" but credentials is true. This may cause issues.');
  }
  
  await fastify.register(cors.default, {
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-Message-Id']
  });

  // 安全头 - 放宽策略避免影响 WS/前端
  const helmet = await import('@fastify/helmet');
  await fastify.register(helmet.default, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false
  });

  // 压缩
  const compress = await import('@fastify/compress');
  await fastify.register(compress.default);

  // Swagger 文档
  const swagger = await import('@fastify/swagger');
  await fastify.register(swagger.default, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'IoT Platform API',
        description: 'IoT设备管理平台API文档',
        version: '2.0.0',
        contact: {
          name: 'IoT Platform Team',
          email: 'support@iot-platform.com'
        }
      },
      servers: [
        {
          url: `http://localhost:${env.PORT}`,
          description: 'Development server'
        }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
          }
        }
      },
      tags: [
        {
          name: 'bootstrap',
          description: '设备引导相关接口'
        },
        {
          name: 'devices',
          description: '设备管理相关接口'
        },
        {
          name: 'health',
          description: '健康检查接口'
        }
      ]
    }
  });

  // Swagger UI
  const swaggerUi = await import('@fastify/swagger-ui');
  await fastify.register(swaggerUi.default, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false
    },
    uiHooks: {
      onRequest: function (_request: any, _reply: any, next: any) { next() },
      preHandler: function (_request: any, _reply: any, next: any) { next() }
    },
    staticCSP: true,
    transformStaticCSP: (_header: any) => _header,
    transformSpecification: (_swaggerObject: any, _request: any, _reply: any) => { return _swaggerObject },
    transformSpecificationClone: true
  });

  // WebSocket 支持
  const websocket = await import('@fastify/websocket');
  await fastify.register(websocket.default);
}

// 注册路由
async function registerRoutes() {
  const deviceService = new DeviceService();
  const healthService = new HealthService();

  // 注册引导服务路由
  await fastify.register(import('@/routes/bootstrap.routes'));

  // 健康检查端点 - 包含依赖探测
  fastify.get('/healthz', {
    schema: {
      description: '系统健康检查接口',
      tags: ['health'],
      summary: '检查系统健康状态',
      response: {
        200: {
          description: '系统健康',
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            status: { type: 'string' },
            timestamp: { type: 'string' },
            utcTimestamp: { type: 'string' },
            localTime: {
              type: 'object',
              properties: {
                timezone: { type: 'string' },
                iso: { type: 'string' },
                formatted: { type: 'string' },
                epochMs: { type: 'number' },
                utcOffsetMinutes: { type: 'number' }
              }
            },
            uptime: { type: 'number' },
            services: {
              type: 'object',
              properties: {
                database: { type: 'boolean' },
                redis: { type: 'boolean' },
                mqtt: { type: 'boolean' }
              }
            }
          }
        },
        503: {
          description: '系统不健康',
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            status: { type: 'string' },
            timestamp: { type: 'string' },
            utcTimestamp: { type: 'string' },
            localTime: {
              type: 'object',
              properties: {
                timezone: { type: 'string' },
                iso: { type: 'string' },
                formatted: { type: 'string' },
                epochMs: { type: 'number' },
                utcOffsetMinutes: { type: 'number' }
              }
            },
            errors: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const tzParam = (request.query as any)?.timezone || request.headers['x-timezone'];
    const tzTenant = request.tenant?.timezone;
    const tz = (tzParam as string) || tzTenant || env.DEFAULT_TIMEZONE;
    const health = await healthService.getHealthStatus(tz);
    const payload = {
      ok: health.ok,
      status: health.ok ? 'healthy' : 'unhealthy',
      // timestamp 显示本地时区 ISO，utcTimestamp 保留UTC
      timestamp: health.localTime.iso,
      utcTimestamp: health.timestamp,
      localTime: health.localTime,
      uptime: process.uptime(),
      services: {
        database: health.deps.postgres.connected,
        redis: health.deps.redis.connected,
        mqtt: health.deps.mqtt.connected
      }
    };
    return reply.status(health.ok ? 200 : 503).send(payload);
  });

  fastify.get('/api/healthz', {
    schema: {
      description: 'API健康检查接口',
      tags: ['health'],
      summary: '检查API服务健康状态',
      response: {
        200: {
          description: 'API健康',
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            status: { type: 'string' },
            timestamp: { type: 'string' },
            utcTimestamp: { type: 'string' },
            localTime: {
              type: 'object',
              properties: {
                timezone: { type: 'string' },
                iso: { type: 'string' },
                formatted: { type: 'string' },
                epochMs: { type: 'number' },
                utcOffsetMinutes: { type: 'number' }
              }
            },
            uptime: { type: 'number' },
            services: {
              type: 'object',
              properties: {
                database: { type: 'boolean' },
                redis: { type: 'boolean' },
                mqtt: { type: 'boolean' }
              }
            }
          }
        },
        503: {
          description: 'API不健康',
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            status: { type: 'string' },
            timestamp: { type: 'string' },
            utcTimestamp: { type: 'string' },
            localTime: {
              type: 'object',
              properties: {
                timezone: { type: 'string' },
                iso: { type: 'string' },
                formatted: { type: 'string' },
                epochMs: { type: 'number' },
                utcOffsetMinutes: { type: 'number' }
              }
            },
            errors: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    const tzParam = (request.query as any)?.timezone || request.headers['x-timezone'];
    const tzTenant = request.tenant?.timezone;
    const tz = (tzParam as string) || tzTenant || env.DEFAULT_TIMEZONE;
    const health = await healthService.getHealthStatus(tz);
    const payload = {
      ok: health.ok,
      status: health.ok ? 'healthy' : 'unhealthy',
      timestamp: health.localTime.iso,
      utcTimestamp: health.timestamp,
      localTime: health.localTime,
      uptime: process.uptime(),
      services: {
        database: health.deps.postgres.connected,
        redis: health.deps.redis.connected,
        mqtt: health.deps.mqtt.connected
      }
    };
    return reply.status(health.ok ? 200 : 503).send(payload);
  });

  // 基础 API 路由
  fastify.get('/api/status', {
    schema: {
      description: '获取系统状态信息',
      tags: ['health'],
      summary: '获取系统运行状态和配置信息',
      response: {
        200: {
          description: '系统状态信息',
          type: 'object',
          properties: {
            status: { type: 'string', description: '系统状态' },
            environment: { type: 'string', description: '运行环境' },
            features: {
              type: 'object',
              description: '功能开关',
              properties: {
                ota: { type: 'boolean', description: 'OTA功能' },
                ruleEngine: { type: 'boolean', description: '规则引擎' },
                aggregates: { type: 'boolean', description: '聚合功能' }
              }
            },
            profiles: {
              type: 'object',
              description: '配置档案',
              properties: {
                data: { type: 'string', description: '数据档案' },
                frontend: { type: 'string', description: '前端路由配置' }
              }
            }
          }
        }
      }
    }
  }, async (_request) => {
    return {
      status: 'running',
      environment: env.NODE_ENV,
      features: {
        ota: env.FEATURE_OTA,
        ruleEngine: env.FEATURE_RULE_ENGINE,
        aggregates: env.FEATURE_AGGREGATES
      },
      profiles: {
        data: env.DATA_PROFILE,
        frontend: env.FRONTEND_ROUTER
      }
    };
  });

  // 简易租户API：更新租户时区
  fastify.patch('/api/tenants/:tenantId/timezone', {
    schema: {
      description: '更新租户时区',
      tags: ['tenants'],
      params: {
        type: 'object',
        properties: { tenantId: { type: 'string' } },
        required: ['tenantId']
      },
      body: {
        type: 'object',
        properties: { timezone: { type: 'string' } },
        required: ['timezone']
      },
      response: {
        200: {
          type: 'object',
          properties: { success: { type: 'boolean' }, timezone: { type: 'string' } }
        }
      }
    }
  }, async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    const { timezone } = request.body as { timezone: string };
    try {
      const prisma = (await import('@/infrastructure/db/prisma')).getPrismaClient();
      await prisma.tenant.update({ where: { id: tenantId }, data: { timezone } });
      return { success: true, timezone };
    } catch (e) {
      return reply.status(400).send({ success: false, error: 'Failed to update timezone' });
    }
  });

  // 新增：获取租户信息
  fastify.get('/api/tenants/:tenantId', {
    schema: {
      description: '获取租户信息',
      tags: ['tenants'],
      params: {
        type: 'object',
        properties: { tenantId: { type: 'string' } },
        required: ['tenantId']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            timezone: { type: 'string' }
          }
        },
        404: {
          type: 'object',
          properties: { error: { type: 'string' } }
        }
      }
    }
  }, async (request, reply) => {
    const { tenantId } = request.params as { tenantId: string };
    try {
      const prisma = (await import('@/infrastructure/db/prisma')).getPrismaClient();
      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true, name: true, timezone: true } });
      if (!tenant) return reply.status(404).send({ error: 'Tenant not found' });
      return tenant;
    } catch (e) {
      return reply.status(400).send({ error: 'Failed to fetch tenant' });
    }
  });

  // WebSocket 路由
  fastify.get(env.WS_PATH, { websocket: true }, async (connection, _request) => {
    connection.socket.on('message', (message) => {
      // 回声测试 - 正确处理 Buffer
      const messageStr = message instanceof Buffer ? message.toString() : String(message);
      connection.socket.send(`Echo: ${messageStr}`);
    });
  });

  // 设备管理 API - 使用中间件解析的租户
  fastify.get('/api/devices', async (request, reply) => {
    const tenantId = request.tenant?.id;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Tenant not resolved' });
    }
    
    const devices = await deviceService.getDevices(tenantId);
    return { devices };
  });

  fastify.post('/api/devices', async (request, reply) => {
    const tenantId = request.tenant?.id;
    if (!tenantId) {
      return reply.status(400).send({ error: 'Tenant not resolved' });
    }
    
    const device = await deviceService.createDevice(tenantId, request.body as any);
    return { device };
  });

  fastify.post('/api/devices/:deviceId/telemetry', async (request, _reply) => {
    const { deviceId } = request.params as { deviceId: string };
    const { data } = request.body as { data: Record<string, any> };
    
    await deviceService.storeTelemetry(deviceId, data);
    return { success: true };
  });
}

// 启动服务器
async function start() {
  try {
    // 1. 先注册插件
    await registerPlugins();
    
    // 2. 注册全局中间件
    fastify.addHook('preHandler', tenantResolver);
    // 跳过 /docs 及其静态资源的鉴权
    fastify.addHook('preHandler', async (request, reply) => {
      const url = request.url || '';
      if (url.startsWith('/docs')) {
        return; // skip auth for swagger
      }
      await authJwt(request, reply);
    });
    fastify.addHook('preHandler', idempotency);
    
    // 3. 初始化基础设施
    await connectRedis();
    await AdapterFactory.initializeAdapters();
    
    // 4. 初始化MQTT配置和策略注册器
    console.log('🔧 Initializing MQTT configuration...');
    const startupConfig = createStartupConfig({
      configPath: 'configs/mqtt',
      enableEmqxAcl: true,
      warmupTenants: ['default', 'demo', 'test'],
      enableHotReload: env.NODE_ENV === 'development'
    });
    await startupConfig.initialize(fastify);
    
    // 5. 最后注册路由
    await registerRoutes();

    await fastify.listen({
      port: env.PORT,
      host: '0.0.0.0'
    });

    const address = `http://0.0.0.0:${env.PORT}`;
    fastify.log.info(`🚀 Backend server running on ${address}`);
    fastify.log.info(`📊 Environment: ${env.NODE_ENV}`);
    fastify.log.info(`🔧 Data Profile: ${env.DATA_PROFILE}`);
    fastify.log.info(`🌐 CORS Origin: ${env.CORS_ORIGIN}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// 优雅关闭
async function gracefulShutdown(signal: string) {
  fastify.log.info(`Received ${signal}, shutting down server...`);
  
  try {
    // 1. 先关闭 Fastify（停止接受新请求）
    await fastify.close();
    fastify.log.info('Fastify server closed');
  } catch (error) {
    fastify.log.error("Error closing Fastify: %o", error as object);
  }
  
  try {
    // 2. 关闭适配器
    await AdapterFactory.shutdownAdapters();
    fastify.log.info('Adapters shutdown complete');
  } catch (error) {
    fastify.log.error("Error shutting down adapters: %o", error as object);
  }
  
  try {
    // 3. 最后关闭 Redis
    await disconnectRedis();
    fastify.log.info('Redis disconnected');
  } catch (error) {
    fastify.log.error("Error disconnecting Redis: %o", error as object);
  }
  
  fastify.log.info('Server shutdown complete');
  process.exit(0);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

export default fastify;
export { start };
