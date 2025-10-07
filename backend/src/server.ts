
import Fastify, { FastifyInstance } from 'fastify';
import { env } from '@/env';
import { connectRedis, disconnectRedis } from '@/infrastructure/cache/redis';
import { AdapterFactory } from '@/core/adapters/factory';
import { DeviceService } from '@/modules/devices/service';
import { HealthService } from '@/infrastructure/health/health.service';
import { tenantResolver } from '@/core/middlewares/tenant-resolver';
import { authJwt } from '@/core/middlewares/auth-jwt';
import { idempotency } from '@/core/middlewares/idempotency';

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

  // WebSocket 支持
  const websocket = await import('@fastify/websocket');
  await fastify.register(websocket.default);
}

// 注册路由
async function registerRoutes() {
  const deviceService = new DeviceService();
  const healthService = new HealthService();

  // 健康检查端点 - 包含依赖探测
  fastify.get('/healthz', async (_request, reply) => {
    const health = await healthService.getHealthStatus();
    return reply.status(health.ok ? 200 : 503).send(health);
  });

  fastify.get('/api/healthz', async (_request, reply) => {
    const health = await healthService.getHealthStatus();
    return reply.status(health.ok ? 200 : 503).send(health);
  });

  // 基础 API 路由
  fastify.get('/api/status', async (_request) => {
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
    fastify.addHook('preHandler', authJwt);
    fastify.addHook('preHandler', idempotency);
    
    // 3. 初始化基础设施
    await connectRedis();
    await AdapterFactory.initializeAdapters();
    
    // 4. 最后注册路由
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
