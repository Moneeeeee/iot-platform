/**
 * 设备引导响应类型定义
 * 
 * 服务器返回给设备的完整配置信息，包含MQTT连接配置、OTA决策、
 * 设备策略、安全信息等，设备基于此配置完成初始化
 */

// 导入设备固件类型
export interface DeviceFirmware {
  /** 当前固件版本 */
  current: string;
  /** 固件构建号 */
  build: string;
  /** 最低要求版本 */
  minRequired: string;
  /** 发布通道 */
  channel?: "stable" | "beta" | "dev";
}

export interface MqttBroker {
  /** MQTT Broker URL */
  url: string;
  /** 连接优先级（数字越小优先级越高） */
  priority: number;
}

export interface MqttTls {
  /** 是否启用TLS */
  enabled: boolean;
  /** CA证书指纹（用于证书验证） */
  caCertFingerprint?: string;
}

export interface MqttLwt {
  /** 遗嘱主题 */
  topic: string;
  /** QoS等级 */
  qos: number;
  /** 是否保留消息 */
  retain: boolean;
  /** 遗嘱消息内容 */
  payload: {
    ts: string;
    online: boolean;
    reason: string;
  };
}

export interface MqttTopics {
  /** 遥测数据发布主题 */
  telemetryPub: string;
  /** 状态信息发布主题 */
  statusPub: string;
  /** 事件信息发布主题 */
  eventPub: string;
  /** 命令订阅主题 */
  cmdSub: string;
  /** 命令响应发布主题 */
  cmdresPub: string;
  /** 影子期望状态订阅主题 */
  shadowDesiredSub: string;
  /** 影子报告状态发布主题 */
  shadowReportedPub: string;
  /** 配置订阅主题 */
  cfgSub: string;
  /** OTA进度发布主题 */
  otaProgressPub: string;
}

export interface MqttQosRetainPolicy {
  /** 主题模式 */
  topic: string;
  /** QoS等级 */
  qos: number;
  /** 是否保留消息 */
  retain: boolean;
}

export interface MqttAcl {
  /** 允许发布的主题列表 */
  publish: string[];
  /** 允许订阅的主题列表 */
  subscribe: string[];
}

export interface MqttBackoff {
  /** 基础退避时间（毫秒） */
  baseMs: number;
  /** 最大退避时间（毫秒） */
  maxMs: number;
  /** 是否启用抖动 */
  jitter: boolean;
}

export interface MqttConfig {
  /** MQTT Broker列表 */
  brokers: MqttBroker[];
  /** 客户端ID */
  clientId: string;
  /** 用户名 */
  username: string;
  /** 密码 */
  password: string;
  /** 密码过期时间戳 */
  passwordExpiresAt: number;
  /** 心跳间隔（秒） */
  keepalive: number;
  /** 是否清理会话 */
  cleanStart: boolean;
  /** 会话过期时间（秒） */
  sessionExpiry: number;
  /** TLS配置 */
  tls: MqttTls;
  /** 遗嘱配置 */
  lwt: MqttLwt;
  /** 主题配置 */
  topics: MqttTopics;
  /** QoS和Retain策略 */
  qosRetainPolicy: MqttQosRetainPolicy[];
  /** 访问控制列表 */
  acl: MqttAcl;
  /** 退避策略 */
  backoff: MqttBackoff;
}

export interface ShadowDesired {
  /** 上报策略 */
  reporting: {
    /** 心跳间隔（毫秒） */
    heartbeatMs: number;
  };
  /** 传感器配置 */
  sensors: {
    /** 采样间隔（毫秒） */
    samplingMs: number;
  };
  /** 阈值配置 */
  thresholds: {
    voltage?: { min: number; max: number };
    current?: { min: number; max: number };
    power?: { min: number; max: number };
  };
  /** 功能开关 */
  features: {
    /** 是否启用告警 */
    alarmEnabled: boolean;
    /** 自动重启天数 */
    autoRebootDays: number;
  };
}

export interface OtaConstraints {
  /** 最小电量百分比 */
  minBatteryPct?: number;
  /** 网络要求 */
  network?: string;
  /** 时间窗口 */
  timeWindow?: string;
}

export interface OtaFirmware {
  /** 固件ID */
  id: string;
  /** 固件版本 */
  version: string;
  /** 下载URL */
  url: string;
  /** 校验和 */
  checksum: string;
  /** 文件大小（字节） */
  size: number;
  /** 发布说明 */
  releaseNotes: string;
  /** 强制升级标志 */
  force: number;
  /** 升级约束 */
  constraints: OtaConstraints;
}

export interface OtaRetry {
  /** 基础重试时间（毫秒） */
  baseMs: number;
  /** 最大重试时间（毫秒） */
  maxMs: number;
}

export interface OtaConfig {
  /** 是否有可用的OTA */
  available: boolean;
  /** 固件信息 */
  firmware?: OtaFirmware;
  /** 重试策略 */
  retry: OtaRetry;
}

export interface IngestLimits {
  /** 遥测数据QPS限制 */
  telemetryQps: number;
  /** 状态数据QPS限制 */
  statusQps: number;
}

export interface RetentionPolicies {
  /** 遥测数据保留天数 */
  telemetryDays: number;
  /** 状态数据保留天数 */
  statusDays: number;
  /** 事件数据保留天数 */
  eventsDays: number;
}

export interface Policies {
  /** 数据摄入限制 */
  ingestLimits: IngestLimits;
  /** 数据保留策略 */
  retention: RetentionPolicies;
}

export interface ServerTime {
  /** 服务器时间戳 */
  timestamp: number;
  /** 时区偏移（秒） */
  timezoneOffset: number;
}

export interface WebSocketConfig {
  /** 是否启用WebSocket */
  enabled: boolean;
  /** WebSocket URL */
  url: string;
  /** 重连间隔（毫秒） */
  reconnectMs: number;
  /** 心跳间隔（毫秒） */
  heartbeatMs: number;
  /** 超时时间（毫秒） */
  timeoutMs: number;
}

export interface BootstrapConfig {
  /** 配置版本 */
  ver: string;
  /** 发布时间戳 */
  issuedAt: number;
  /** 过期时间戳 */
  expiresAt: number;
  /** 租户标识 */
  tenant: string;
  /** 设备信息 */
  device: {
    id: string;
    type: string;
    uniqueId: string;
    fw: DeviceFirmware;
    hw: string;
    capabilities: string[];
  };
}

/**
 * 引导响应数据内容
 * 包含设备引导所需的所有配置信息
 */
export interface DeviceBootstrapResponse {
  /** 配置信息 */
  cfg: BootstrapConfig;
  /** MQTT配置 */
  mqtt: MqttConfig;
  /** 影子期望状态 */
  shadowDesired: ShadowDesired;
  /** OTA配置 */
  ota: OtaConfig;
  /** 策略配置 */
  policies: Policies;
  /** 服务器时间 */
  serverTime: ServerTime;
  /** WebSocket配置 */
  websocket: WebSocketConfig;
}

/**
 * 引导响应封装层
 * 统一处理响应元数据、签名验证、错误码等
 */
export interface BootstrapResponseEnvelope {
  /** 响应状态码 */
  code: number;
  /** 响应消息 */
  message: string;
  /** 响应时间戳 */
  timestamp: number;
  /** 响应签名 */
  signature: string;
  /** 重试间隔（毫秒，仅在需要重试时返回） */
  retryAfterMs?: number;
  /** 错误码（仅在错误时返回） */
  errorCode?: string;
  /** 错误详情（仅在错误时返回） */
  errorDetails?: Record<string, any>;
  /** 响应数据 */
  data: DeviceBootstrapResponse;
}
