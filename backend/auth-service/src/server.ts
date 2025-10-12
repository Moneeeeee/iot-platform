import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { config, validateConfig } from './config/env';
import { createDbPool, closeDbPool } from './config/database';
import { createRedisClient, closeRedisClient } from './config/redis';
import { AuthService } from './services/auth.service';
import { DeviceTokenService } from './services/device-token.service';
import { MQTTService } from './services/mqtt.service';
import { authRoutes } from './routes/auth.routes';
import { deviceTokenRoutes } from './routes/device-token.routes';
import { mqttRoutes } from './routes/mqtt.routes';
import { healthRoutes } from './routes/health.routes';

const fastify = Fastify({
  logger: {
    level: config.logLevel,
  },
});

async function start() {
  try {
    // 验证配置
    validateConfig();

    // 注册插件
    await fastify.register(cors, {
      origin: config.corsOrigin,
    });

    await fastify.register(helmet);

    // 初始化数据库和 Redis
    const db = createDbPool();
    const redis = createRedisClient();

    // 初始化服务
    const authService = new AuthService(db, redis);
    const deviceTokenService = new DeviceTokenService(db, redis);
    const mqttService = new MQTTService(db, redis);

    // 注册路由
    await healthRoutes(fastify);
    await authRoutes(fastify, authService);
    await deviceTokenRoutes(fastify, deviceTokenService);
    await mqttRoutes(fastify, mqttService);

    // 优雅关闭处理
    const closeGracefully = async (signal: string) => {
      fastify.log.info(`Received ${signal}, closing gracefully`);
      await fastify.close();
      await closeDbPool();
      await closeRedisClient();
      process.exit(0);
    };

    process.on('SIGINT', () => closeGracefully('SIGINT'));
    process.on('SIGTERM', () => closeGracefully('SIGTERM'));

    // 启动服务器
    await fastify.listen({
      port: config.port,
      host: config.host,
    });

    fastify.log.info(`auth-service is running on http://${config.host}:${config.port}`);
    fastify.log.info(`Environment: ${config.nodeEnv}`);
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
}

start();


