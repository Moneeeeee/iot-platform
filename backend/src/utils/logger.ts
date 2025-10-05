/**
 * 日志工具模块
 * 基于Winston的日志管理系统
 */

import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

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

/**
 * 日志格式配置
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

/**
 * 文件日志格式配置
 */
const fileLogFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * 创建日志传输器
 */
const transports: winston.transport[] = [
  // 控制台输出
  new winston.transports.Console({
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
    format: logFormat,
  }),

  // 错误日志文件
  new DailyRotateFile({
    filename: path.join(process.cwd(), 'logs', 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    format: fileLogFormat,
    maxSize: '20m',
    maxFiles: '14d',
    zippedArchive: true,
  }),

  // 综合日志文件
  new DailyRotateFile({
    filename: path.join(process.cwd(), 'logs', 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    format: fileLogFormat,
    maxSize: '20m',
    maxFiles: '14d',
    zippedArchive: true,
  }),

  // HTTP请求日志文件
  new DailyRotateFile({
    filename: path.join(process.cwd(), 'logs', 'http-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'http',
    format: fileLogFormat,
    maxSize: '20m',
    maxFiles: '7d',
    zippedArchive: true,
  }),
];

/**
 * 创建Winston日志器实例
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels: logLevels,
  format: fileLogFormat,
  transports,
  // 处理未捕获的异常
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'exceptions.log'),
    }),
  ],
  // 处理未处理的Promise拒绝
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(process.cwd(), 'logs', 'rejections.log'),
    }),
  ],
});

/**
 * 创建HTTP请求日志中间件
 */
export const httpLogger = winston.createLogger({
  level: 'http',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new DailyRotateFile({
      filename: path.join(process.cwd(), 'logs', 'http-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '7d',
      zippedArchive: true,
    }),
  ],
});

/**
 * 日志工具类
 */
export class Logger {
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
    logger.info('Device Data Received', {
      deviceId,
      protocol,
      dataSize: JSON.stringify(data).length,
      timestamp: new Date().toISOString(),
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
    logger.info('User Action', {
      userId,
      action,
      resource,
      resourceId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 记录系统事件日志
   * @param event 事件类型
   * @param details 事件详情
   */
  static systemEvent(event: string, details?: any): void {
    logger.info('System Event', {
      event,
      details,
      timestamp: new Date().toISOString(),
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
    logger.warn('Alert Triggered', {
      alertId,
      deviceId,
      level,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}

// 导出默认日志器实例
export { logger };

// 默认导出
export default logger;
