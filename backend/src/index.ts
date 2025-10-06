/**
 * IoT设备管理平台后端服务入口文件
 * 使用新的核心+插件+配置中心架构
 */

import dotenv from 'dotenv';
import { logger } from './common/logger';
import { IoTPlatformServer } from './core/server';

// 加载环境变量
dotenv.config();

/**
 * 启动 IoT 平台服务器
 */
async function startServer() {
  try {
    logger.info('Starting IoT Platform Server...');
    
    // 创建服务器实例
    const server = new IoTPlatformServer();
    
    // 启动服务器
    await server.start();
    
    logger.info('IoT Platform Server started successfully');
  } catch (error) {
    logger.error('Failed to start IoT Platform Server:', error);
    process.exit(1);
  }
}

// 启动服务器
startServer();
