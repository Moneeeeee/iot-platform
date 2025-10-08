/**
 * 追踪ID生成器
 * 
 * 为每次请求生成唯一的追踪ID，便于跨模块调试
 */

import { randomBytes } from 'crypto';

/**
 * 生成追踪ID
 */
export function generateTraceId(): string {
  return randomBytes(8).toString('hex');
}

/**
 * 从请求中获取或生成追踪ID
 */
export function getTraceId(request: any): string {
  // 优先从请求头获取
  const headerTraceId = request.headers['x-trace-id'] || request.headers['x-request-id'];
  if (headerTraceId) {
    return String(headerTraceId);
  }

  // 从消息ID获取（如果有）
  if (request.body?.messageId) {
    return request.body.messageId;
  }

  // 生成新的追踪ID
  return generateTraceId();
}

/**
 * 日志上下文接口
 */
export interface LogContext {
  traceId: string;
  tenantId?: string;
  deviceId?: string;
  userId?: string;
}

/**
 * 创建日志上下文
 */
export function createLogContext(request: any, additional?: Partial<LogContext>): LogContext {
  return {
    traceId: getTraceId(request),
    tenantId: request.tenant?.id,
    deviceId: request.body?.deviceId,
    userId: request.user?.id,
    ...additional
  };
}

/**
 * 日志格式化工具
 */
export class LogFormatter {
  /**
   * 格式化日志消息
   */
  static format(message: string, context: LogContext, data?: any): string {
    const prefix = `[${context.traceId}]`;
    const tenant = context.tenantId ? `[${context.tenantId}]` : '';
    const device = context.deviceId ? `[${context.deviceId}]` : '';
    
    let logMessage = `${prefix}${tenant}${device} ${message}`;
    
    if (data) {
      logMessage += ` | ${JSON.stringify(data)}`;
    }
    
    return logMessage;
  }
}
