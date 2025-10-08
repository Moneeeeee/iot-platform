/**
 * EMQX 动态鉴权接口
 * 
 * 为EMQX提供HTTP ACL鉴权服务
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { MqttPolicyRegistry } from '@/infrastructure/config/mqtt-policy.registry';

/**
 * EMQX ACL请求接口
 */
interface EmqxAclRequest {
  /** 客户端ID */
  clientid: string;
  /** 用户名 */
  username: string;
  /** 密码 */
  password: string;
  /** 发布者IP */
  peerhost: string;
  /** 协议版本 */
  proto_ver: number;
  /** 主题 */
  topic: string;
  /** 操作类型：publish/subscribe */
  action: 'publish' | 'subscribe';
  /** 结果：allow/deny */
  result: 'allow' | 'deny';
  /** 是否保留消息 */
  retain: boolean;
  /** QoS等级 */
  qos: 0 | 1 | 2;
  /** 是否通配符主题 */
  is_sys: boolean;
}

/**
 * EMQX ACL响应接口
 */
interface EmqxAclResponse {
  /** 结果：allow/deny */
  result: 'allow' | 'deny';
  /** 原因（可选） */
  reason?: string;
}

/**
 * EMQX动态鉴权服务
 */
export class EmqxAclService {
  private policyRegistry: MqttPolicyRegistry;

  constructor(policyRegistry?: MqttPolicyRegistry) {
    this.policyRegistry = policyRegistry || MqttPolicyRegistry.getInstance();
  }

  /**
   * 解析客户端ID获取租户和设备信息
   */
  private parseClientId(clientId: string): {
    tenantId: string;
    deviceId: string;
    deviceType?: string;
  } | null {
    // 客户端ID格式: {tenantId}_{deviceId}_{timestamp}
    const parts = clientId.split('_');
    if (parts.length < 2) {
      return null;
    }

    const tenantId = parts[0];
    const deviceId = parts[1];
    
    if (!tenantId || !deviceId) {
      return null;
    }
    
    return { tenantId, deviceId };
  }

  /**
   * 解析用户名获取设备类型
   */
  private parseUsername(username: string): {
    tenantId: string;
    deviceId: string;
  } | null {
    // 用户名格式: {tenantId}_{deviceId}
    const parts = username.split('_');
    if (parts.length !== 2) {
      return null;
    }

    const tenantId = parts[0];
    const deviceId = parts[1];
    
    if (!tenantId || !deviceId) {
      return null;
    }
    
    return {
      tenantId,
      deviceId
    };
  }

  /**
   * 解析主题获取设备信息
   */
  private parseTopic(topic: string): {
    tenantId: string;
    deviceType: string;
    deviceId: string;
    channel: string;
    subchannel?: string;
  } | null {
    // 主题格式: iot/{tenantId}/{deviceType}/{deviceId}/{channel}/{subchannel?}
    const topicRegex = /^iot\/([^\/]+)\/([^\/]+)\/([^\/]+)\/([^\/]+)(?:\/([^\/]+))?$/;
    const match = topic.match(topicRegex);
    
    if (!match) {
      return null;
    }

    const [, tenantId, deviceType, deviceId, channel, subchannel] = match;
    
    if (!tenantId || !deviceType || !deviceId || !channel) {
      return null;
    }
    
    return {
      tenantId,
      deviceType,
      deviceId,
      channel,
      ...(subchannel && { subchannel })
    };
  }

  /**
   * 验证主题权限
   */
  private async validateTopicPermission(
    tenantId: string,
    deviceType: string,
    deviceId: string,
    topic: string,
    action: 'publish' | 'subscribe'
  ): Promise<boolean> {
    try {
      // 获取策略解析器
      const resolver = await this.policyRegistry.getOrCreateResolver(tenantId, deviceType);
      
      // 解析主题信息
      const topicInfo = this.parseTopic(topic);
      if (!topicInfo) {
        return false;
      }

      // 验证主题是否属于该设备
      if (topicInfo.tenantId !== tenantId || 
          topicInfo.deviceType !== deviceType || 
          topicInfo.deviceId !== deviceId) {
        return false;
      }

      // 获取ACL权限
      const mockRequest = {
        deviceId,
        deviceType,
        mac: '',
        firmware: { current: '1.0.0', build: '001', minRequired: '1.0.0', channel: 'stable' as const },
        hardware: { version: 'v1.0', serial: 'HW123' },
        capabilities: [],
        tenantId,
        timestamp: Date.now()
      };

      const policy = await resolver.resolvePolicy(mockRequest, tenantId);
      
      // 检查权限
      if (action === 'publish') {
        return policy.acl.publish.some(pattern => this.matchTopicPattern(topic, pattern));
      } else {
        return policy.acl.subscribe.some(pattern => this.matchTopicPattern(topic, pattern));
      }
    } catch (error) {
      console.error('Failed to validate topic permission:', error);
      return false;
    }
  }

  /**
   * 匹配主题模式
   */
  private matchTopicPattern(topic: string, pattern: string): boolean {
    // 处理通配符模式
    if (pattern.includes('+')) {
      const regexPattern = pattern.replace(/\+/g, '[^/]+').replace(/#/g, '.*');
      const regex = new RegExp(`^${regexPattern}$`);
      return regex.test(topic);
    }
    
    // 精确匹配
    return topic === pattern;
  }

  /**
   * 处理ACL鉴权请求
   */
  async handleAclRequest(request: EmqxAclRequest): Promise<EmqxAclResponse> {
    try {
      // 解析客户端信息
      const clientInfo = this.parseClientId(request.clientid);
      const userInfo = this.parseUsername(request.username);
      
      if (!clientInfo || !userInfo) {
        return { result: 'deny', reason: 'Invalid client ID or username format' };
      }

      // 验证客户端ID和用户名是否匹配
      if (clientInfo.tenantId !== userInfo.tenantId || 
          clientInfo.deviceId !== userInfo.deviceId) {
        return { result: 'deny', reason: 'Client ID and username mismatch' };
      }

      // 解析主题信息
      const topicInfo = this.parseTopic(request.topic);
      if (!topicInfo) {
        return { result: 'deny', reason: 'Invalid topic format' };
      }

      // 验证租户是否匹配
      if (topicInfo.tenantId !== clientInfo.tenantId) {
        return { result: 'deny', reason: 'Cross-tenant access denied' };
      }

      // 验证设备是否匹配
      if (topicInfo.deviceId !== clientInfo.deviceId) {
        return { result: 'deny', reason: 'Device ID mismatch' };
      }

      // 验证主题权限
      const hasPermission = await this.validateTopicPermission(
        clientInfo.tenantId,
        topicInfo.deviceType,
        clientInfo.deviceId,
        request.topic,
        request.action
      );

      if (!hasPermission) {
        return { result: 'deny', reason: 'Insufficient permissions for topic' };
      }

      return { result: 'allow' };
    } catch (error) {
      console.error('ACL validation error:', error);
      return { result: 'deny', reason: 'Internal server error' };
    }
  }
}

/**
 * 注册EMQX ACL路由
 */
export async function registerEmqxAclRoutes(fastify: FastifyInstance) {
  const aclService = new EmqxAclService();

  // EMQX HTTP ACL鉴权接口
  fastify.post('/emqx/acl', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const aclRequest = request.body as EmqxAclRequest;
      const response = await aclService.handleAclRequest(aclRequest);
      
      reply.code(200).send(response);
    } catch (error) {
      console.error('EMQX ACL request error:', error);
      reply.code(500).send({ result: 'deny', reason: 'Internal server error' });
    }
  });

  // EMQX认证接口（可选）
  fastify.post('/emqx/auth', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      // TODO: 实现认证逻辑
      // 目前简单返回允许
      return reply.code(200).send({ result: 'allow' });
    } catch (error) {
      console.error('EMQX auth request error:', error);
      return reply.code(500).send({ result: 'deny', reason: 'Internal server error' });
    }
  });

  // ACL策略查询接口（用于调试）
  fastify.get('/emqx/acl/policy/:tenantId/:deviceType/:deviceId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { tenantId, deviceType, deviceId } = request.params as {
        tenantId: string;
        deviceType: string;
        deviceId: string;
      };

      const resolver = await aclService['policyRegistry'].getOrCreateResolver(tenantId, deviceType);
      const mockRequest = {
        deviceId,
        deviceType,
        mac: '',
        firmware: { current: '1.0.0', build: '001', minRequired: '1.0.0', channel: 'stable' as const },
        hardware: { version: 'v1.0', serial: 'HW123' },
        capabilities: [],
        tenantId,
        timestamp: Date.now()
      };

      const policy = await resolver.resolvePolicy(mockRequest, tenantId);
      
      reply.code(200).send({
        topics: policy.topics,
        acl: policy.acl,
        qosRetainPolicy: policy.qosRetainPolicy
      });
    } catch (error) {
      console.error('ACL policy query error:', error);
      reply.code(500).send({ error: 'Failed to query ACL policy' });
    }
  });

  console.log('EMQX ACL routes registered');
}
