/**
 * Express 主入口
 * 集成核心框架、中间件、插件系统
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import path from 'path';

// 导入核心模块
import { authService } from '@/core/security/auth';
import { credentialsService } from '@/core/security/credentials';
// 协议适配器现在通过ProtocolManager统一管理
import { shadowService } from '@/core/shadow';
import { rateLimiter } from '@/core/middleware/rate-limiter';
import { idempotencyService } from '@/core/middleware/idempotency';
import { serviceContainer } from '@/core/db/container';

// 导入配置中心
import { configManager } from '@/config-center/config-manager';

// 导入插件系统
import { PluginLoader } from '@/core/plugin-loader';

// 导入公共工具
import { db } from '@/common/config/database';
import { logger, httpLogger } from '@/common/logger';
import { 
  globalErrorHandler, 
  notFound, 
  handleUncaughtException, 
  handleUnhandledRejection 
} from '@/core/middleware/errorHandler';

// 导入API路由
import authRoutes from '@/api/auth';
import userRoutes from '@/api/users';
import deviceRoutes from '@/api/devices';
import systemRoutes from '@/api/system';
import deviceBootstrapRoutes from '@/api/device-bootstrap';

// 导入服务
import { AlertService } from '@/core/alert';
import { healthService } from '@/core/health';
import { ProtocolManager } from '@/core/protocols/protocol-manager';

// 加载环境变量
dotenv.config();

/**
 * IoT 平台核心服务器
 */
export class IoTPlatformServer {
  private app: express.Application;
  private server: any;
  private io: SocketIOServer;
  private port: number;
  private pluginLoader: PluginLoader;
  private protocolManager?: ProtocolManager;

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

    // 初始化插件加载器
    this.pluginLoader = PluginLoader.getInstance(
      path.join(process.cwd(), 'src/plugins'),
      {
        app: this.app,
        configManager,
        logger,
        prisma: db
      }
    );

    this.initializeServices();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  /**
   * 初始化服务
   */
  private async initializeServices(): Promise<void> {
    try {
      // 注册核心服务到容器
      serviceContainer.register('authService', () => authService);
      serviceContainer.register('credentialsService', () => credentialsService);
      serviceContainer.register('shadowService', () => shadowService);
      serviceContainer.register('rateLimiter', () => rateLimiter);
      serviceContainer.register('idempotencyService', () => idempotencyService);
      serviceContainer.register('configManager', () => configManager);

      // 注册现有服务
      serviceContainer.register('alertService', () => new AlertService());
      serviceContainer.register('healthService', () => healthService);

      // 初始化所有服务
      await serviceContainer.initializeAll();

      // 初始化配置中心
      await configManager.initialize();

      // 初始化协议适配器
      const adapterConfig = {
        mqtt: {
          enabled: true,
          brokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://emqx:1883',
          port: parseInt(process.env.MQTT_BROKER_PORT || '1883'),
          username: process.env.MQTT_USERNAME,
          password: process.env.MQTT_PASSWORD
        },
        websocket: {
          enabled: true,
          port: this.port,
          cors: {
            origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
            methods: ['GET', 'POST'],
            credentials: true
          }
        },
        http: {
          enabled: true,
          port: this.port,
          rateLimit: 100
        },
        udp: {
          enabled: true,
          port: parseInt(process.env.UDP_PORT || '8888'),
          host: process.env.UDP_HOST || '0.0.0.0'
        },
        socketIO: this.io // 传递 Socket.IO 实例
      };

      // 等待EMQX完全启动
      await this.waitForEMQX();
      
      // 初始化协议管理器
      this.protocolManager = ProtocolManager.getInstance(adapterConfig as any);
      await this.protocolManager.initialize();

      // 初始化插件系统
      await this.pluginLoader.initialize();

      // 设置限流规则
      this.setupRateLimiting();

      logger.info('All services initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize services:', error);
      throw error;
    }
  }

  /**
   * 设置限流规则
   */
  private setupRateLimiting(): void {
    // 全局API限流
    rateLimiter.addRule({
      name: 'global-api',
      config: {
        windowMs: 15 * 60 * 1000, // 15分钟
        maxRequests: 1000,
        keyGenerator: (req) => `global:${req.ip}`
      },
      conditions: {}
    });

    // 设备引导限流
    rateLimiter.addRule({
      name: 'device-bootstrap',
      config: {
        windowMs: 60 * 1000, // 1分钟
        maxRequests: 10,
        keyGenerator: (req) => `bootstrap:${req.ip}`
      },
      conditions: {
        path: '/api/device/bootstrap'
      }
    });

    // 租户特定限流
    rateLimiter.addRule({
      name: 'tenant-api',
      config: {
        windowMs: 60 * 1000, // 1分钟
        maxRequests: 100,
        keyGenerator: (req) => {
          const auth = (req as any).auth;
          return `tenant:${auth?.tenantId || 'anonymous'}:${req.ip}`;
        }
      },
      conditions: {}
    });
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
        const allowedOrigins = process.env.CORS_ORIGIN 
          ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
          : ['http://localhost:3000'];
        
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          logger.warn(`CORS: Origin ${origin} not allowed`);
          callback(null, false);
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Device-Token'],
    }));

    // 请求压缩
    this.app.use(compression());

    // 请求日志
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

    // 限流中间件
    this.app.use('/api/', rateLimiter.rateLimitMiddleware());

    // 幂等性中间件
    this.app.use('/api/', idempotencyService.idempotencyMiddleware());

    // 认证中间件（可选，某些路由需要）
    this.app.use('/api/', (req, res, next) => {
      // 排除认证路由
      if (req.path.startsWith('/auth')) {
        return next();
      }
      return authService.authenticateMiddleware()(req, res, next);
    });

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

    // 核心API路由
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/users', authService.requirePermission('user:read'), userRoutes);
    this.app.use('/api/devices', authService.requirePermission('device:read'), deviceRoutes);
    this.app.use('/api/system', authService.requirePermission('system:config'), systemRoutes);
    this.app.use('/api/device', deviceBootstrapRoutes);

    // 加载插件路由
    this.loadPluginRoutes();

    // 根路径
    this.app.get('/', (req, res) => {
      res.json({
        success: true,
        message: 'IoT Device Management Platform API',
        version: '2.0.0',
        architecture: 'core+plugins+config-center',
        timestamp: new Date(),
        documentation: '/api/docs',
      });
    });

    // 404处理
    this.app.use('*', notFound);
  }

  /**
   * 加载插件路由
   */
  private loadPluginRoutes(): void {
    const plugins = this.pluginLoader.getLoadedPlugins();
    
    for (const plugin of plugins) {
      try {
        const routes = plugin.instance.registerRoutes();
        
        for (const route of routes) {
          this.app.use(route.path, ...(route.middleware || []), route.router);
          logger.info('Plugin route loaded', {
            plugin: plugin.name,
            path: route.path
          });
        }
      } catch (error) {
        logger.error('Failed to load plugin routes', {
          plugin: plugin.name,
          error
        });
      }
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
   * 等待EMQX完全启动
   */
  private async waitForEMQX(): Promise<void> {
    const maxRetries = 30;
    const retryInterval = 2000; // 2秒
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        const mqtt = require('mqtt');
        const client = mqtt.connect(process.env.MQTT_BROKER_URL || 'mqtt://emqx:1883', {
          connectTimeout: 5000,
          clientId: `health-check-${Date.now()}`
        });
        
        await new Promise((resolve, reject) => {
          client.on('connect', () => {
            client.end();
            resolve(true);
          });
          
          client.on('error', (error: Error) => {
            client.end();
            reject(error);
          });
          
          setTimeout(() => {
            client.end();
            reject(new Error('Connection timeout'));
          }, 5000);
        });
        
        logger.info('EMQX is ready, proceeding with initialization');
        return;
      } catch (error) {
        logger.info(`Waiting for EMQX... (${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, retryInterval));
      }
    }
    
    throw new Error('EMQX failed to start within timeout period');
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
        logger.info(`Architecture: Core + Plugins + Config Center`);
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

      // 关闭插件
      await this.pluginLoader.unloadAllPlugins();

      // 关闭所有服务
      await serviceContainer.shutdownAll();

      // 关闭协议管理器
      if (this.protocolManager) {
        await this.protocolManager.shutdown();
      }

      // 关闭HTTP服务器
      this.server.close(() => {
        logger.info('HTTP server closed');
      });

      // 关闭数据库连接
      await db.disconnect();

      logger.info('Server shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}

export default IoTPlatformServer;
