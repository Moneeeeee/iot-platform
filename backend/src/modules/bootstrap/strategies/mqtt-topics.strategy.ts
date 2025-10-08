/**
 * MQTT 主题策略服务
 * 
 * 负责主题结构与命名规范，包括：
 * 1. 主题模板生成
 * 2. 设备类型映射
 * 3. 主题版本管理
 * 4. 子设备主题支持
 */

// import { DeviceBootstrapRequest } from '../types'; // 暂时未使用

/**
 * 设备类型到主题前缀的映射
 */
export const DEVICE_TYPE_MAPPING = {
  'ps-ctrl': 'ps-ctrl',
  'dtu': 'dtu', 
  'rtu': 'rtu',
  'ftu': 'ftu',
  'sensor': 'sensor',
  'gateway': 'gateway'
} as const;

/**
 * MQTT主题模板
 */
export interface MqttTopicTemplate {
  /** 主题前缀 */
  prefix: string;
  /** 设备类型 */
  deviceType: string;
  /** 设备ID */
  deviceId: string;
  /** 通道类型 */
  channel: string;
  /** 子通道（可选） */
  subchannel?: string | undefined;
}

/**
 * 主题通道类型
 */
export type TopicChannel = 
  | 'telemetry' 
  | 'status' 
  | 'event' 
  | 'cmd' 
  | 'cmdres' 
  | 'cfg' 
  | 'ota' 
  | 'shadow';

/**
 * 子通道类型
 */
export type TopicSubchannel = 
  | 'desired' 
  | 'reported' 
  | 'progress' 
  | 'alert';

/**
 * 完整的主题配置
 */
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

/**
 * MQTT主题策略服务
 */
export class MqttTopicsStrategy {
  private readonly tenantId: string;
  private readonly deviceType: string;

  constructor(tenantId: string, deviceType: string) {
    this.tenantId = tenantId;
    this.deviceType = this.normalizeDeviceType(deviceType);
  }

  /**
   * 生成完整的主题配置
   */
  generateTopics(deviceId: string): MqttTopics {
    const basePath = this.buildBasePath(deviceId);
    
    return {
      telemetryPub: `${basePath}/telemetry`,
      statusPub: `${basePath}/status`,
      eventPub: `${basePath}/event`,
      cmdSub: `${basePath}/cmd`,
      cmdresPub: `${basePath}/cmdres`,
      shadowDesiredSub: `${basePath}/shadow/desired`,
      shadowReportedPub: `${basePath}/shadow/reported`,
      cfgSub: `${basePath}/cfg`,
      otaProgressPub: `${basePath}/ota/progress`
    };
  }

  /**
   * 生成网关子设备主题
   */
  generateSubDeviceTopics(
    gatewayDeviceId: string, 
    subDeviceId: string, 
    _subDeviceType: string // 暂时未使用，但保留参数接口一致性
  ): MqttTopics {
    const basePath = this.buildBasePath(gatewayDeviceId);
    const subDevicePath = `${basePath}/subdev/${subDeviceId}`;
    
    return {
      telemetryPub: `${subDevicePath}/telemetry`,
      statusPub: `${subDevicePath}/status`,
      eventPub: `${subDevicePath}/event`,
      cmdSub: `${subDevicePath}/cmd`,
      cmdresPub: `${subDevicePath}/cmdres`,
      shadowDesiredSub: `${subDevicePath}/shadow/desired`,
      shadowReportedPub: `${subDevicePath}/shadow/reported`,
      cfgSub: `${subDevicePath}/cfg`,
      otaProgressPub: `${subDevicePath}/ota/progress`
    };
  }

  /**
   * 生成主题模板
   */
  generateTopicTemplate(
    deviceId: string, 
    channel: TopicChannel, 
    subchannel?: TopicSubchannel
  ): MqttTopicTemplate {
    const basePath = this.buildBasePath(deviceId);
    
    return {
      prefix: basePath,
      deviceType: this.deviceType,
      deviceId,
      channel,
      subchannel: subchannel
    };
  }

  /**
   * 解析主题路径
   */
  parseTopicPath(topicPath: string): MqttTopicTemplate | null {
    const pattern = /^iot\/([^\/]+)\/([^\/]+)\/([^\/]+)\/([^\/]+)(?:\/([^\/]+))?$/;
    const match = topicPath.match(pattern);
    
    if (!match) {
      return null;
    }

    const [, tenantId, deviceType, deviceId, channel, subchannel] = match;
    
    return {
      prefix: `iot/${tenantId}/${deviceType}/${deviceId}`,
      deviceType: deviceType as string,
      deviceId: deviceId as string,
      channel: channel as TopicChannel,
      subchannel: subchannel as TopicSubchannel | undefined
    };
  }

  /**
   * 验证主题是否属于当前租户和设备
   */
  validateTopicOwnership(topicPath: string, deviceId: string): boolean {
    const parsed = this.parseTopicPath(topicPath);
    if (!parsed) {
      return false;
    }

    return parsed.deviceId === deviceId && 
           parsed.deviceType === this.deviceType &&
           this.tenantId === topicPath.split('/')[1];
  }

  /**
   * 生成通配符主题模式
   */
  generateWildcardPatterns(deviceId: string): {
    publish: string[];
    subscribe: string[];
  } {
    const basePath = this.buildBasePath(deviceId);
    
    return {
      publish: [
        `${basePath}/telemetry`,
        `${basePath}/status`,
        `${basePath}/event`,
        `${basePath}/cmdres`,
        `${basePath}/shadow/reported`,
        `${basePath}/ota/progress`
      ],
      subscribe: [
        `${basePath}/cmd`,
        `${basePath}/shadow/desired`,
        `${basePath}/cfg`
      ]
    };
  }

  /**
   * 构建基础路径
   */
  private buildBasePath(deviceId: string): string {
    return `iot/${this.tenantId}/${this.deviceType}/${deviceId}`;
  }

  /**
   * 标准化设备类型
   */
  private normalizeDeviceType(deviceType: string): string {
    const normalized = DEVICE_TYPE_MAPPING[deviceType as keyof typeof DEVICE_TYPE_MAPPING];
    return normalized || deviceType.toLowerCase();
  }

  /**
   * 获取支持的设备类型列表
   */
  static getSupportedDeviceTypes(): string[] {
    return Object.keys(DEVICE_TYPE_MAPPING);
  }

  /**
   * 验证设备类型是否支持
   */
  static isDeviceTypeSupported(deviceType: string): boolean {
    return deviceType in DEVICE_TYPE_MAPPING;
  }
}
