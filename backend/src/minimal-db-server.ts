/**
 * 最小数据库服务器
 * 只测试数据库连接，不包含其他复杂功能
 */

import express from 'express';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

console.log('=== 开始启动最小数据库服务器 ===');
console.log('环境变量:');
console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('NODE_ENV:', process.env.NODE_ENV);

const app = express();
const port = parseInt(process.env.PORT || '8000', 10);

console.log('Express应用已创建');

// 基本中间件
app.use(express.json());

console.log('中间件已配置');

// 测试数据库连接
let dbStatus = 'unknown';
try {
  console.log('正在测试数据库连接...');
  
  // 直接使用Prisma客户端测试连接
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  console.log('Prisma客户端已创建');
  
  // 测试连接
  prisma.$connect().then(() => {
    console.log('✅ 数据库连接成功');
    dbStatus = 'connected';
    
    // 测试查询
    return prisma.$queryRaw`SELECT 1 as test`;
  }).then((result) => {
    console.log('✅ 数据库查询测试成功:', result);
    dbStatus = 'connected';
  }).catch((error) => {
    console.error('❌ 数据库连接失败:', error);
    dbStatus = 'failed';
  });
  
} catch (error) {
  console.error('❌ 数据库配置失败:', error);
  dbStatus = 'failed';
}

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: '最小数据库服务器运行正常',
    database: dbStatus,
    env: {
      DATABASE_URL: process.env.DATABASE_URL ? '已设置' : '未设置',
      NODE_ENV: process.env.NODE_ENV || 'development'
    }
  });
});

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'IoT Platform Minimal Database Server',
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
app.listen(port, () => {
  console.log(`=== 最小数据库服务器启动成功 ===`);
  console.log(`端口: ${port}`);
  console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`健康检查: http://localhost:${port}/health`);
});

export default app;
