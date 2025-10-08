/**
 * 引导服务类型导出
 * 
 * 统一导出所有引导服务相关的类型定义，便于其他模块引用
 */

export * from './bootstrap-request';
export * from './bootstrap-response';

// 重新导出常用类型，简化引用
export type {
  DeviceBootstrapRequest,
  BootstrapValidationResult,
} from './bootstrap-request';

export type {
  DeviceBootstrapResponse,
  BootstrapResponseEnvelope,
  MqttConfig,
  OtaConfig,
  ShadowDesired,
  Policies,
} from './bootstrap-response';
