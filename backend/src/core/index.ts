/**
 * IoT 平台核心模块
 * 提供认证、动态凭证、适配器、影子机制、限流、日志、幂等、插件加载器
 */

// 核心服务器
export { IoTPlatformServer } from './server';

// 安全模块
export * from './security/auth';
export * from './security/credentials';

// 中间件
export * from './middleware/rate-limiter';
export * from './middleware/idempotency';
export * from './middleware/errorHandler';

// 数据库和容器
export * from './db/container';

// MQTT和协议
export * from './mqtt/adapters';

// 影子机制
export * from './shadow';

// 插件系统
export * from './plugin-loader';
export * from './plugin-interface';
export * from './tenant-plugin';
export * from './device-plugin';

// 设备引导
export * from './bootstrap/device-bootstrap';
