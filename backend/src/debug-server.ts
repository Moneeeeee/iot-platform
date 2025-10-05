/**
 * 调试服务器
 * 用于逐步排查问题
 */

import express from 'express';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

console.log('=== 开始启动调试服务器 ===');

const app = express();
const port = process.env.PORT || 8000;

console.log('Express应用已创建');

// 基本中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

console.log('中间件已配置');

// 健康检查端点
app.get('/health', (req, res) => {
  console.log('健康检查请求');
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: '调试服务器运行正常'
  });
});

console.log('路由已配置');

// 根路径
app.get('/', (req, res) => {
  console.log('根路径请求');
  res.json({
    success: true,
    message: 'IoT Platform Debug Server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

console.log('所有路由已配置');

// 错误处理
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('错误处理中间件:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString(),
  });
});

console.log('错误处理已配置');

// 启动服务器
console.log('准备启动服务器...');
app.listen(port, () => {
  console.log(`=== 调试服务器启动成功 ===`);
  console.log(`端口: ${port}`);
  console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`健康检查: http://localhost:${port}/health`);
});

console.log('服务器启动代码已执行');

export default app;
