/**
 * 前端结构化日志系统
 * 统一输出到console，使用JSON格式
 */

/**
 * 日志级别
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

/**
 * 结构化日志接口
 */
interface StructuredLog {
  service: string;
  component: string;
  level: string;
  message: string;
  timestamp: string;
  traceId?: string;
  userId?: string;
  deviceId?: string;
  metadata?: Record<string, any>;
  error?: {
    message: string;
    stack?: string;
    name: string;
  };
  url?: string;
  userAgent?: string;
}

/**
 * 前端日志器类
 */
export class FrontendLogger {
  private service: string;
  private component: string;
  private isDevelopment: boolean;

  constructor(service: string = 'frontend', component: string = 'app') {
    this.service = service;
    this.component = component;
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  /**
   * 获取当前时间戳
   */
  private getTimestamp(): string {
    const now = new Date();
    const chinaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    return chinaTime.toISOString().replace('T', ' ').replace('Z', '').replace(/\.\d{3}/, '');
  }

  /**
   * 创建结构化日志对象
   */
  private createStructuredLog(
    level: LogLevel,
    message: string,
    metadata?: Record<string, any>,
    error?: Error
  ): StructuredLog {
    const log: StructuredLog = {
      service: this.service,
      component: this.component,
      level,
      message,
      timestamp: this.getTimestamp(),
      ...(metadata && { metadata }),
      ...(error && {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      }),
    };

    // 在浏览器环境中添加额外信息
    if (typeof window !== 'undefined') {
      log.url = window.location.href;
      log.userAgent = navigator.userAgent;
    }

    return log;
  }

  /**
   * 输出日志
   */
  private outputLog(level: LogLevel, structuredLog: StructuredLog): void {
    const logString = JSON.stringify(structuredLog);

    if (this.isDevelopment) {
      // 开发环境：使用彩色console输出
      const { message, timestamp, ...meta } = structuredLog;
      const prefix = `[${timestamp}] ${level.toUpperCase()}:`;
      
      switch (level) {
        case LogLevel.ERROR:
          console.error(prefix, message, meta);
          break;
        case LogLevel.WARN:
          console.warn(prefix, message, meta);
          break;
        case LogLevel.INFO:
          console.info(prefix, message, meta);
          break;
        case LogLevel.DEBUG:
          console.debug(prefix, message, meta);
          break;
      }
    } else {
      // 生产环境：输出JSON格式
      switch (level) {
        case LogLevel.ERROR:
          console.error(logString);
          break;
        case LogLevel.WARN:
          console.warn(logString);
          break;
        case LogLevel.INFO:
          console.info(logString);
          break;
        case LogLevel.DEBUG:
          console.debug(logString);
          break;
      }
    }
  }

  /**
   * 记录错误日志
   */
  error(message: string, metadata?: Record<string, any>, error?: Error): void {
    const structuredLog = this.createStructuredLog(LogLevel.ERROR, message, metadata, error);
    this.outputLog(LogLevel.ERROR, structuredLog);
  }

  /**
   * 记录警告日志
   */
  warn(message: string, metadata?: Record<string, any>): void {
    const structuredLog = this.createStructuredLog(LogLevel.WARN, message, metadata);
    this.outputLog(LogLevel.WARN, structuredLog);
  }

  /**
   * 记录信息日志
   */
  info(message: string, metadata?: Record<string, any>): void {
    const structuredLog = this.createStructuredLog(LogLevel.INFO, message, metadata);
    this.outputLog(LogLevel.INFO, structuredLog);
  }

  /**
   * 记录调试日志
   */
  debug(message: string, metadata?: Record<string, any>): void {
    const structuredLog = this.createStructuredLog(LogLevel.DEBUG, message, metadata);
    this.outputLog(LogLevel.DEBUG, structuredLog);
  }

  /**
   * 记录API请求日志
   */
  apiRequest(method: string, url: string, metadata?: Record<string, any>): void {
    const apiMetadata = {
      method,
      url,
      ...metadata,
    };
    const structuredLog = this.createStructuredLog(LogLevel.INFO, 'API Request', apiMetadata);
    this.outputLog(LogLevel.INFO, structuredLog);
  }

  /**
   * 记录API响应日志
   */
  apiResponse(method: string, url: string, status: number, responseTime: number, metadata?: Record<string, any>): void {
    const apiMetadata = {
      method,
      url,
      status,
      responseTime,
      ...metadata,
    };
    const structuredLog = this.createStructuredLog(LogLevel.INFO, 'API Response', apiMetadata);
    this.outputLog(LogLevel.INFO, structuredLog);
  }

  /**
   * 记录用户操作日志
   */
  userAction(action: string, resource: string, metadata?: Record<string, any>): void {
    const userMetadata = {
      action,
      resource,
      ...metadata,
    };
    const structuredLog = this.createStructuredLog(LogLevel.INFO, `User Action: ${action}`, userMetadata);
    this.outputLog(LogLevel.INFO, structuredLog);
  }

  /**
   * 记录页面访问日志
   */
  pageView(page: string, metadata?: Record<string, any>): void {
    const pageMetadata = {
      page,
      ...metadata,
    };
    const structuredLog = this.createStructuredLog(LogLevel.INFO, 'Page View', pageMetadata);
    this.outputLog(LogLevel.INFO, structuredLog);
  }

  /**
   * 记录WebSocket连接日志
   */
  websocketEvent(event: string, metadata?: Record<string, any>): void {
    const wsMetadata = {
      event,
      ...metadata,
    };
    const structuredLog = this.createStructuredLog(LogLevel.INFO, `WebSocket: ${event}`, wsMetadata);
    this.outputLog(LogLevel.INFO, structuredLog);
  }

  /**
   * 记录性能日志
   */
  performance(metric: string, value: number, metadata?: Record<string, any>): void {
    const perfMetadata = {
      metric,
      value,
      unit: 'ms',
      ...metadata,
    };
    const structuredLog = this.createStructuredLog(LogLevel.INFO, `Performance: ${metric}`, perfMetadata);
    this.outputLog(LogLevel.INFO, structuredLog);
  }
}

// 导出默认的Logger实例
export const defaultLogger = new FrontendLogger('frontend', 'app');

// 导出组件特定的Logger实例
export const apiLogger = new FrontendLogger('frontend', 'api');
export const authLogger = new FrontendLogger('frontend', 'auth');
export const websocketLogger = new FrontendLogger('frontend', 'websocket');
export const uiLogger = new FrontendLogger('frontend', 'ui');
export const performanceLogger = new FrontendLogger('frontend', 'performance');

// 默认导出
export default defaultLogger;
