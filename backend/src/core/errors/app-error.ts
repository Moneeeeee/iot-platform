/**
 * 统一错误模型 - 简化版
 * 
 * 解决职责边界混乱导致的错误处理不一致问题
 */

/**
 * 应用错误类
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly details?: any;
  public readonly statusCode: number;
  public readonly traceId: string | undefined;

  constructor(
    code: string,
    message: string,
    statusCode: number = 500,
    options?: {
      details?: any;
      traceId?: string;
    }
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = options?.details;
    this.traceId = options?.traceId;
  }

  /**
   * 转换为JSON格式
   */
  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      statusCode: this.statusCode,
      traceId: this.traceId
    };
  }
}

/**
 * 错误代码常量
 */
export const ERROR_CODES = {
  // 验证错误
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_DEVICE_ID: 'INVALID_DEVICE_ID',
  INVALID_MAC_ADDRESS: 'INVALID_MAC_ADDRESS',
  INVALID_TIMESTAMP: 'INVALID_TIMESTAMP',
  
  // 业务错误
  TENANT_NOT_FOUND: 'TENANT_NOT_FOUND',
  DEVICE_NOT_FOUND: 'DEVICE_NOT_FOUND',
  BOOTSTRAP_FAILED: 'BOOTSTRAP_FAILED',
  
  // 系统错误
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  CACHE_ERROR: 'CACHE_ERROR'
} as const;

/**
 * 错误工厂函数
 */
export class ErrorFactory {
  /**
   * 创建验证错误
   */
  static validationError(message: string, details?: any, traceId?: string): AppError {
    const options: { details?: any; traceId?: string } = { details };
    if (traceId) options.traceId = traceId;
    return new AppError(ERROR_CODES.VALIDATION_ERROR, message, 400, options);
  }

  /**
   * 创建业务错误
   */
  static businessError(code: string, message: string, details?: any, traceId?: string): AppError {
    const options: { details?: any; traceId?: string } = { details };
    if (traceId) options.traceId = traceId;
    return new AppError(code, message, 422, options);
  }

  /**
   * 创建系统错误
   */
  static systemError(message: string, details?: any, traceId?: string): AppError {
    const options: { details?: any; traceId?: string } = { details };
    if (traceId) options.traceId = traceId;
    return new AppError(ERROR_CODES.INTERNAL_ERROR, message, 500, options);
  }

  /**
   * 创建租户错误
   */
  static tenantError(message: string, details?: any, traceId?: string): AppError {
    const options: { details?: any; traceId?: string } = { details };
    if (traceId) options.traceId = traceId;
    return new AppError(ERROR_CODES.TENANT_NOT_FOUND, message, 404, options);
  }
}

/**
 * 错误处理工具
 */
export class ErrorHandler {
  /**
   * 统一错误响应格式
   */
  static formatErrorResponse(error: AppError | Error): {
    success: false;
    error: any;
    timestamp: string;
  } {
    if (error instanceof AppError) {
      return {
        success: false,
        error: error.toJSON(),
        timestamp: new Date().toISOString()
      };
    }

    // 处理非AppError的错误
    return {
      success: false,
      error: {
        code: ERROR_CODES.INTERNAL_ERROR,
        message: error.message || 'Internal server error',
        details: { originalError: error.name }
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 获取HTTP状态码
   */
  static getStatusCode(error: AppError | Error): number {
    if (error instanceof AppError) {
      return error.statusCode;
    }
    return 500;
  }
}