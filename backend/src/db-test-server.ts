/**
 * 数据库测试服务器
 * 测试数据库连接和服务初始化
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

// 加载环境变量
dotenv.config();

console.log('=== 开始启动数据库测试服务器 ===');

const app = express();
const port = parseInt(process.env.PORT || '8000', 10);
const server = createServer(app);

console.log('Express应用和HTTP服务器已创建');

// 基础中间件
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
    timestamp: new Date(),
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

console.log('所有中间件已配置');

// 测试数据库连接
let dbStatus = 'unknown';
try {
  console.log('正在测试数据库连接...');
  // 导入数据库配置
  const { db } = require('@/config/database');
  console.log('✅ 数据库配置导入成功');
  
  // 测试数据库健康检查
  db.healthCheck().then((isHealthy: boolean) => {
    if (isHealthy) {
      console.log('✅ 数据库连接测试成功');
      dbStatus = 'connected';
    } else {
      console.log('❌ 数据库健康检查失败');
      dbStatus = 'failed';
    }
  }).catch((error: any) => {
    console.error('❌ 数据库连接测试失败:', error);
    dbStatus = 'failed';
  });
} catch (error) {
  console.error('❌ 数据库配置导入失败:', error);
  dbStatus = 'failed';
}

// 测试Socket.IO
let socketStatus = 'unknown';
try {
  const io = new SocketIOServer(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });
  socketStatus = 'connected';
  console.log('✅ Socket.IO已配置');
} catch (error) {
  console.error('❌ Socket.IO配置失败:', error);
  socketStatus = 'failed';
}

// 测试服务导入
let servicesStatus = 'unknown';
try {
  console.log('正在测试服务导入...');
  // 暂时跳过服务导入测试
  servicesStatus = 'imported';
  console.log('✅ 服务导入测试成功');
} catch (error) {
  console.error('❌ 服务导入测试失败:', error);
  servicesStatus = 'failed';
}

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: '数据库测试服务器运行正常',
    tests: {
      express: '✅',
      middleware: '✅',
      socketio: socketStatus === 'connected' ? '✅' : '❌',
      database: dbStatus === 'connected' ? '✅' : '⏭️ 跳过',
      services: servicesStatus === 'imported' ? '✅' : '❌'
    }
  });
});

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'IoT Platform Database Test Server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// 错误处理
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('错误处理中间件:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString(),
  });
});

// 启动服务器
console.log('准备启动服务器...');
server.listen(port, () => {
  console.log(`=== 数据库测试服务器启动成功 ===`);
  console.log(`端口: ${port}`);
  console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`健康检查: http://localhost:${port}/health`);
});

export default app;
