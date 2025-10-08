/**
 * 设备引导API控制器
 * 
 * 负责处理设备引导相关的HTTP请求，包括：
 * 1. 设备引导配置请求
 * 2. 设备配置刷新请求
 * 3. 设备状态查询请求
 * 
 * 设计原则：
 * 1. 请求验证：严格验证输入参数
 * 2. 错误处理：统一的错误响应格式
 * 3. 响应格式：标准化的JSON响应
 * 4. 日志记录：详细的操作日志
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { BootstrapService } from './bootstrap.service';
import { BootstrapValidator } from './validators/bootstrap.validator';
import { CacheService } from '@/infrastructure/cache/redis';
import { 
  DeviceBootstrapRequest,
  BootstrapResponseEnvelope
} from './types';

/**
 * 扩展的Fastify请求类型，包含租户信息
 */
interface BootstrapRequest extends FastifyRequest {
  tenant?: {
    id: string;
    name?: string;
  };
}

/**
 * 引导控制器响应类型
 */
interface ControllerResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

/**
 * 设备引导API控制器
 */
export class BootstrapController {
  private readonly bootstrapService: BootstrapService;
  private readonly cache: CacheService;

  constructor() {
    this.bootstrapService = new BootstrapService({
      defaultPasswordExpiryHours: 24,
      defaultSessionExpiryHours: 168, // 7天
      defaultKeepaliveSeconds: 60
    });
    this.cache = new CacheService();
  }

  /**
   * 处理设备引导请求
   * 
   * POST /api/config/bootstrap
   * 
   * @param request 包含设备信息的请求
   * @param reply Fastify响应对象
   */
  async handleBootstrap(
    request: BootstrapRequest,
    reply: FastifyReply
  ): Promise<void> {
    const startTime = Date.now();
    let tenantId: string | undefined;
    let deviceId: string | undefined;

    try {
      // 1. 验证租户信息
      const validatedTenantId = await this.validateTenant(request, reply);
      if (!validatedTenantId) return;
      tenantId = validatedTenantId;

      // 2. 验证请求体
      const validationResult = BootstrapValidator.validateBootstrapRequest(request.body);
      if (!validationResult.isValid) {
        await this.handleValidationError(reply, validationResult.errors, tenantId);
        return;
      }

      const bootstrapRequest = validationResult.data!;
      deviceId = bootstrapRequest.deviceId;

      // 3. 幂等性检查
      const idempotentResult = await this.checkIdempotency(request, bootstrapRequest, tenantId);
      if (idempotentResult) {
        await this.sendSuccessResponse(reply, idempotentResult);
        return;
      }

      // 4. 处理引导请求
      const bootstrapEnvelope = await this.bootstrapService.processBootstrapRequest(
        bootstrapRequest,
        tenantId
      );

      // 5. 记录操作日志
      const processingTime = Date.now() - startTime;
      this.logOperation(request, 'bootstrap', {
        deviceId,
        tenantId,
        processingTime,
        statusCode: bootstrapEnvelope.code
      });

      // 6. 返回响应
      await this.sendSuccessResponse(reply, bootstrapEnvelope);
      
    } catch (error) {
      await this.handleControllerError(error, request, reply, tenantId, deviceId, 'bootstrap');
    }
  }

  /**
   * 处理设备配置刷新请求
   * 
   * PUT /api/config/device/:deviceId/refresh
   * 
   * @param request 包含设备ID的请求
   * @param reply Fastify响应对象
   */
  async handleRefreshConfig(
    request: BootstrapRequest,
    reply: FastifyReply
  ): Promise<void> {
    let tenantId: string | undefined;
    let deviceId: string | undefined;

    try {
      // 1. 验证租户信息
      const validatedTenantId = await this.validateTenant(request, reply);
      if (!validatedTenantId) return;
      tenantId = validatedTenantId;

      // 2. 验证设备ID参数
      const params = request.params as { deviceId: string };
      if (!params.deviceId) {
        await this.handleValidationError(reply, ['Device ID is required'], tenantId);
        return;
      }
      deviceId = params.deviceId;

      // 3. 构建刷新请求（从现有设备信息）
      const refreshRequest: DeviceBootstrapRequest = {
        deviceId,
        mac: 'unknown', // 需要从数据库获取
        firmware: { current: 'unknown', build: 'unknown', minRequired: '1.0.0', channel: 'stable' },
        hardware: { version: 'unknown', serial: 'unknown' },
        capabilities: [],
        deviceType: 'unknown',
        tenantId,
        timestamp: Date.now()
      };

      // 4. 处理刷新请求
      const bootstrapEnvelope = await this.bootstrapService.processBootstrapRequest(
        refreshRequest,
        tenantId
      );

      // 5. 记录操作日志
      this.logOperation(request, 'refresh_config', { deviceId, tenantId });

      // 6. 返回响应
      await this.sendSuccessResponse(reply, bootstrapEnvelope);

    } catch (error) {
      await this.handleControllerError(error, request, reply, tenantId, deviceId, 'refresh_config');
    }
  }

  /**
   * 处理设备配置查询请求
   * 
   * GET /api/config/device/:deviceId
   * 
   * @param request 包含设备ID的请求
   * @param reply Fastify响应对象
   */
  async handleGetDeviceConfig(
    request: BootstrapRequest,
    reply: FastifyReply
  ): Promise<void> {
    let tenantId: string | undefined;
    let deviceId: string | undefined;

    try {
      // 1. 验证租户信息
      const validatedTenantId = await this.validateTenant(request, reply);
      if (!validatedTenantId) return;
      tenantId = validatedTenantId;

      // 2. 验证设备ID参数
      const params = request.params as { deviceId: string };
      if (!params.deviceId) {
        await this.handleValidationError(reply, ['Device ID is required'], tenantId);
        return;
      }
      deviceId = params.deviceId;

      // 3. 获取设备配置（从缓存或数据库）
      const deviceConfig = await this.getDeviceConfigFromCache(deviceId, tenantId);

      // 4. 记录操作日志
      this.logOperation(request, 'get_device_config', { deviceId, tenantId });

      // 5. 返回响应
      await this.sendSuccessResponse(reply, deviceConfig);

    } catch (error) {
      await this.handleControllerError(error, request, reply, tenantId, deviceId, 'get_device_config');
    }
  }

  // ==================== 公共方法 ====================

  /**
   * 验证租户信息
   */
  private async validateTenant(
    request: BootstrapRequest,
    reply: FastifyReply
  ): Promise<string | null> {
    const tenantId = request.tenant?.id;
    if (!tenantId) {
      const errorEnvelope = await this.bootstrapService.buildErrorEnvelope(
        new Error('Tenant not resolved'),
        'unknown',
        'unknown',
        'TENANT_NOT_RESOLVED'
      );
      await this.sendErrorResponse(reply, errorEnvelope.code, errorEnvelope.message || 'Tenant not resolved');
      return null;
    }
    return tenantId;
  }

  /**
   * 处理验证错误
   */
  private async handleValidationError(
    reply: FastifyReply,
    errors: string[],
    tenantId: string
  ): Promise<void> {
    const errorEnvelope = await this.bootstrapService.buildErrorEnvelope(
      new Error(`Validation failed: ${errors.join(', ')}`),
      'unknown',
      tenantId,
      'VALIDATION_ERROR'
    );
    await this.sendErrorResponse(reply, errorEnvelope.code, errorEnvelope.message || 'Validation failed');
  }

  /**
   * 统一控制器错误处理
   */
  private async handleControllerError(
    error: unknown,
    request: BootstrapRequest,
    reply: FastifyReply,
    tenantId: string | undefined,
    deviceId: string | undefined,
    action: string
  ): Promise<void> {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    
    this.logError(request, action, errorObj, { tenantId, deviceId });

    const errorEnvelope = await this.bootstrapService.buildErrorEnvelope(
      errorObj,
      deviceId || 'unknown',
      tenantId || 'unknown',
      'CONTROLLER_ERROR'
    );

    await this.sendErrorResponse(reply, errorEnvelope.code, errorEnvelope.message || 'Internal server error');
  }

  /**
   * 记录操作日志（ELK友好格式）
   */
  private logOperation(
    request: BootstrapRequest,
    action: string,
    context: Record<string, any>
  ): void {
    request.log.info({
      context: {
        tenantId: context['tenantId'],
        deviceId: context['deviceId'],
        action,
        ...context
      },
      msg: `Device ${action} completed successfully`
    });
  }

  /**
   * 记录错误日志（ELK友好格式）
   */
  private logError(
    request: BootstrapRequest,
    action: string,
    error: Error,
    context: Record<string, any>
  ): void {
    request.log.error({
      context: {
        tenantId: context['tenantId'],
        deviceId: context['deviceId'],
        action,
        error: error.message,
        stack: error.stack
      },
      msg: `Device ${action} failed: ${error.message}`
    });
  }

  /**
   * 实现幂等性检查
   */
  private async checkIdempotency(
    request: BootstrapRequest,
    bootstrapRequest: DeviceBootstrapRequest,
    tenantId: string
  ): Promise<BootstrapResponseEnvelope | null> {
    const messageId = bootstrapRequest.messageId || request.headers['x-message-id'] as string;
    
    if (!messageId) {
      return null; // 没有消息ID，无法进行幂等性检查
    }

    try {
      const cacheKey = `idempotency:${tenantId}:${bootstrapRequest.deviceId}:${messageId}`;
      const cached = await this.cache.get<BootstrapResponseEnvelope>(cacheKey);
      
      if (cached && this.isEnvelopeValid(cached)) {
        this.logOperation(request, 'idempotency_hit', {
          tenantId,
          deviceId: bootstrapRequest.deviceId,
          messageId
        });
        return cached;
      }
      
      return null;
    } catch (error) {
      request.log.warn({
        context: {
          tenantId,
          deviceId: bootstrapRequest.deviceId,
          messageId,
          error: error instanceof Error ? error.message : String(error)
        },
        msg: 'Idempotency check failed, continuing with normal processing'
      });
      return null;
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
   * 从缓存获取设备配置
   */
  private async getDeviceConfigFromCache(deviceId: string, tenantId: string): Promise<any> {
    try {
      const cacheKey = `bootstrap:${tenantId}:${deviceId}`;
      const cached = await this.cache.get<any>(cacheKey);
      
      if (cached) {
        return cached;
      }
      
      // 如果缓存中没有，返回基础配置
      return {
        deviceId,
        tenantId,
        lastBootstrap: new Date().toISOString(),
        status: 'active'
      };
    } catch (error) {
      // 缓存失败时返回基础配置
      return {
        deviceId,
        tenantId,
        lastBootstrap: new Date().toISOString(),
        status: 'active'
      };
    }
  }

  /**
   * 发送成功响应
   */
  private async sendSuccessResponse<T>(
    reply: FastifyReply,
    data: T,
    message: string = 'Success'
  ): Promise<void> {
    const response: ControllerResponse<T> = {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString()
    };

    await reply.status(200).send(response);
  }

  /**
   * 发送错误响应
   */
  private async sendErrorResponse(
    reply: FastifyReply,
    statusCode: number,
    error: string
  ): Promise<void> {
    const response: ControllerResponse = {
      success: false,
      error,
      timestamp: new Date().toISOString()
    };

    await reply.status(statusCode).send(response);
  }

}
