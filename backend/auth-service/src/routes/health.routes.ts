import { FastifyInstance } from 'fastify';
import { testDatabaseConnection } from '../config/database';
import { testRedisConnection } from '../config/redis';

export const healthRoutes = async (fastify: FastifyInstance) => {
  /**
   * 健康检查端点
   */
  fastify.get('/health', async (request, reply) => {
    try {
      const dbHealth = await testDatabaseConnection();
      const redisHealth = await testRedisConnection();

      const isHealthy = dbHealth && redisHealth;

      reply.code(isHealthy ? 200 : 503).send({
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          database: dbHealth ? 'connected' : 'disconnected',
          redis: redisHealth ? 'connected' : 'disconnected',
        },
      });
    } catch (error) {
      reply.code(503).send({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      });
    }
  });

  /**
   * Readiness 探针
   */
  fastify.get('/ready', async (request, reply) => {
    try {
      const dbHealth = await testDatabaseConnection();
      if (!dbHealth) {
        reply.code(503).send({ ready: false });
        return;
      }

      reply.send({ ready: true });
    } catch (error) {
      reply.code(503).send({ ready: false });
    }
  });

  /**
   * Liveness 探针
   */
  fastify.get('/live', async (request, reply) => {
    reply.send({ alive: true });
  });

  /**
   * Prometheus 指标（简化版）
   */
  fastify.get('/metrics', async (request, reply) => {
    // 这里返回简单的指标，后续可以集成 prom-client
    reply.type('text/plain').send(`
# HELP auth_service_up Service is up
# TYPE auth_service_up gauge
auth_service_up 1

# HELP auth_requests_total Total number of requests
# TYPE auth_requests_total counter
auth_requests_total{method="POST",path="/api/v1/auth/login"} 0

# HELP auth_db_connections Database connections
# TYPE auth_db_connections gauge
auth_db_connections 0
    `.trim());
  });
};


