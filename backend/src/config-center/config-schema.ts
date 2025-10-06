/**
 * 配置模型定义
 * 定义租户、设备、MQTT、OTA等配置的数据结构
 */

// 租户配置模型
export interface TenantConfigSchema {
  general: {
    siteName: string;
    defaultLanguage: string;
    timezone: string;
    theme: string;
  };
  limits: {
    maxDevices: number;
    maxUsers: number;
    maxTemplates: number;
    maxFirmwares: number;
    maxStorageGB: number;
    maxApiCallsPerMinute: number;
  };
  retention: {
    telemetryDays: number;
    statusDays: number;
    eventsDays: number;
    commandsDays: number;
    logsDays: number;
  };
  billing: {
    enabled: boolean;
    currency: string;
    ratePerDevice: number;
    ratePerUser: number;
    ratePerGB: number;
  };
  security: {
    passwordPolicy: {
      minLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumbers: boolean;
      requireSpecialChars: boolean;
    };
    sessionTimeout: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
  };
  notifications: {
    email: {
      enabled: boolean;
      smtpHost: string;
      smtpPort: number;
      smtpUser: string;
      smtpPassword: string;
    };
    webhook: {
      enabled: boolean;
      url: string;
      secret: string;
    };
  };
  features: {
    analytics: boolean;
    reports: boolean;
    alerts: boolean;
    ota: boolean;
    shadow: boolean;
    customApi: boolean;
  };
}

// 设备配置模型
export interface DeviceConfigSchema {
  sampling: {
    heartbeatInterval: number; // 心跳间隔 (ms)
    telemetryInterval: number; // 遥测数据上报间隔 (ms)
    samplingInterval: number;  // 传感器采样间隔 (ms)
    batchSize: number;         // 批量上报大小
  };
  sensors: {
    enabledSensors: string[];
    sensorConfigs: Record<string, {
      enabled: boolean;
      samplingRate: number;
      thresholds: {
        min: number;
        max: number;
        alarmEnabled: boolean;
      };
    }>;
  };
  thresholds: {
    voltage: { min: number; max: number; alarmEnabled: boolean };
    current: { min: number; max: number; alarmEnabled: boolean };
    power: { min: number; max: number; alarmEnabled: boolean };
    temperature: { min: number; max: number; alarmEnabled: boolean };
    humidity: { min: number; max: number; alarmEnabled: boolean };
    [key: string]: any;
  };
  features: {
    alarmEnabled: boolean;
    autoRebootDays: number;
    lowPowerMode: boolean;
    dataCompression: boolean;
    encryption: boolean;
    backupEnabled: boolean;
  };
  maintenance: {
    autoUpdateEnabled: boolean;
    maintenanceWindow: string; // "02:00-06:00"
    timezone: string;
    backupSchedule: string;    // "0 2 * * *"
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
  communication: {
    protocol: 'mqtt' | 'http' | 'websocket' | 'udp';
    qos: 0 | 1 | 2;
    retain: boolean;
    timeout: number;
    retryAttempts: number;
  };
}

// MQTT配置模型
export interface MQTTConfigSchema {
  brokers: Array<{
    url: string;
    priority: number;
    weight: number;
  }>;
  client: {
    keepAlive: number;
    cleanStart: boolean;
    sessionExpiry: number;
    receiveMaximum: number;
    maximumPacketSize: number;
  };
  tls: {
    enabled: boolean;
    caCert?: string;
    clientCert?: string;
    clientKey?: string;
    rejectUnauthorized: boolean;
  };
  qosRetainPolicy: Record<string, {
    qos: 0 | 1 | 2;
    retain: boolean;
  }>;
  backoff: {
    baseMs: number;
    maxMs: number;
    jitter: boolean;
    multiplier: number;
  };
  acl: {
    enabled: boolean;
    rules: Array<{
      topic: string;
      permission: 'read' | 'write' | 'readwrite';
      qos: 0 | 1 | 2;
    }>;
  };
}

// OTA配置模型
export interface OTAConfigSchema {
  enabled: boolean;
  repository: {
    baseUrl: string;
    authRequired: boolean;
    apiKey?: string;
    username?: string;
    password?: string;
  };
  versioning: {
    latestVersion: string;
    minRequiredVersion: string;
    forceUpdate: boolean;
    rollbackEnabled: boolean;
  };
  rollout: {
    strategy: 'all' | 'percentage' | 'tags' | 'regions' | 'canary';
    percentage?: number;
    conditions?: {
      minBatteryLevel?: number;
      networkType?: string[]; // ['wifi', 'cellular', 'ethernet']
      timeWindow?: string;    // "02:00-06:00"
      deviceTags?: string[];
      regions?: string[];
      firmwareVersion?: string;
    };
    canary?: {
      enabled: boolean;
      percentage: number;
      duration: number; // hours
      successThreshold: number; // percentage
    };
  };
  download: {
    retryAttempts: number;
    timeout: number; // ms
    chunkSize: number; // bytes
    parallelDownloads: number;
    checksumVerification: boolean;
  };
  install: {
    autoInstall: boolean;
    installWindow: string; // "02:00-06:00"
    rollbackOnFailure: boolean;
    maxInstallTime: number; // minutes
    preInstallScript?: string;
    postInstallScript?: string;
  };
  notification: {
    enabled: boolean;
    channels: ('email' | 'webhook' | 'mqtt')[];
    recipients: string[];
    events: ('started' | 'completed' | 'failed' | 'rollback')[];
  };
}

// 系统配置模型
export interface SystemConfigSchema {
  server: {
    host: string;
    port: number;
    ssl: {
      enabled: boolean;
      certPath?: string;
      keyPath?: string;
    };
  };
  database: {
    url: string;
    maxConnections: number;
    connectionTimeout: number;
    queryTimeout: number;
  };
  redis: {
    url: string;
    maxConnections: number;
    retryAttempts: number;
    retryDelay: number;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    format: 'json' | 'text';
    output: ('console' | 'file' | 'syslog')[];
    filePath?: string;
    maxSize?: string;
    maxFiles?: number;
  };
  monitoring: {
    enabled: boolean;
    metricsInterval: number;
    healthCheckInterval: number;
    alertThresholds: {
      cpu: number;
      memory: number;
      disk: number;
      responseTime: number;
    };
  };
  security: {
    jwt: {
      secret: string;
      expiresIn: string;
      refreshExpiresIn: string;
    };
    encryption: {
      algorithm: string;
      keyLength: number;
    };
    rateLimit: {
      windowMs: number;
      maxRequests: number;
    };
  };
}

// 配置更新事件
export interface ConfigUpdateEvent {
  type: 'tenant' | 'device' | 'mqtt' | 'ota' | 'system';
  tenantId?: string;
  deviceType?: string;
  deviceId?: string;
  config: any;
  timestamp: Date;
  version: string;
  source: 'api' | 'admin' | 'system' | 'plugin';
}

// 配置验证结果
export interface ConfigValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
    code: string;
  }>;
  warnings: Array<{
    field: string;
    message: string;
    code: string;
  }>;
}

// 配置管理器接口
export interface ConfigManager {
  // 租户配置
  getTenantConfig(tenantId: string): Promise<TenantConfigSchema>;
  updateTenantConfig(tenantId: string, config: Partial<TenantConfigSchema>): Promise<void>;
  validateTenantConfig(config: any): Promise<ConfigValidationResult>;

  // 设备配置
  getDeviceConfig(tenantId: string, deviceType: string, deviceId?: string): Promise<DeviceConfigSchema>;
  updateDeviceConfig(tenantId: string, deviceType: string, config: Partial<DeviceConfigSchema>, deviceId?: string): Promise<void>;
  validateDeviceConfig(config: any): Promise<ConfigValidationResult>;

  // MQTT配置
  getMQTTConfig(tenantId: string, deviceType: string): Promise<MQTTConfigSchema>;
  updateMQTTConfig(tenantId: string, deviceType: string, config: Partial<MQTTConfigSchema>): Promise<void>;
  validateMQTTConfig(config: any): Promise<ConfigValidationResult>;

  // OTA配置
  getOTAConfig(tenantId: string, deviceType: string): Promise<OTAConfigSchema>;
  updateOTAConfig(tenantId: string, deviceType: string, config: Partial<OTAConfigSchema>): Promise<void>;
  validateOTAConfig(config: any): Promise<ConfigValidationResult>;

  // 系统配置
  getSystemConfig(): Promise<SystemConfigSchema>;
  updateSystemConfig(config: Partial<SystemConfigSchema>): Promise<void>;
  validateSystemConfig(config: any): Promise<ConfigValidationResult>;

  // 配置事件
  onConfigUpdate(callback: (event: ConfigUpdateEvent) => void): void;
  offConfigUpdate(callback: (event: ConfigUpdateEvent) => void): void;

  // 配置缓存
  clearCache(type?: string, tenantId?: string, deviceType?: string): Promise<void>;
  getCacheStats(): Promise<{
    hits: number;
    misses: number;
    size: number;
    ttl: number;
  }>;
}

export default {
  TenantConfigSchema,
  DeviceConfigSchema,
  MQTTConfigSchema,
  OTAConfigSchema,
  SystemConfigSchema,
  ConfigUpdateEvent,
  ConfigValidationResult,
  ConfigManager
};
