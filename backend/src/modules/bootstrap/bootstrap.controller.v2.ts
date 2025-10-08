/**
 * 重构后的引导控制器
 * 
 * 职责边界清晰：
 * - 只负责HTTP输入输出协调
 * - 不处理业务逻辑
 * - 统一错误处理
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { BootstrapService } from './bootstrap.service';
import { BootstrapValidator } from './validators/bootstrap.validator.v2';
import { ErrorHandler, ErrorFactory } from '@/core/errors/app-error';
import { getTraceId, createLogContext, LogFormatter } from '@/core/utils/trace-id';

/**
 * 扩展的Fastify请求类型
 */
interface BootstrapRequest extends FastifyRequest {
  tenant?: {
    id: string;
    name?: string;
  };
}

/**
 * 重构后的引导控制器
 */
export class BootstrapController {
  private readonly bootstrapService: BootstrapService;

  constructor() {
    this.bootstrapService = new BootstrapService({
      defaultPasswordExpiryHours: 24,
      defaultSessionExpiryHours: 168, // 7天
      defaultKeepaliveSeconds: 60
    });
  }

  /**
   * 处理设备引导请求
   * 
   * 职责：
   * 1. 获取追踪ID
   * 2. 验证请求结构
   * 3. 调用业务服务
   * 4. 统一错误处理
   * 5. 返回HTTP响应
   */
  async handleBootstrap(
    request: BootstrapRequest,
    reply: FastifyReply
  ): Promise<void> {
    const traceId = getTraceId(request);
    const logContext = createLogContext(request);

    try {
      // 1. 验证租户信息
      if (!request.tenant?.id) {
        throw ErrorFactory.tenantError('Tenant not resolved', { traceId });
      }

      // 2. 验证请求结构（宽松模式）
      const validationResult = BootstrapValidator.validateBootstrapRequest(
        request.body,
        { strict: false, allowMissingOptional: true }
      );

      if (!validationResult.isValid) {
        // 记录验证错误
        console.error(LogFormatter.format('Validation failed', logContext, {
          errors: validationResult.errors.map(e => e.message),
          warnings: validationResult.warnings
        }));
        
        throw validationResult.errors[0]; // 抛出第一个错误
      }

      // 3. 记录警告（如果有）
      if (validationResult.warnings.length > 0) {
        console.warn(LogFormatter.format('Validation warnings', logContext, {
          warnings: validationResult.warnings
        }));
      }

      const bootstrapRequest = validationResult.data!;

      // 4. 调用业务服务
      const bootstrapEnvelope = await this.bootstrapService.processBootstrapRequest(
        bootstrapRequest,
        request.tenant.id
      );

      // 5. 检查业务处理结果
      if (bootstrapEnvelope.code !== 200) {
        throw ErrorFactory.businessError(
          'BOOTSTRAP_FAILED',
          bootstrapEnvelope.message,
          { 
            code: bootstrapEnvelope.code,
            details: bootstrapEnvelope.errorDetails,
            traceId 
          }
        );
      }

      // 6. 返回成功响应
      const response = {
        success: true,
        data: bootstrapEnvelope.data,
        message: bootstrapEnvelope.message,
        timestamp: bootstrapEnvelope.timestamp
      };

      reply.header('X-Trace-ID', traceId);
      reply.status(200).send(response);

      // 7. 记录成功日志
      console.info(LogFormatter.format('Bootstrap completed successfully', logContext, {
        deviceId: bootstrapRequest.deviceId,
        processingTime: Date.now() - bootstrapRequest.timestamp
      }));

    } catch (error) {
      // 统一错误处理
      await this.handleError(error, request, reply, traceId);
    }
  }

  /**
   * 处理设备配置刷新请求
   */
  async handleRefreshConfig(
    request: BootstrapRequest,
    reply: FastifyReply
  ): Promise<void> {
    const traceId = getTraceId(request);

    try {
      if (!request.tenant?.id) {
        throw ErrorFactory.tenantError('Tenant not resolved', { traceId });
      }

      const { deviceId } = request.params as { deviceId: string };
      if (!deviceId) {
        throw ErrorFactory.validationError('Device ID is required');
      }

      // 暂时返回简单响应，等待Service层完善
      reply.header('X-Trace-ID', traceId);
      reply.status(200).send({
        success: true,
        data: { message: 'Refresh config not implemented yet' },
        message: 'Refresh config completed',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      await this.handleError(error, request, reply, traceId);
    }
  }

  /**
   * 处理设备配置查询请求
   */
  async handleGetDeviceConfig(
    request: BootstrapRequest,
    reply: FastifyReply
  ): Promise<void> {
    const traceId = getTraceId(request);

    try {
      if (!request.tenant?.id) {
        throw ErrorFactory.tenantError('Tenant not resolved', { traceId });
      }

      const { deviceId } = request.params as { deviceId: string };
      if (!deviceId) {
        throw ErrorFactory.validationError('Device ID is required');
      }

      // 暂时返回简单响应，等待Service层完善
      reply.header('X-Trace-ID', traceId);
      reply.status(200).send({
        success: true,
        data: { message: 'Get device config not implemented yet' },
        message: 'Device config retrieved successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      await this.handleError(error, request, reply, traceId);
    }
  }

  /**
   * 统一错误处理
   * 
   * 职责：
   * 1. 记录错误日志
   * 2. 格式化错误响应
   * 3. 返回适当的HTTP状态码
   */
  private async handleError(
    error: any,
    request: BootstrapRequest,
    reply: FastifyReply,
    traceId: string
  ): Promise<void> {
    const logContext = createLogContext(request, { traceId });

    // 记录错误日志
    console.error(LogFormatter.format('Request failed', logContext, {
      error: error.message || 'Unknown error',
      stack: error.stack,
      url: request.url,
      method: request.method
    }));

    // 格式化错误响应
    const errorResponse = ErrorHandler.formatErrorResponse(error);
    const statusCode = ErrorHandler.getStatusCode(error);

    // 添加追踪ID到响应
    reply.header('X-Trace-ID', traceId);
    
    // 返回错误响应
    reply.status(statusCode).send(errorResponse);
  }
}
