/**
 * 全局错误处理中间件
 * 统一处理应用程序中的错误
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../common/logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  code?: string;
  keyValue?: any;
  errors?: any;
}

/**
 * 创建应用程序错误
 */
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 处理Prisma错误
 */
const handlePrismaError = (error: any): AppError => {
  if (error.code === 'P2002') {
    // 唯一约束违反
    const field = error.meta?.target?.[0] || 'field';
    return new AppError(`${field} already exists`, 400);
  }
  
  if (error.code === 'P2025') {
    // 记录未找到
    return new AppError('Record not found', 404);
  }
  
  if (error.code === 'P2003') {
    // 外键约束违反
    return new AppError('Invalid reference', 400);
  }
  
  if (error.code === 'P2014') {
    // 关系违反
    return new AppError('Invalid relationship', 400);
  }

  // 默认Prisma错误
  return new AppError('Database operation failed', 500);
};

/**
 * 处理JWT错误
 */
const handleJWTError = (): AppError => {
  return new AppError('Invalid token. Please log in again!', 401);
};

/**
 * 处理JWT过期错误
 */
const handleJWTExpiredError = (): AppError => {
  return new AppError('Your token has expired! Please log in again.', 401);
};

/**
 * 处理验证错误
 */
const handleValidationError = (error: any): AppError => {
  const errors = Object.values(error.errors).map((err: any) => err.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

/**
 * 处理重复字段错误
 */
const handleDuplicateFieldsDB = (error: any): AppError => {
  const value = error.errmsg?.match(/(["'])(\\?.)*?\1/)?.[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

/**
 * 处理Cast错误
 */
const handleCastErrorDB = (error: any): AppError => {
  const message = `Invalid ${error.path}: ${error.value}.`;
  return new AppError(message, 400);
};

/**
 * 发送错误响应（开发环境）
 */
const sendErrorDev = (err: AppError, res: Response): void => {
  res.status(err.statusCode).json({
    success: false,
    error: err,
    message: err.message,
    stack: err.stack,
    timestamp: new Date(),
  });
};

/**
 * 发送错误响应（生产环境）
 */
const sendErrorProd = (err: AppError, res: Response): void => {
  // 操作错误：发送消息给客户端
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      timestamp: new Date(),
    });
  } else {
    // 编程或其他未知错误：不要泄露错误详情
    logger.error('ERROR 💥', err);
    
    res.status(500).json({
      success: false,
      message: 'Something went wrong!',
      timestamp: new Date(),
    });
  }
};

/**
 * 全局错误处理中间件
 */
export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    // Prisma错误
    if (err.code?.startsWith('P')) {
      error = handlePrismaError(err);
    }
    
    // JWT错误
    if (err.name === 'JsonWebTokenError') {
      error = handleJWTError();
    }
    
    // JWT过期错误
    if (err.name === 'TokenExpiredError') {
      error = handleJWTExpiredError();
    }
    
    // 验证错误
    if (err.name === 'ValidationError') {
      error = handleValidationError(err);
    }
    
    // 重复字段错误
    if (err.code === 11000) {
      error = handleDuplicateFieldsDB(err);
    }
    
    // Cast错误
    if (err.name === 'CastError') {
      error = handleCastErrorDB(err);
    }

    sendErrorProd(error, res);
  }
};

/**
 * 处理未捕获的异常
 */
export const handleUncaughtException = (): void => {
  process.on('uncaughtException', (err: Error) => {
    logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    logger.error(err.name, err.message);
    process.exit(1);
  });
};

/**
 * 处理未处理的Promise拒绝
 */
export const handleUnhandledRejection = (): void => {
  process.on('unhandledRejection', (err: any, promise: Promise<any>) => {
    logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
    logger.error(err.name, err.message);
    process.exit(1);
  });
};

/**
 * 异步错误捕获包装器
 */
export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};

/**
 * 404错误处理
 */
export const notFound = (req: Request, res: Response, next: NextFunction): void => {
  const err = new AppError(`Not found - ${req.originalUrl}`, 404);
  next(err);
};
