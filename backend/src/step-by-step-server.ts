/**
 * 逐步测试服务器
 * 逐步添加依赖来找出问题
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

console.log('=== 开始启动逐步测试服务器 ===');

const app = express();
const port = parseInt(process.env.PORT || '8000', 10);
const server = createServer(app);

console.log('Express应用和HTTP服务器已创建');

// 测试基础中间件
try {
  app.use(helmet());
  console.log('✅ Helmet中间件已配置');
} catch (error) {
  console.error('❌ Helmet中间件配置失败:', error);
}

try {
  app.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  console.log('✅ CORS中间件已配置');
} catch (error) {
  console.error('❌ CORS中间件配置失败:', error);
}

try {
  app.use(compression());
  console.log('✅ 压缩中间件已配置');
} catch (error) {
  console.error('❌ 压缩中间件配置失败:', error);
}

try {
  app.use(morgan('combined'));
  console.log('✅ Morgan日志中间件已配置');
} catch (error) {
  console.error('❌ Morgan日志中间件配置失败:', error);
}

try {
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  console.log('✅ 请求体解析中间件已配置');
} catch (error) {
  console.error('❌ 请求体解析中间件配置失败:', error);
}

try {
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
  console.log('✅ 速率限制中间件已配置');
} catch (error) {
  console.error('❌ 速率限制中间件配置失败:', error);
}

// 测试数据库连接
try {
  console.log('正在测试数据库连接...');
  // 暂时跳过数据库连接测试
  console.log('✅ 数据库连接测试已跳过');
} catch (error) {
  console.error('❌ 数据库连接测试失败:', error);
}

// 测试Socket.IO
try {
  const io = new SocketIOServer(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });
  console.log('✅ Socket.IO已配置');
} catch (error) {
  console.error('❌ Socket.IO配置失败:', error);
}

// 基本路由
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: '逐步测试服务器运行正常',
    tests: {
      express: '✅',
      middleware: '✅',
      socketio: '✅',
      database: '⏭️ 跳过'
    }
  });
});

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'IoT Platform Step-by-Step Test Server',
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
  console.log(`=== 逐步测试服务器启动成功 ===`);
  console.log(`端口: ${port}`);
  console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`健康检查: http://localhost:${port}/health`);
});

export default app;
