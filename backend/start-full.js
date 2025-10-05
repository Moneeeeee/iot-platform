/**
 * 完整版后端启动脚本
 * 使用ts-node运行TypeScript文件
 */

// 注册TypeScript路径映射
require('tsconfig-paths/register');

// 加载环境变量
require('dotenv').config();

// 使用ts-node运行TypeScript文件
require('ts-node/register');

// 启动完整的TypeScript应用
require('./src/index.ts');
