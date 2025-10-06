/**
 * 日志工具模块
 * 基于Winston的日志管理系统
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';

/**
 * 日志级别配置
 */
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

/**
 * 日志级别颜色配置
 */
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

// 添加颜色支持
winston.addColors(logColors);

// 新架构：所有日志输出到stdout/stderr，不需要创建本地日志目录
// 日志由Docker日志驱动统一管理

/**
 * 获取中国时区时间戳
 */
const getChinaTimestamp = () => {
  const now = new Date();
  const chinaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  return chinaTime.toISOString().replace('T', ' ').replace('Z', '').replace(/\.\d{3}/, '');
};

/**
 * JSON结构化日志格式配置
 */
const jsonLogFormat = winston.format.combine(
  winston.format.timestamp({ 
    format: () => getChinaTimestamp()
  }),
  winston.format.errors({ stack: true }),
  winston.format.json({
    space: 0,
    replacer: (key, value) => {
      // 确保所有字段都是可序列化的
      if (value instanceof Error) {
        return {
          message: value.message,
          stack: value.stack,
          name: value.name
        };
      }
      return value;
    }
  })
);

/**
 * 控制台日志格式配置（仅开发环境）
 */
const consoleLogFormat = winston.format.combine(
  winston.format.timestamp({ 
    format: () => getChinaTimestamp()
  }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

/**
 * 创建日志传输器 - 只输出到stdout/stderr
 */
const transports: winston.transport[] = [
  // 统一输出到stdout，使用JSON格式
  new winston.transports.Console({
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.NODE_ENV === 'development' ? consoleLogFormat : jsonLogFormat,
    stderrLevels: ['error', 'fatal'], // 错误级别输出到stderr
  }),
];

/**
 * 创建Winston日志器实例
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels: logLevels,
  format: jsonLogFormat,
  transports,
  // 处理未捕获的异常 - 输出到stderr
  exceptionHandlers: [
    new winston.transports.Console({
      format: jsonLogFormat,
      stderrLevels: ['error'],
    }),
  ],
  // 处理未处理的Promise拒绝 - 输出到stderr
  rejectionHandlers: [
    new winston.transports.Console({
      format: jsonLogFormat,
      stderrLevels: ['error'],
    }),
  ],
});

/**
 * 创建HTTP请求日志中间件
 */
export const httpLogger = winston.createLogger({
  level: 'http',
  format: jsonLogFormat,
  transports: [
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'development' ? consoleLogFormat : jsonLogFormat,
    }),
  ],
});

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
}

/**
 * 日志工具类
 */
export class Logger {
  private service: string;
  private component: string;

  constructor(service: string = 'backend', component: string = 'app') {
    this.service = service;
    this.component = component;
  }

  /**
   * 创建结构化日志对象
   */
  private createStructuredLog(
    level: string,
    message: string,
    metadata?: Record<string, any>,
    error?: Error
  ): StructuredLog {
    return {
      service: this.service,
      component: this.component,
      level,
      message,
      timestamp: getChinaTimestamp(),
      ...(metadata && { metadata }),
      ...(error && {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      }),
    };
  }

  /**
   * 记录错误日志
   * @param message 日志消息
   * @param metadata 附加信息
   * @param error 错误对象
   */
  error(message: string, metadata?: Record<string, any>, error?: Error): void {
    const structuredLog = this.createStructuredLog('error', message, metadata, error);
    logger.error(JSON.stringify(structuredLog));
  }

  /**
   * 记录警告日志
   * @param message 日志消息
   * @param metadata 附加信息
   */
  warn(message: string, metadata?: Record<string, any>): void {
    const structuredLog = this.createStructuredLog('warn', message, metadata);
    logger.warn(JSON.stringify(structuredLog));
  }

  /**
   * 记录信息日志
   * @param message 日志消息
   * @param metadata 附加信息
   */
  info(message: string, metadata?: Record<string, any>): void {
    const structuredLog = this.createStructuredLog('info', message, metadata);
    logger.info(JSON.stringify(structuredLog));
  }

  /**
   * 记录调试日志
   * @param message 日志消息
   * @param metadata 附加信息
   */
  debug(message: string, metadata?: Record<string, any>): void {
    const structuredLog = this.createStructuredLog('debug', message, metadata);
    logger.debug(JSON.stringify(structuredLog));
  }

  /**
   * 记录HTTP请求日志
   * @param message 日志消息
   * @param metadata 请求信息
   */
  http(message: string, metadata?: Record<string, any>): void {
    const structuredLog = this.createStructuredLog('http', message, metadata);
    httpLogger.http(JSON.stringify(structuredLog));
  }

  /**
   * 记录设备数据日志
   * @param deviceId 设备ID
   * @param data 设备数据
   * @param source 数据来源
   */
  deviceData(deviceId: string, data: any, source: string): void {
    const metadata = {
      deviceId,
      source,
      dataType: typeof data,
      dataSize: JSON.stringify(data).length,
    };
    const structuredLog = this.createStructuredLog('info', 'Device data received', metadata);
    logger.info(JSON.stringify(structuredLog));
  }

  /**
   * 记录告警日志
   * @param alertId 告警ID
   * @param deviceId 设备ID
   * @param level 告警级别
   * @param message 告警消息
   */
  alert(alertId: string, deviceId: string, level: string, message: string): void {
    const metadata = {
      alertId,
      deviceId,
      alertLevel: level,
    };
    const structuredLog = this.createStructuredLog('warn', `Alert: ${message}`, metadata);
    logger.warn(JSON.stringify(structuredLog));
  }

  /**
   * 记录用户操作日志
   * @param userId 用户ID
   * @param action 操作类型
   * @param resource 资源类型
   * @param metadata 附加信息
   */
  userAction(userId: string, action: string, resource: string, metadata?: Record<string, any>): void {
    const logMetadata = {
      userId,
      action,
      resource,
      ...metadata,
    };
    const structuredLog = this.createStructuredLog('info', `User action: ${action}`, logMetadata);
    logger.info(JSON.stringify(structuredLog));
  }

  /**
   * 记录错误日志
   * @param message 日志消息
   * @param meta 附加信息
   */
  static error(message: string, meta?: any): void {
    logger.error(message, meta);
  }

  /**
   * 记录警告日志
   * @param message 日志消息
   * @param meta 附加信息
   */
  static warn(message: string, meta?: any): void {
    logger.warn(message, meta);
  }

  /**
   * 记录信息日志
   * @param message 日志消息
   * @param meta 附加信息
   */
  static info(message: string, meta?: any): void {
    logger.info(message, meta);
  }

  /**
   * 记录HTTP请求日志
   * @param message 日志消息
   * @param meta 附加信息
   */
  static http(message: string, meta?: any): void {
    logger.http(message, meta);
  }

  /**
   * 记录调试日志
   * @param message 日志消息
   * @param meta 附加信息
   */
  static debug(message: string, meta?: any): void {
    logger.debug(message, meta);
  }

  /**
   * 记录设备数据日志
   * @param deviceId 设备ID
   * @param data 设备数据
   * @param protocol 协议类型
   */
  static deviceData(deviceId: string, data: any, protocol: string): void {
    const now = new Date();
    const chinaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    logger.info('Device Data Received', {
      deviceId,
      protocol,
      dataSize: JSON.stringify(data).length,
      timestamp: chinaTime.toISOString(),
    });
  }

  /**
   * 记录用户操作日志
   * @param userId 用户ID
   * @param action 操作类型
   * @param resource 资源类型
   * @param resourceId 资源ID
   */
  static userAction(
    userId: string,
    action: string,
    resource: string,
    resourceId?: string
  ): void {
    const now = new Date();
    const chinaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    logger.info('User Action', {
      userId,
      action,
      resource,
      resourceId,
      timestamp: chinaTime.toISOString(),
    });
  }

  /**
   * 记录系统事件日志
   * @param event 事件类型
   * @param details 事件详情
   */
  static systemEvent(event: string, details?: any): void {
    const now = new Date();
    const chinaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    logger.info('System Event', {
      event,
      details,
      timestamp: chinaTime.toISOString(),
    });
  }

  /**
   * 记录告警日志
   * @param alertId 告警ID
   * @param deviceId 设备ID
   * @param level 告警级别
   * @param message 告警消息
   */
  static alert(
    alertId: string,
    deviceId: string,
    level: string,
    message: string
  ): void {
    const now = new Date();
    const chinaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    logger.warn('Alert Triggered', {
      alertId,
      deviceId,
      level,
      message,
      timestamp: chinaTime.toISOString(),
    });
  }
}

// 导出默认的Logger实例
export const defaultLogger = new Logger('backend', 'app');

// 导出组件特定的Logger实例
export const mqttLogger = new Logger('backend', 'mqtt');
export const databaseLogger = new Logger('backend', 'database');
export const authLogger = new Logger('backend', 'auth');
export const alertLogger = new Logger('backend', 'alert');
export const websocketLogger = new Logger('backend', 'websocket');

// 导出默认日志器实例（向后兼容）
export { logger };

// 默认导出
export default logger;
