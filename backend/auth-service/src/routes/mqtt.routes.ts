import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { MQTTService } from '../services/mqtt.service';

// Zod 验证 schemas
const mqttAuthSchema = z.object({
  clientid: z.string().min(1, 'Client ID is required'),
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

const mqttACLSchema = z.object({
  clientid: z.string().min(1, 'Client ID is required'),
  username: z.string().min(1, 'Username is required'),
  topic: z.string().min(1, 'Topic is required'),
  action: z.enum(['publish', 'subscribe']),
});

export const mqttRoutes = async (
  fastify: FastifyInstance,
  mqttService: MQTTService
) => {
  /**
   * MQTT 认证 Hook
   * EMQX 调用此端点验证设备连接
   */
  fastify.post('/api/v1/mqtt/auth', async (request, reply) => {
    try {
      const body = mqttAuthSchema.parse(request.body);

      const result = await mqttService.authenticate(body);

      // EMQX 期望的响应格式
      reply.send(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        reply.send({
          result: 'deny',
          reason: 'Invalid request format',
        });
      } else {
        reply.send({
          result: 'deny',
          reason: error.message || 'Authentication failed',
        });
      }
    }
  });

  /**
   * MQTT ACL Hook
   * EMQX 调用此端点检查设备权限
   */
  fastify.post('/api/v1/mqtt/acl', async (request, reply) => {
    try {
      const body = mqttACLSchema.parse(request.body);

      const result = await mqttService.checkACL(body);

      // EMQX 期望的响应格式
      reply.send(result);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        reply.send({
          result: 'deny',
          reason: 'Invalid request format',
        });
      } else {
        reply.send({
          result: 'deny',
          reason: error.message || 'ACL check failed',
        });
      }
    }
  });
};


