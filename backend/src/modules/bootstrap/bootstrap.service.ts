/**
 * 设备引导服务核心逻辑
 * 
 * 负责处理设备引导请求，生成动态配置，管理设备生命周期
 * 
 * 设计原则：
 * 1. 单一职责：专注于引导配置生成
 * 2. 依赖注入：通过构造函数注入依赖
 * 3. 错误处理：统一的错误处理机制
 * 4. 可测试性：纯函数设计，便于单元测试
 */

import { env } from '@/env';
import { getPrismaClient } from '@/infrastructure/db/prisma';
import { CacheService } from '@/infrastructure/cache/redis';
import { MqttPolicyRegistry } from '@/infrastructure/config/mqtt-policy.registry';
// import { MqttPolicyResolver } from './strategies/mqtt-policy-resolver'; // 暂时未使用
// import { AdapterFactory } from '@/core/adapters/factory';
import { 
  DeviceBootstrapRequest, 
  DeviceBootstrapResponse, 
  BootstrapResponseEnvelope,
  BootstrapValidationResult,
  MqttConfig,
  OtaConfig,
  ShadowDesired,
  Policies
} from './types';

/**
 * 引导服务配置选项
 */
export interface BootstrapServiceOptions {
  /** 默认密码有效期（小时） */
  defaultPasswordExpiryHours?: number;
  /** 默认会话过期时间（小时） */
  defaultSessionExpiryHours?: number;
  /** 默认心跳间隔（秒） */
  defaultKeepaliveSeconds?: number;
}

/**
 * 设备引导服务
 * 
 * 核心功能：
 * 1. 验证设备身份和请求合法性
 * 2. 生成动态MQTT凭证和配置
 * 3. 决策OTA升级策略
 * 4. 生成设备策略和影子配置
 * 5. 计算响应签名确保数据完整性
 */
export class BootstrapService {
  private readonly prisma = getPrismaClient();
  private readonly cache = new CacheService();
  private readonly policyRegistry: MqttPolicyRegistry;
  private readonly options: Required<BootstrapServiceOptions>;

  constructor(options: BootstrapServiceOptions = {}) {
    this.options = {
      defaultPasswordExpiryHours: options.defaultPasswordExpiryHours ?? 24,
      defaultSessionExpiryHours: options.defaultSessionExpiryHours ?? 168, // 7天
      defaultKeepaliveSeconds: options.defaultKeepaliveSeconds ?? 60,
    };
    
    // 初始化策略注册器
    this.policyRegistry = MqttPolicyRegistry.getInstance();
  }

  /**
   * 初始化Bootstrap服务
   * 预热策略注册器，加载常用租户和设备类型
   */
  async initialize(): Promise<void> {
    try {
      await this.policyRegistry.initialize();
      
      // 预热常用租户
      const commonTenants = ['default', 'demo', 'test'];
      await this.policyRegistry.warmup(commonTenants);
      
      console.log('BootstrapService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize BootstrapService:', error);
      throw error;
    }
  }

  /**
   * 处理设备引导请求
   * 
   * @param request 设备引导请求
   * @param tenantId 租户ID（从中间件获取）
   * @returns 引导响应封装
   */
  async processBootstrapRequest(
    request: DeviceBootstrapRequest, 
    tenantId: string
  ): Promise<BootstrapResponseEnvelope> {
    try {
      // 1. 幂等性检查：检查是否已有有效引导记录
      if (request.messageId) {
        const existingRecord = await this.checkIdempotency(request.messageId, request.deviceId, tenantId);
        if (existingRecord) {
          return existingRecord;
        }
      }

      // 2. 验证请求合法性（包括签名验证）
      const validationResult = await this.validateBootstrapRequest(request, tenantId);
      if (!validationResult.isValid) {
        return await this.buildErrorEnvelope(
          new Error(`Bootstrap request validation failed: ${validationResult.errors.join(', ')}`),
          request.deviceId,
          tenantId,
          'VALIDATION_ERROR'
        );
      }

      // 3. 获取或创建设备记录
      const device = await this.ensureDeviceExists(request, tenantId);

      // 4. 生成MQTT配置
      const mqttConfig = await this.generateMqttConfig(device.id, tenantId, request);

      // 5. 生成OTA配置
      const otaConfig = await this.generateOtaConfig(device.id, tenantId, request);

      // 6. 生成影子期望状态
      const shadowDesired = await this.generateShadowDesired(device.id, tenantId, request);

      // 7. 生成策略配置
      const policies = await this.generatePolicies(tenantId, request);

      // 8. 构建响应数据
      const responseData = await this.buildBootstrapResponse(
        device.id,
        tenantId,
        request,
        mqttConfig,
        otaConfig,
        shadowDesired,
        policies
      );

      // 9. 构建响应封装
      const envelope = await this.buildResponseEnvelope(responseData, device.id, tenantId);

      // 10. 缓存引导记录和幂等性记录
      await this.cacheBootstrapRecord(device.id, tenantId, envelope);
      if (request.messageId) {
        await this.cacheIdempotencyRecord(request.messageId, request.deviceId, tenantId, envelope);
      }

      return envelope;
    } catch (error) {
      console.error('Bootstrap request processing failed:', error);
      return await this.buildErrorEnvelope(
        error instanceof Error ? error : new Error(String(error)),
        request.deviceId,
        tenantId,
        'BOOTSTRAP_ERROR'
      );
    }
  }

  /**
   * 验证引导请求的合法性
   */
  private async validateBootstrapRequest(
    request: DeviceBootstrapRequest,
    tenantId: string
  ): Promise<BootstrapValidationResult> {
    const errors: string[] = [];

    // 验证必要字段
    if (!request.deviceId || request.deviceId.trim().length === 0) {
      errors.push('Device ID is required');
    }

    if (!request.mac || request.mac.trim().length === 0) {
      errors.push('MAC address is required');
    }

    if (!request.deviceType || request.deviceType.trim().length === 0) {
      errors.push('Device type is required');
    }

    if (!request.firmware?.current) {
      errors.push('Firmware version is required');
    }

    if (!request.firmware?.build) {
      errors.push('Firmware build number is required');
    }

    // 验证请求签名（如果提供）
    if (request.signature) {
      const isValidSignature = await this.validateRequestSignature(request, tenantId);
      if (!isValidSignature) {
        errors.push('Invalid request signature');
      }
    }

    // 验证设备是否属于指定租户
    if (tenantId) {
      const device = await this.prisma.device.findFirst({
        where: { 
          id: request.deviceId,
          tenantId: tenantId
        }
      });

      if (!device) {
        // 如果是新设备，需要进一步验证是否允许自动注册
        const tenant = await this.prisma.tenant.findUnique({
          where: { id: tenantId }
        });

        if (!tenant) {
          errors.push('Invalid tenant ID');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      deviceInfo: errors.length === 0 ? request : undefined as any
    };
  }

  /**
   * 验证请求签名（公共方法）
   * 
   * @param request 引导请求
   * @param tenantId 租户ID
   * @returns 签名验证结果
   */
  async verifySignature(request: DeviceBootstrapRequest, tenantId: string): Promise<boolean> {
    return this.validateRequestSignature(request, tenantId);
  }

  /**
   * 验证请求签名（内部方法）
   */
  private async validateRequestSignature(
    request: DeviceBootstrapRequest,
    tenantId: string
  ): Promise<boolean> {
    try {
      // 获取设备密钥
      const deviceSecret = await this.getDeviceSecret(request.deviceId, tenantId);
      if (!deviceSecret) {
        return false;
      }

      // 构建签名载荷（排除signature字段）
      const { signature, ...payload } = request;
      const payloadString = JSON.stringify(payload, Object.keys(payload).sort());

      // 生成期望签名
      const crypto = await import('crypto');
      const expectedSignature = crypto.createHmac('sha256', deviceSecret)
        .update(payloadString)
        .digest('hex');

      // 比较签名
      return crypto.timingSafeEqual(
        Buffer.from(signature || '', 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );
    } catch (error) {
      console.error('Request signature validation failed:', error);
      return false;
    }
  }

  /**
   * 获取设备密钥
   */
  private async getDeviceSecret(deviceId: string, tenantId: string): Promise<string | null> {
    try {
      // 这里应该从安全的存储中获取设备密钥
      // 示例实现：使用设备ID和租户ID生成确定性密钥
      const crypto = await import('crypto');
      const baseSecret = env.JWT_SECRET;
      
      return crypto.createHmac('sha256', baseSecret)
        .update(`${tenantId}:${deviceId}`)
        .digest('hex');
    } catch (error) {
      console.error('Failed to get device secret:', error);
      return null;
    }
  }

  /**
   * 检查幂等性
   */
  private async checkIdempotency(
    messageId: string,
    deviceId: string,
    tenantId: string
  ): Promise<BootstrapResponseEnvelope | null> {
    try {
      const cacheKey = `idempotency:${tenantId}:${deviceId}:${messageId}`;
      const cached = await this.cache.get<BootstrapResponseEnvelope>(cacheKey);
      
      if (cached && this.isEnvelopeValid(cached)) {
        return cached;
      }
      
      return null;
    } catch (error) {
      console.error('Idempotency check failed:', error);
      return null;
    }
  }

  /**
   * 缓存幂等性记录
   */
  private async cacheIdempotencyRecord(
    messageId: string,
    deviceId: string,
    tenantId: string,
    envelope: BootstrapResponseEnvelope
  ): Promise<void> {
    try {
      const cacheKey = `idempotency:${tenantId}:${deviceId}:${messageId}`;
      const ttl = 3600; // 1小时TTL
      
      await this.cache.set(cacheKey, envelope, ttl);
    } catch (error) {
      console.error('Failed to cache idempotency record:', error);
    }
  }

  /**
   * 检查响应封装是否有效
   */
  private isEnvelopeValid(envelope: BootstrapResponseEnvelope): boolean {
    return envelope.code === 200 && 
           envelope.data && 
           envelope.data.cfg.expiresAt > Date.now();
  }

  /**
   * 确保设备记录存在
   */
  private async ensureDeviceExists(
    request: DeviceBootstrapRequest,
    tenantId: string
  ) {
    let device = await this.prisma.device.findUnique({
      where: { id: request.deviceId }
    });

    if (!device) {
      // 创建新设备记录
      device = await this.prisma.device.create({
        data: {
          id: request.deviceId,
          tenantId,
          name: `${request.deviceType}-${request.mac.slice(-6)}`,
          type: request.deviceType,
          status: 'offline',
          // TODO: 添加新字段支持，需要先运行数据库迁移
          // mac: request.mac,
          // firmware: request.firmware.current,
          // firmwareBuild: request.firmware.build,
          // hardware: request.hardware.version,
          // hardwareSerial: request.hardware.serial,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    } else {
      // 更新现有设备信息
      device = await this.prisma.device.update({
        where: { id: request.deviceId },
        data: {
          lastSeen: new Date(),
          // TODO: 添加新字段支持，需要先运行数据库迁移
          // mac: request.mac,
          // firmware: request.firmware.current,
          // firmwareBuild: request.firmware.build,
          // hardware: request.hardware.version,
          // hardwareSerial: request.hardware.serial,
          updatedAt: new Date()
        }
      });
    }

    return device;
  }

  /**
   * 生成MQTT配置（使用新的策略系统）
   */
  private async generateMqttConfig(
    deviceId: string,
    tenantId: string,
    request: DeviceBootstrapRequest
  ): Promise<MqttConfig> {
    try {
      // 获取或创建策略解析器
      const resolver = await this.policyRegistry.getOrCreateResolver(tenantId, request.deviceType);
      
      // 解析MQTT策略
      const policy = await resolver.resolvePolicy(request, tenantId);
      
      const now = Date.now();
      const passwordExpiresAt = now + (this.options.defaultPasswordExpiryHours * 60 * 60 * 1000);
      const sessionExpiry = this.options.defaultSessionExpiryHours * 60 * 60;

      // 生成动态凭证
      const username = `${tenantId}_${deviceId}`;
      const password = await this.generateDynamicPassword(deviceId, tenantId, passwordExpiresAt);
      const clientId = `${tenantId}_${deviceId}_${now}`;

      return {
        brokers: [
          { url: env.MQTT_BROKER_URL, priority: 1 }
        ],
        clientId,
        username,
        password,
        passwordExpiresAt,
        keepalive: this.options.defaultKeepaliveSeconds,
        cleanStart: true, // 低功耗设备使用Clean Start
        sessionExpiry,
        tls: {
          enabled: env.NODE_ENV === 'production',
          caCertFingerprint: env.NODE_ENV === 'production' ? (await this.getCaCertFingerprint() || '') : ''
        },
        lwt: {
          topic: policy.topics.statusPub,
          qos: 1,
          retain: true,
          payload: {
            ts: new Date().toISOString(),
            online: false,
            reason: 'connection_lost'
          }
        },
        topics: policy.topics,
        qosRetainPolicy: policy.qosRetainPolicy,
        acl: policy.acl,
        backoff: {
          baseMs: 1000,
          maxMs: 60000,
          jitter: true
        }
      };
    } catch (error) {
      console.error('Failed to generate MQTT config with new policy system, falling back to legacy method:', error);
      return this.generateLegacyMqttConfig(deviceId, tenantId, request);
    }
  }

  /**
   * 生成MQTT配置（传统方法，作为后备）
   */
  private async generateLegacyMqttConfig(
    deviceId: string,
    tenantId: string,
    request: DeviceBootstrapRequest
  ): Promise<MqttConfig> {
    const now = Date.now();
    const passwordExpiresAt = now + (this.options.defaultPasswordExpiryHours * 60 * 60 * 1000);
    const sessionExpiry = this.options.defaultSessionExpiryHours * 60 * 60;

    // 生成动态凭证
    const username = `${tenantId}_${deviceId}`;
    const password = await this.generateDynamicPassword(deviceId, tenantId, passwordExpiresAt);
    const clientId = `${tenantId}_${deviceId}_${now}`;

    // 生成主题配置
    const topicPrefix = `iot/${tenantId}/${request.deviceType}/${deviceId}`;
    
    const topics = {
      telemetryPub: `${topicPrefix}/telemetry`,
      statusPub: `${topicPrefix}/status`,
      eventPub: `${topicPrefix}/event`,
      cmdSub: `${topicPrefix}/cmd`,
      cmdresPub: `${topicPrefix}/cmdres`,
      shadowDesiredSub: `${topicPrefix}/shadow/desired`,
      shadowReportedPub: `${topicPrefix}/shadow/reported`,
      cfgSub: `${topicPrefix}/cfg`,
      otaProgressPub: `${topicPrefix}/ota/progress`
    };

    // 生成ACL
    const acl = {
      publish: [
        topics.telemetryPub,
        topics.statusPub,
        topics.eventPub,
        topics.cmdresPub,
        topics.shadowReportedPub,
        topics.otaProgressPub
      ],
      subscribe: [
        topics.cmdSub,
        topics.shadowDesiredSub,
        topics.cfgSub
      ]
    };

    // 生成QoS和Retain策略
    const qosRetainPolicy = [
      { topic: topics.telemetryPub, qos: 1, retain: false },
      { topic: topics.statusPub, qos: 1, retain: true },
      { topic: topics.eventPub, qos: 1, retain: false },
      { topic: topics.cmdSub, qos: 1, retain: false },
      { topic: topics.shadowDesiredSub, qos: 1, retain: true },
      { topic: topics.cfgSub, qos: 1, retain: true }
    ];

    return {
      brokers: [
        { url: env.MQTT_BROKER_URL, priority: 1 }
      ],
      clientId,
      username,
      password,
      passwordExpiresAt,
      keepalive: this.options.defaultKeepaliveSeconds,
      cleanStart: true, // 低功耗设备使用Clean Start
      sessionExpiry,
      tls: {
        enabled: env.NODE_ENV === 'production',
        caCertFingerprint: env.NODE_ENV === 'production' ? (await this.getCaCertFingerprint() || '') : ''
      },
      lwt: {
        topic: topics.statusPub,
        qos: 1,
        retain: true,
        payload: {
          ts: new Date().toISOString(),
          online: false,
          reason: 'connection_lost'
        }
      },
      topics,
      qosRetainPolicy,
      acl,
      backoff: {
        baseMs: 1000,
        maxMs: 30000,
        jitter: true
      }
    };
  }

  /**
   * 生成OTA配置
   */
  private async generateOtaConfig(
    _deviceId: string,
    _tenantId: string,
    request: DeviceBootstrapRequest
  ): Promise<OtaConfig> {
    // 根据设备固件通道和租户策略决策OTA
    const currentChannel = request.firmware.channel || 'stable';
    
    // 这里应该根据租户策略和设备信息决策OTA
    // 目前返回基础配置，后续可以在ota.strategy.ts中实现复杂逻辑
    
    // 示例：根据通道决定OTA策略
    let available = false;
    if (currentChannel === 'beta' || currentChannel === 'dev') {
      // 测试通道设备可以接收更频繁的OTA
      available = true;
    }
    
    return {
      available,
      retry: {
        baseMs: 5000,
        maxMs: 60000
      }
    };
  }

  /**
   * 生成影子期望状态
   */
  private async generateShadowDesired(
    _deviceId: string,
    _tenantId: string,
    _request: DeviceBootstrapRequest
  ): Promise<ShadowDesired> {
    // 根据设备类型和租户策略生成默认配置
    return {
      reporting: {
        heartbeatMs: 60000 // 1分钟心跳
      },
      sensors: {
        samplingMs: 30000 // 30秒采样
      },
      thresholds: {
        voltage: { min: 3.0, max: 5.0 },
        current: { min: 0, max: 2.0 }
      },
      features: {
        alarmEnabled: true,
        autoRebootDays: 7
      }
    };
  }

  /**
   * 生成策略配置
   */
  private async generatePolicies(
    _tenantId: string,
    _request: DeviceBootstrapRequest
  ): Promise<Policies> {
    return {
      ingestLimits: {
        telemetryQps: 10,
        statusQps: 1
      },
      retention: {
        telemetryDays: 30,
        statusDays: 7,
        eventsDays: 14
      }
    };
  }

  /**
   * 构建引导响应数据
   */
  private async buildBootstrapResponse(
    deviceId: string,
    tenantId: string,
    request: DeviceBootstrapRequest,
    mqttConfig: MqttConfig,
    otaConfig: OtaConfig,
    shadowDesired: ShadowDesired,
    policies: Policies
  ): Promise<DeviceBootstrapResponse> {
    const now = Date.now();
    
    const response: DeviceBootstrapResponse = {
      cfg: {
        ver: '1.0.0',
        issuedAt: now,
        expiresAt: now + (24 * 60 * 60 * 1000), // 24小时后过期
        tenant: tenantId,
        device: {
          id: deviceId,
          type: request.deviceType,
          uniqueId: request.mac,
          fw: request.firmware,
          hw: request.hardware.version,
          capabilities: request.capabilities.map(c => c.name)
        }
      },
      mqtt: mqttConfig,
      shadowDesired,
      ota: otaConfig,
      policies,
      serverTime: {
        timestamp: now,
        timezoneOffset: new Date().getTimezoneOffset() * 60
      },
      websocket: {
        enabled: true,
        url: `${env.PUBLIC_ORIGIN}${env.WS_PATH}`,
        reconnectMs: 5000,
        heartbeatMs: 30000,
        timeoutMs: 60000
      }
    };

    return response;
  }

  /**
   * 生成动态密码
   */
  private async generateDynamicPassword(
    deviceId: string,
    tenantId: string,
    expiresAt: number
  ): Promise<string> {
    // 使用设备密钥和过期时间生成动态密码
    // 这里简化实现，生产环境应该使用更安全的算法
    const crypto = await import('crypto');
    const payload = `${deviceId}:${tenantId}:${expiresAt}`;
    const secret = env.JWT_SECRET;
    
    return crypto.createHmac('sha256', secret)
      .update(payload)
      .digest('hex')
      .substring(0, 32);
  }

  /**
   * 构建响应封装层
   */
  private async buildResponseEnvelope(
    responseData: DeviceBootstrapResponse,
    deviceId: string,
    tenantId: string
  ): Promise<BootstrapResponseEnvelope> {
    const now = Date.now();
    
    // 生成响应签名
    const signature = await this.generateResponseSignature(responseData, deviceId, tenantId);
    
    return {
      code: 200,
      message: 'Bootstrap configuration generated successfully',
      timestamp: now,
      signature,
      data: responseData
    };
  }

  /**
   * 生成响应签名
   */
  private async generateResponseSignature(
    responseData: DeviceBootstrapResponse,
    deviceId: string,
    tenantId: string
  ): Promise<string> {
    try {
      const crypto = await import('crypto');
      const payload = JSON.stringify(responseData);
      
      // 使用设备特定密钥而非全局JWT_SECRET
      const deviceSecret = await this.getDeviceSecret(deviceId, tenantId);
      if (!deviceSecret) {
        throw new Error('Failed to get device secret for signature generation');
      }
      
      return crypto.createHmac('sha256', deviceSecret)
        .update(`${deviceId}:${tenantId}:${payload}`)
        .digest('hex');
    } catch (error) {
      console.error('Response signature generation failed:', error);
      // 如果设备密钥获取失败，使用全局密钥作为fallback（但记录警告）
      console.warn('Using global JWT_SECRET as fallback for response signature');
      const crypto = await import('crypto');
      const payload = JSON.stringify(responseData);
      const secret = env.JWT_SECRET;
      
      return crypto.createHmac('sha256', secret)
        .update(`${deviceId}:${tenantId}:${payload}`)
        .digest('hex');
    }
  }

  /**
   * 获取CA证书指纹
   */
  private async getCaCertFingerprint(): Promise<string> {
    // 这里应该从配置或证书文件中读取CA证书指纹
    // 暂时返回空字符串
    return '';
  }

  /**
   * 缓存引导记录
   */
  private async cacheBootstrapRecord(
    deviceId: string,
    tenantId: string,
    envelope: BootstrapResponseEnvelope
  ): Promise<void> {
    const cacheKey = `bootstrap:${tenantId}:${deviceId}`;
    const ttl = Math.floor((envelope.data.cfg.expiresAt - Date.now()) / 1000);
    
    await this.cache.set(cacheKey, envelope, ttl);
  }

  /**
   * 构建错误响应封装
   */
  async buildErrorEnvelope(
    error: Error,
    deviceId: string,
    tenantId: string,
    errorCode: string = 'BOOTSTRAP_ERROR'
  ): Promise<BootstrapResponseEnvelope> {
    const now = Date.now();
    
    return {
      code: 500,
      message: error.message,
      timestamp: now,
      signature: '', // 错误响应不需要签名
      errorCode,
      errorDetails: {
        deviceId,
        tenantId,
        stack: error.stack
      },
      data: {} as DeviceBootstrapResponse // 错误时返回空数据
    };
  }
}
