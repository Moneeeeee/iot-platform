import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import 'dotenv/config';

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});

// 插件注册
app.register(cors, {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
});

app.register(helmet, {
  contentSecurityPolicy: false,
});

app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

app.register(swagger, {
  openapi: {
    info: {
      title: 'Auth Service API',
      description: 'Authentication and Authorization Service',
      version: '1.0.0',
    },
    servers: [
      {
        url: 'http://localhost:8001',
        description: 'Development server',
      },
    ],
    tags: [
      { name: 'auth', description: 'Authentication endpoints' },
      { name: 'devices', description: 'Device authentication' },
      { name: 'mqtt', description: 'MQTT authentication hooks' },
    ],
  },
});

app.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: false,
  },
});

// 健康检查
app.get('/health', async () => {
  return {
    status: 'ok',
    service: 'auth-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  };
});

// Metrics 端点（Prometheus）
app.get('/metrics', async () => {
  return {
    // TODO: 实现 Prometheus metrics
    message: 'Metrics endpoint - TODO: implement prometheus metrics',
  };
});

// TODO: 注册路由
// app.register(authRoutes, { prefix: '/api/v1/auth' });
// app.register(deviceRoutes, { prefix: '/api/v1/devices' });
// app.register(mqttRoutes, { prefix: '/api/v1/mqtt' });

// 错误处理
app.setErrorHandler((error, request, reply) => {
  app.log.error(error);
  reply.status(error.statusCode || 500).send({
    error: error.name || 'InternalServerError',
    message: error.message || 'Something went wrong',
    statusCode: error.statusCode || 500,
  });
});

// 启动服务
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '8001', 10);
    const host = process.env.HOST || '0.0.0.0';

    await app.listen({ port, host });

    app.log.info(`🚀 Auth Service is running on http://${host}:${port}`);
    app.log.info(`📚 API Docs available at http://${host}:${port}/docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

// 优雅关闭
const gracefulShutdown = async () => {
  app.log.info('Received shutdown signal, closing server...');
  await app.close();
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

start();

