/**
 * IoT设备管理平台后端服务入口文件
 * 启动Express服务器和所有必要的服务
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

// 导入配置和服务
import { db } from '@/config/database';
import { configManager } from '@/config/config';
import { logger, httpLogger } from '@/utils/logger';
import { AuthMiddleware } from '@/middleware/auth';
import { 
  globalErrorHandler, 
  notFound, 
  handleUncaughtException, 
  handleUnhandledRejection 
} from '@/middleware/errorHandler';

// 导入路由
import authRoutes from '@/routes/auth';
import userRoutes from '@/routes/users';
import deviceRoutes from '@/routes/devices';
import systemRoutes from '@/routes/system';
import powersafeRoutes from '@/routes/powersafe';
import deviceBootstrapRoutes from '@/routes/device-bootstrap';

// 导入服务
import { MQTTService } from '@/services/mqtt';
import { UDPService } from '@/services/udp';
import { WebSocketService } from '@/services/websocket';
import { AlertService } from '@/services/alert';
import { healthService } from '@/services/health';

// 加载环境变量
dotenv.config();

/**
 * 应用程序类
 */
class Application {
  private app: express.Application;
  private server: any;
  private io: SocketIOServer;
  private port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '8000', 10);
    this.server = createServer(this.app);
    // 解析允许的WebSocket origins
    const allowedOrigins = process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
      : ['http://localhost:3000', 'http://fountain.top'];

    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeServices();
    this.initializeErrorHandling();
  }

  /**
   * 初始化中间件
   */
  private initializeMiddleware(): void {
    // 安全中间件
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS配置
    this.app.use(cors({
      origin: (origin, callback) => {
        // 允许的域名列表
        const allowedOrigins = process.env.CORS_ORIGIN 
          ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
          : ['http://localhost:3000'];
        
        // 允许没有origin的请求（如移动应用、Postman等）
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          // 记录被拒绝的origin用于调试
          console.log(`CORS: Origin ${origin} not allowed. Allowed origins:`, allowedOrigins);
          callback(null, false);
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }));

    // 请求压缩
    this.app.use(compression());

    // 请求日志 - 使用中国时区
    this.app.use(morgan((tokens, req, res) => {
      const now = new Date();
      const chinaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
      const timestamp = chinaTime.toISOString().replace('T', ' ').replace('Z', '');
      
      return [
        tokens.method(req, res),
        tokens.url(req, res),
        tokens.status(req, res),
        tokens.res(req, res, 'content-length'), '-',
        tokens['response-time'](req, res), 'ms',
        `[${timestamp}]`
      ].join(' ');
    }, {
      stream: {
        write: (message: string) => {
          httpLogger.http(message.trim());
        },
      },
    }));

    // 请求体解析
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // 速率限制
    const limiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15分钟
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10), // 限制每个IP 100次请求
      message: {
        success: false,
        error: 'Too many requests from this IP, please try again later.',
        timestamp: new Date(),
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api/', limiter);

    // 静态文件服务
    this.app.use('/uploads', express.static('uploads'));
  }

  /**
   * 初始化路由
   */
  private initializeRoutes(): void {
    // 健康检查端点
    this.app.get('/health', async (req, res) => {
      try {
        const dbHealth = await db.healthCheck();
        const healthCheck = await healthService.checkAll();
        
        const overallStatus = dbHealth && healthCheck.overall === 'healthy' ? 'healthy' : 'unhealthy';
        
        // 获取中国时区时间
        const now = new Date();
        const chinaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
        
        res.status(overallStatus === 'healthy' ? 200 : 503).json({
          success: overallStatus === 'healthy',
          status: overallStatus,
          timestamp: chinaTime.toISOString(),
          services: {
            database: dbHealth ? 'up' : 'down',
            redis: healthCheck.services.redis.status,
            mqtt: healthCheck.services.mqtt.status,
          },
          details: {
            database: {
              status: dbHealth ? 'up' : 'down',
              responseTime: '< 1ms',
            },
            redis: healthCheck.services.redis,
            mqtt: healthCheck.services.mqtt,
          },
        });
      } catch (error) {
        logger.error('Health check failed:', error);
        // 获取中国时区时间
        const now = new Date();
        const chinaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
        
        res.status(503).json({
          success: false,
          status: 'unhealthy',
          timestamp: chinaTime.toISOString(),
          error: 'Health check failed',
        });
      }
    });

    // API路由
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/users', AuthMiddleware.authenticate, userRoutes);
    this.app.use('/api/devices', AuthMiddleware.authenticate, deviceRoutes);
    this.app.use('/api/system', AuthMiddleware.authenticate, systemRoutes);
    this.app.use('/api/powersafe', powersafeRoutes);
    this.app.use('/api/device', deviceBootstrapRoutes); // 通用设备引导路由

    // 根路径
    this.app.get('/', (req, res) => {
      res.json({
        success: true,
        message: 'IoT Device Management Platform API',
        version: '1.0.0',
        timestamp: new Date(),
        documentation: '/api/docs',
      });
    });

    // 404处理
    this.app.use('*', notFound);
  }

  /**
   * 初始化服务
   */
  private async initializeServices(): Promise<void> {
    try {
      // 初始化WebSocket服务
      const webSocketService = new WebSocketService(this.io);
      await webSocketService.initialize();

      // 初始化MQTT服务
      const mqttService = new MQTTService();
      await mqttService.initialize();

      // 初始化UDP服务
      const udpService = new UDPService();
      await udpService.initialize();

      // 初始化告警服务
      const alertService = new AlertService();
      await alertService.initialize();

      logger.info('All services initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize services:', error);
      throw error;
    }
  }

  /**
   * 初始化错误处理
   */
  private initializeErrorHandling(): void {
    // 全局错误处理中间件
    this.app.use(globalErrorHandler);

    // 处理未捕获的异常和未处理的Promise拒绝
    handleUncaughtException();
    handleUnhandledRejection();

    // 优雅关闭
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      this.shutdown();
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down gracefully');
      this.shutdown();
    });
  }

  /**
   * 启动服务器
   */
  public async start(): Promise<void> {
    try {
      // 连接数据库
      await db.connect();

      // 启动HTTP服务器
      this.server.listen(this.port, () => {
        logger.info(`Server is running on port ${this.port}`);
        logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
        logger.info(`API Documentation: http://localhost:${this.port}/api/docs`);
      });

      // 设置服务器超时
      this.server.timeout = 30000; // 30秒

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * 优雅关闭服务器
   */
  public async shutdown(): Promise<void> {
    try {
      logger.info('Shutting down server...');

      // 关闭HTTP服务器
      this.server.close(() => {
        logger.info('HTTP server closed');
      });

      // 关闭数据库连接
      await db.disconnect();

      // 关闭其他服务
      // TODO: 添加其他服务的关闭逻辑

      logger.info('Server shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// 创建并启动应用程序
const app = new Application();

// 启动服务器
app.start().catch((error) => {
  logger.error('Failed to start application:', error);
  process.exit(1);
});

// 导出应用程序实例（用于测试）
export default app;
