/**
 * 通用设备引导服务
 * 支持多租户、多设备类型、动态凭证、影子机制
 * 所有设备类型共用此服务
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';
import crypto from 'crypto';

const prisma = new PrismaClient();

// 消息去重缓存 - 使用内存Map实现简单的去重机制
const messageDeduplicationCache = new Map<string, number>();
const DEDUP_WINDOW_MS = 300000; // 5分钟去重窗口

/**
 * 设备引导配置接口
 */
export interface BootstrapRequest {
  device_id?: string;
  mac_address?: string;
  board_name?: string;
  firmware_version?: string;
  hardware_version?: string;
  capabilities?: string[];
  tenant_info?: {
    tenant_id?: string;
    tenant_name?: string;
  };
  device_type?: string;
  architecture_version?: string;
}

/**
 * 生成完整的引导配置 - 通用实现
 * 支持所有设备类型和租户
 */
export async function generateBootstrapConfig(deviceInfo: BootstrapRequest) {
  const currentTime = Date.now();
  const deviceId = deviceInfo.device_id || deviceInfo.mac_address;
  const tenantId = await resolveTenant(deviceInfo);
  const deviceType = determineDeviceType(deviceInfo);
  const deviceCapabilities = extractDeviceCapabilities(deviceInfo);
  
  // 生成动态凭证（短期有效）
  const credentials = generateSecureCredentials(deviceId, tenantId, deviceType);
  
  // 构建主题结构: iot/{tenant}/{deviceType}/{deviceId}/{channel}/{subchannel?}
  const topicPrefix = `iot/${tenantId}/${deviceType}/${deviceId}`;
  
  // 获取设备策略配置
  const devicePolicies = await getDevicePolicies(tenantId, deviceType, deviceCapabilities);
  
  // 获取影子期望态
  const shadowDesired = await getShadowDesired(tenantId, deviceId, deviceType);
  
  // 获取OTA决策
  const otaDecision = await getOTADecision(deviceInfo, tenantId, deviceType);
  
  const config = {
    cfg: {
      ver: "2.0",
      issued_at: currentTime,
      expires_at: currentTime + (24 * 60 * 60 * 1000), // 24小时
      tenant: tenantId,
      device: {
        id: deviceId,
        type: deviceType,
        unique_id: deviceInfo.mac_address || deviceId,
        fw: {
          current: deviceInfo.firmware_version || "1.0.0",
          min_required: devicePolicies.min_firmware_version || "1.0.0"
        },
        hw: deviceInfo.hardware_version || "v1.0",
        capabilities: deviceCapabilities
      }
    },
    
    mqtt: {
      brokers: await getMQTTBrokers(tenantId, deviceType),
      client_id: `iot_${tenantId}_${deviceType}_${deviceId}`,
      username: credentials.username,
      password: credentials.password,
      password_expires_at: credentials.expires_at,
      keepalive: devicePolicies.keepalive_interval || 60,
      clean_start: devicePolicies.use_clean_start !== false,
      session_expiry: devicePolicies.session_expiry || 3600,
      tls: {
        enabled: devicePolicies.tls_enabled || false,
        ca_cert_fingerprint: devicePolicies.ca_cert_fingerprint
      },
      lwt: {
        topic: `${topicPrefix}/status`,
        qos: 1,
        retain: true,
        payload: {
          ts: new Date().toISOString(),
          online: false,
          reason: "unexpected_disconnect",
          msgId: generateMessageId()
        }
      },
      topics: {
        telemetry_pub: `${topicPrefix}/telemetry`,
        status_pub: `${topicPrefix}/status`,
        event_pub: `${topicPrefix}/event`,
        cmd_sub: `${topicPrefix}/cmd`,
        cmdres_pub: `${topicPrefix}/cmdres`,
        shadow_desired_sub: `${topicPrefix}/shadow/desired`,
        shadow_reported_pub: `${topicPrefix}/shadow/reported`,
        cfg_sub: `${topicPrefix}/cfg`,
        ota_progress_pub: `${topicPrefix}/ota/progress`
      },
      qos_retain_policy: devicePolicies.qos_retain_policy,
      acl: {
        publish: [
          `${topicPrefix}/telemetry`,
          `${topicPrefix}/status`,
          `${topicPrefix}/event`,
          `${topicPrefix}/cmdres`,
          `${topicPrefix}/shadow/reported`,
          `${topicPrefix}/ota/progress`
        ],
        subscribe: [
          `${topicPrefix}/cmd`,
          `${topicPrefix}/shadow/desired`,
          `${topicPrefix}/cfg`
        ]
      },
      backoff: devicePolicies.backoff_strategy
    },
    
    shadow_desired: shadowDesired,
    
    ota: otaDecision,
    
    policies: {
      ingest_limits: devicePolicies.ingest_limits,
      retention: devicePolicies.retention_policy,
      message_deduplication: {
        enabled: true,
        window_ms: DEDUP_WINDOW_MS
      }
    },
    
    server_time: {
      timestamp: currentTime,
      timezone_off: 480 // UTC+8
    },
    
    websocket: {
      enabled: devicePolicies.websocket_enabled || false,
      url: `wss://${process.env.SERVER_HOST || 'fountain.top'}/ws/iot/${tenantId}/${deviceType}/${deviceId}`,
      reconnect_ms: 5000,
      heartbeat_ms: 30000,
      timeout_ms: 10000
    },
    
    retry_after_ms: 5000,
    signature: generateSecureSignature(deviceInfo, currentTime, tenantId)
  };
  
  return config;
}

/**
 * 解析租户信息 - 通用实现
 */
async function resolveTenant(deviceInfo: BootstrapRequest): Promise<string> {
  // 优先使用设备提供的租户信息
  if (deviceInfo.tenant_info?.tenant_id) {
    return deviceInfo.tenant_info.tenant_id;
  }
  
  // 根据设备类型或MAC地址确定租户
  if (deviceInfo.mac_address) {
    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          { name: 'default' },
          { config: { path: ['device_mac_prefixes'], array_contains: [deviceInfo.mac_address.substring(0, 8)] } }
        ]
      }
    });
    
    if (tenant) return tenant.id;
  }
  
  // 创建默认租户
  const defaultTenant = await prisma.tenant.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      name: 'default',
      slug: 'default',
      config: {}
    }
  });
  
  return defaultTenant.id;
}

/**
 * 确定设备类型 - 通用实现
 */
function determineDeviceType(deviceInfo: BootstrapRequest): string {
  // 优先使用设备指定的类型
  if (deviceInfo.device_type) {
    return deviceInfo.device_type;
  }
  
  // 根据板卡名称推断类型
  if (deviceInfo.board_name) {
    if (deviceInfo.board_name.includes('PS-1000')) return 'powersafe-datacenter';
    if (deviceInfo.board_name.includes('PS-2000')) return 'powersafe-industrial';
    if (deviceInfo.board_name.includes('PS-3000')) return 'powersafe-residential';
    if (deviceInfo.board_name.includes('PS-')) return 'powersafe-generic';
    
    // 其他设备类型
    if (deviceInfo.board_name.includes('ESP32')) return 'esp32-generic';
    if (deviceInfo.board_name.includes('Arduino')) return 'arduino-generic';
    if (deviceInfo.board_name.includes('Raspberry')) return 'raspberry-pi';
  }
  
  return 'generic-device';
}

/**
 * 提取设备能力 - 通用实现
 */
function extractDeviceCapabilities(deviceInfo: BootstrapRequest): string[] {
  const capabilities = ['telemetry', 'status', 'commands', 'ota'];
  
  // 根据设备类型添加特定能力
  if (deviceInfo.board_name?.includes('PS-1000')) {
    capabilities.push('high-frequency-sampling', 'data-center-mode');
  }
  
  if (deviceInfo.board_name?.includes('PS-2000')) {
    capabilities.push('industrial-grade', 'extended-temperature');
  }
  
  if (deviceInfo.board_name?.includes('PS-3000')) {
    capabilities.push('low-power-mode', 'residential-grade');
  }
  
  // 添加设备指定的能力
  if (deviceInfo.capabilities && Array.isArray(deviceInfo.capabilities)) {
    capabilities.push(...deviceInfo.capabilities);
  }
  
  return [...new Set(capabilities)]; // 去重
}

/**
 * 生成安全凭证 - 通用实现
 */
function generateSecureCredentials(deviceId: string, tenantId: string, deviceType: string) {
  const currentTime = Date.now();
  const expiresAt = currentTime + (24 * 60 * 60 * 1000); // 24小时过期
  
  const username = `iot_${tenantId}_${deviceType}_${deviceId}`;
  const secretKey = process.env.MQTT_SECRET_KEY || 'default-secret-key';
  
  // 使用HMAC-SHA256生成密码
  const password = crypto
    .createHmac('sha256', secretKey)
    .update(`${username}_${expiresAt}_${deviceType}`)
    .digest('base64')
    .substring(0, 32); // 限制长度
    
  return {
    username,
    password,
    expires_at: expiresAt
  };
}

/**
 * 获取MQTT Broker列表 - 通用实现
 */
async function getMQTTBrokers(tenantId: string, deviceType: string) {
  const brokers = [
    {
      url: process.env.MQTT_BROKER_URL || "mqtt://emqx:1883",
      priority: 1
    }
  ];
  
  // 可以根据租户或设备类型添加备用broker
  if (deviceType.includes('datacenter') || deviceType.includes('industrial')) {
    brokers.push({
      url: process.env.MQTT_BACKUP_BROKER_URL || "mqtt://emqx-backup:1883",
      priority: 2
    });
  }
  
  return brokers;
}

/**
 * 获取设备策略配置 - 通用实现
 */
async function getDevicePolicies(tenantId: string, deviceType: string, capabilities: string[]) {
  // 从数据库获取租户策略，这里简化实现
  const policies = {
    // 基础配置
    keepalive_interval: 60,
    use_clean_start: !capabilities.includes('persistent-session'),
    session_expiry: capabilities.includes('persistent-session') ? 86400 : 3600,
    tls_enabled: process.env.MQTT_TLS_ENABLED === 'true',
    ca_cert_fingerprint: process.env.MQTT_CA_CERT_FINGERPRINT,
    websocket_enabled: true,
    
    // QoS和Retain策略
    qos_retain_policy: {
      [`iot/${tenantId}/${deviceType}/+/telemetry`]: { qos: 1, retain: false },
      [`iot/${tenantId}/${deviceType}/+/status`]: { qos: 1, retain: true },
      [`iot/${tenantId}/${deviceType}/+/event`]: { qos: 1, retain: false },
      [`iot/${tenantId}/${deviceType}/+/cmd`]: { qos: 1, retain: false },
      [`iot/${tenantId}/${deviceType}/+/cmdres`]: { qos: 1, retain: false },
      [`iot/${tenantId}/${deviceType}/+/shadow/desired`]: { qos: 1, retain: true },
      [`iot/${tenantId}/${deviceType}/+/shadow/reported`]: { qos: 1, retain: true },
      [`iot/${tenantId}/${deviceType}/+/cfg`]: { qos: 1, retain: true },
      [`iot/${tenantId}/${deviceType}/+/ota/progress`]: { qos: 1, retain: false }
    },
    
    // 退避策略
    backoff_strategy: {
      base_ms: 1000,
      max_ms: 30000,
      jitter: true,
      multiplier: 2.0
    },
    
    // 数据摄取限制
    ingest_limits: {
      telemetry_qps: getTelemetryQPS(deviceType, capabilities),
      status_qps: 1,
      event_qps: 5
    },
    
    // 数据保留策略
    retention_policy: {
      telemetry_days: 30,
      status_days: 90,
      events_days: 180,
      commands_days: 30
    },
    
    // 固件版本要求
    min_firmware_version: "1.0.0"
  };
  
  return policies;
}

/**
 * 获取影子期望态 - 通用实现
 */
async function getShadowDesired(tenantId: string, deviceId: string, deviceType: string) {
  // 从数据库获取设备期望配置
  const device = await prisma.device.findFirst({
    where: {
      tenantId,
      slug: deviceId.replace(/:/g, '-').toLowerCase()
    }
  });
  
  const defaultConfig = {
    reporting: {
      heartbeat_ms: getHeartbeatInterval(deviceType),
      telemetry_interval_ms: getTelemetryInterval(deviceType)
    },
    sensors: {
      sampling_ms: getSamplingInterval(deviceType),
      enabled_sensors: getEnabledSensors(deviceType)
    },
    thresholds: getDefaultThresholds(deviceType),
    features: {
      alarm_enabled: true,
      auto_reboot_days: 7,
      low_power_mode: deviceType.includes('residential') || deviceType.includes('low-power'),
      data_compression: deviceType.includes('datacenter') || deviceType.includes('high-frequency')
    },
    maintenance: {
      auto_update_enabled: true,
      maintenance_window: "02:00-06:00",
      timezone: "Asia/Shanghai"
    }
  };
  
  // 合并设备特定配置
  if (device?.connectionInfo && typeof device.connectionInfo === 'object') {
    return { ...defaultConfig, ...device.connectionInfo };
  }
  
  return defaultConfig;
}

/**
 * 获取OTA决策 - 通用实现
 */
async function getOTADecision(deviceInfo: BootstrapRequest, tenantId: string, deviceType: string) {
  const currentVersion = deviceInfo.firmware_version || "1.0.0";
  const latestVersion = "1.2.0";
  const needsUpdate = compareVersions(currentVersion, latestVersion) < 0;
  
  if (!needsUpdate) {
    return {
      available: false,
      firmware: null,
      retry: {
        base_ms: 5000,
        max_ms: 300000
      }
    };
  }
  
  // 检查OTA约束条件
  const constraints = await getOTAConstraints(tenantId, deviceType, deviceInfo);
  
  return {
    available: true,
    firmware: {
      id: `fw_${latestVersion}_${deviceType}`,
      version: latestVersion,
      url: `https://${process.env.SERVER_HOST || 'fountain.top'}/api/ota/download/${latestVersion}`,
      checksum: "sha256:abc123def456...",
      size: 2048576,
      release_notes: "固件更新：\n- 优化性能\n- 增强稳定性\n- 修复已知问题",
      force: 0,
      constraints: constraints
    },
    retry: {
      base_ms: 5000,
      max_ms: 300000
    }
  };
}

/**
 * 获取OTA约束条件 - 通用实现
 */
async function getOTAConstraints(tenantId: string, deviceType: string, deviceInfo: BootstrapRequest) {
  return {
    min_battery_pct: 20,
    network: "wifi",
    time_window: "02:00-06:00",
    device_type: deviceType,
    tenant_id: tenantId,
    rollout_percentage: 50, // 50%的设备可以升级
    region: "asia-pacific",
    tags: ["stable", "production"]
  };
}

/**
 * 生成安全签名 - 通用实现
 */
function generateSecureSignature(deviceInfo: BootstrapRequest, timestamp: number, tenantId: string): string {
  const secret = process.env.BOOTSTRAP_SECRET_KEY || 'default-bootstrap-secret';
  const deviceId = deviceInfo.device_id || deviceInfo.mac_address;
  const payload = `${deviceId}_${tenantId}_${timestamp}`;
  
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

/**
 * 生成消息ID
 */
function generateMessageId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 记录引导事件 - 通用实现
 */
export async function recordBootstrapEvent(deviceInfo: BootstrapRequest, config: any) {
  try {
    // 使用日志记录引导事件，因为deviceEvent表可能不存在
    logger.info('Device bootstrap event', {
      deviceId: deviceInfo.device_id || deviceInfo.mac_address,
      eventType: 'BOOTSTRAP',
      level: 'INFO',
      title: 'Device Bootstrap',
      message: 'Device successfully bootstrapped',
      data: {
        deviceInfo,
        configVersion: config.cfg.ver,
        tenantId: config.cfg.tenant,
        deviceType: config.cfg.device.type
      },
      timestamp: new Date()
    });
  } catch (error) {
    logger.error('Failed to record bootstrap event', error);
  }
}

// ==========================================
// 辅助函数 - 通用实现
// ==========================================

/**
 * 获取心跳间隔
 */
function getHeartbeatInterval(deviceType: string): number {
  if (deviceType.includes('datacenter')) return 10000;  // 10秒
  if (deviceType.includes('industrial')) return 30000;  // 30秒
  if (deviceType.includes('residential') || deviceType.includes('low-power')) return 60000; // 1分钟
  return 30000;
}

/**
 * 获取遥测间隔
 */
function getTelemetryInterval(deviceType: string): number {
  if (deviceType.includes('datacenter')) return 1000;   // 1秒
  if (deviceType.includes('industrial')) return 5000;   // 5秒
  if (deviceType.includes('residential') || deviceType.includes('low-power')) return 30000; // 30秒
  return 5000;
}

/**
 * 获取采样间隔
 */
function getSamplingInterval(deviceType: string): number {
  if (deviceType.includes('datacenter')) return 500;  // 500ms
  if (deviceType.includes('industrial')) return 1000; // 1s
  if (deviceType.includes('residential') || deviceType.includes('low-power')) return 5000; // 5s
  return 1000;
}

/**
 * 获取启用的传感器
 */
function getEnabledSensors(deviceType: string): string[] {
  const baseSensors = ['voltage', 'current', 'power', 'frequency', 'temperature'];
  
  if (deviceType.includes('datacenter')) {
    return [...baseSensors, 'power_factor', 'energy_total', 'harmonics'];
  }
  
  if (deviceType.includes('industrial')) {
    return [...baseSensors, 'vibration', 'humidity'];
  }
  
  return baseSensors;
}

/**
 * 获取默认阈值配置
 */
function getDefaultThresholds(deviceType: string) {
  const baseThresholds = {
    voltage: { min: 180, max: 250, alarm_enabled: true },
    current: { min: 0, max: getCurrentThreshold(deviceType), alarm_enabled: true },
    power: { min: 0, max: getPowerThreshold(deviceType), alarm_enabled: true }
  };
  
  return baseThresholds;
}

/**
 * 获取电流阈值
 */
function getCurrentThreshold(deviceType: string): number {
  if (deviceType.includes('datacenter')) return 100;
  if (deviceType.includes('industrial')) return 200;
  if (deviceType.includes('residential')) return 50;
  return 80;
}

/**
 * 获取功率阈值
 */
function getPowerThreshold(deviceType: string): number {
  if (deviceType.includes('datacenter')) return 50000;
  if (deviceType.includes('industrial')) return 100000;
  if (deviceType.includes('residential')) return 15000;
  return 25000;
}

/**
 * 获取遥测QPS限制
 */
function getTelemetryQPS(deviceType: string, capabilities: string[]): number {
  let baseQPS = 3;
  
  if (deviceType.includes('datacenter')) baseQPS = 10;
  else if (deviceType.includes('industrial')) baseQPS = 5;
  else if (deviceType.includes('residential') || deviceType.includes('low-power')) baseQPS = 2;
  
  // 高频采样能力增加QPS
  if (capabilities.includes('high-frequency-sampling')) {
    baseQPS *= 2;
  }
  
  return baseQPS;
}

/**
 * 版本比较函数
 */
function compareVersions(version1: string, version2: string): number {
  const v1parts = version1.split('.').map(Number);
  const v2parts = version2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
    const v1part = v1parts[i] || 0;
    const v2part = v2parts[i] || 0;
    
    if (v1part < v2part) return -1;
    if (v1part > v2part) return 1;
  }
  
  return 0;
}

/**
 * 消息去重检查 - 通用实现
 */
export function isMessageDuplicate(deviceId: string, msgId: string): boolean {
  const key = `${deviceId}:${msgId}`;
  const now = Date.now();
  
  // 清理过期条目
  for (const [k, timestamp] of messageDeduplicationCache.entries()) {
    if (now - timestamp > DEDUP_WINDOW_MS) {
      messageDeduplicationCache.delete(k);
    }
  }
  
  // 检查是否重复
  if (messageDeduplicationCache.has(key)) {
    return true;
  }
  
  // 记录消息
  messageDeduplicationCache.set(key, now);
  return false;
}
