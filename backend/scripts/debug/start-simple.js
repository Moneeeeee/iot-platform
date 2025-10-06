/**
 * 简化版后端启动脚本
 * 直接运行TypeScript文件，用于快速开发和测试
 */

// 注册TypeScript路径映射
require('tsconfig-paths/register');

// 加载环境变量
require('dotenv').config();

// 使用ts-node运行TypeScript文件
require('ts-node/register');

// 启动应用
require('./src/index.ts');
