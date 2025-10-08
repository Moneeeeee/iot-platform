/**
 * 设备引导请求类型定义
 * 
 * 设备上电时向服务器发送的引导请求，包含设备身份信息和能力描述
 * 服务器基于此信息生成动态配置并返回给设备
 */

// DeviceFirmware 接口已移动到 bootstrap-response.ts 中

export interface DeviceHardware {
  /** 硬件版本/型号 */
  version: string;
  /** 硬件序列号 */
  serial: string;
  /** 硬件描述 */
  description?: string;
}

export interface DeviceCapability {
  /** 能力名称 */
  name: string;
  /** 能力版本 */
  version?: string;
  /** 能力参数 */
  params?: Record<string, any>;
}

export interface DeviceBootstrapRequest {
  /** 设备唯一标识符 */
  deviceId: string;
  /** 设备MAC地址 */
  mac: string;
  /** 固件信息 */
  firmware: {
    current: string;
    build: string;
    minRequired: string;
    channel?: "stable" | "beta" | "dev";
  };
  /** 硬件信息 */
  hardware: DeviceHardware;
  /** 设备能力列表 */
  capabilities: DeviceCapability[];
  /** 设备类型 */
  deviceType: string;
  /** 租户标识符（可选，优先从中间件获取） */
  tenantId?: string;
  /** 请求时间戳 */
  timestamp: number;
  /** 设备密钥签名（用于验证请求完整性） */
  signature?: string;
  /** 消息ID（用于幂等性处理） */
  messageId?: string;
}

/**
 * 引导请求验证结果
 */
export interface BootstrapValidationResult {
  /** 验证是否通过 */
  isValid: boolean;
  /** 错误信息 */
  errors: string[];
  /** 验证后的设备信息 */
  deviceInfo?: Partial<DeviceBootstrapRequest>;
}
