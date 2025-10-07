/**
 * MQTT 主题解析与生成工具
 */

export interface TopicInfo {
  tenantId: string;
  deviceType: string;
  deviceId: string;
  channel: string;
  subchannel?: string;
}

export interface TopicPattern {
  pattern: string;
  description: string;
  example: string;
}

/**
 * 新架构主题结构: iot/{tenant}/{deviceType}/{deviceId}/{channel}/{subchannel?}
 */
export class TopicUtils {
  /**
   * 解析MQTT主题
   */
  static parseTopic(topic: string): TopicInfo | null {
    const parts = topic.split('/');
    
    // 检查是否为新架构格式
    if (parts.length >= 5 && parts[0] === 'iot') {
      return {
        tenantId: parts[1],
        deviceType: parts[2],
        deviceId: parts[3],
        channel: parts[4],
        subchannel: parts[5] || undefined
      };
    }
    
    return null;
  }

  /**
   * 生成MQTT主题
   */
  static generateTopic(info: TopicInfo): string {
    const { tenantId, deviceType, deviceId, channel, subchannel } = info;
    let topic = `iot/${tenantId}/${deviceType}/${deviceId}/${channel}`;
    
    if (subchannel) {
      topic += `/${subchannel}`;
    }
    
    return topic;
  }

  /**
   * 生成设备遥测主题
   */
  static generateTelemetryTopic(tenantId: string, deviceType: string, deviceId: string): string {
    return this.generateTopic({ tenantId, deviceType, deviceId, channel: 'telemetry' });
  }

  /**
   * 生成设备状态主题
   */
  static generateStatusTopic(tenantId: string, deviceType: string, deviceId: string): string {
    return this.generateTopic({ tenantId, deviceType, deviceId, channel: 'status' });
  }

  /**
   * 生成设备事件主题
   */
  static generateEventTopic(tenantId: string, deviceType: string, deviceId: string): string {
    return this.generateTopic({ tenantId, deviceType, deviceId, channel: 'event' });
  }

  /**
   * 生成设备命令主题
   */
  static generateCommandTopic(tenantId: string, deviceType: string, deviceId: string): string {
    return this.generateTopic({ tenantId, deviceType, deviceId, channel: 'cmd' });
  }

  /**
   * 生成设备配置主题
   */
  static generateConfigTopic(tenantId: string, deviceType: string, deviceId: string): string {
    return this.generateTopic({ tenantId, deviceType, deviceId, channel: 'cfg' });
  }

  /**
   * 生成OTA进度主题
   */
  static generateOTAProgressTopic(tenantId: string, deviceType: string, deviceId: string): string {
    return this.generateTopic({ tenantId, deviceType, deviceId, channel: 'ota', subchannel: 'progress' });
  }

  /**
   * 生成OTA状态主题
   */
  static generateOTAStatusTopic(tenantId: string, deviceType: string, deviceId: string): string {
    return this.generateTopic({ tenantId, deviceType, deviceId, channel: 'ota', subchannel: 'status' });
  }

  /**
   * 生成命令响应主题
   */
  static generateCommandResponseTopic(tenantId: string, deviceType: string, deviceId: string): string {
    return this.generateTopic({ tenantId, deviceType, deviceId, channel: 'cmdres' });
  }

  /**
   * 生成设备影子主题
   */
  static generateShadowTopic(tenantId: string, deviceType: string, deviceId: string, reported: boolean = true): string {
    return this.generateTopic({ 
      tenantId, 
      deviceType, 
      deviceId, 
      channel: 'shadow', 
      subchannel: reported ? 'reported' : 'desired' 
    });
  }

  /**
   * 获取订阅模式
   */
  static getSubscriptionPatterns(): TopicPattern[] {
    return [
      {
        pattern: 'iot/+/+/+/telemetry',
        description: '所有设备的遥测数据',
        example: 'iot/tenant1/sensor/device001/telemetry'
      },
      {
        pattern: 'iot/+/+/+/status',
        description: '所有设备的状态变化',
        example: 'iot/tenant1/sensor/device001/status'
      },
      {
        pattern: 'iot/+/+/+/event',
        description: '所有设备的事件',
        example: 'iot/tenant1/sensor/device001/event'
      },
      {
        pattern: 'iot/+/+/+/cmdres',
        description: '所有设备的命令响应',
        example: 'iot/tenant1/sensor/device001/cmdres'
      },
      {
        pattern: 'iot/+/+/+/ota/+',
        description: '所有设备的OTA相关消息',
        example: 'iot/tenant1/sensor/device001/ota/progress'
      },
      {
        pattern: 'iot/+/+/+/shadow/+',
        description: '所有设备的影子数据',
        example: 'iot/tenant1/sensor/device001/shadow/reported'
      },
      {
        pattern: 'iot/#',
        description: '所有IoT消息（通配符）',
        example: 'iot/tenant1/sensor/device001/telemetry'
      }
    ];
  }

  /**
   * 验证主题格式
   */
  static validateTopic(topic: string): boolean {
    const parsed = this.parseTopic(topic);
    return parsed !== null;
  }

  /**
   * 提取设备ID
   */
  static extractDeviceId(topic: string): string | null {
    const parsed = this.parseTopic(topic);
    return parsed?.deviceId || null;
  }

  /**
   * 提取租户ID
   */
  static extractTenantId(topic: string): string | null {
    const parsed = this.parseTopic(topic);
    return parsed?.tenantId || null;
  }

  /**
   * 提取设备类型
   */
  static extractDeviceType(topic: string): string | null {
    const parsed = this.parseTopic(topic);
    return parsed?.deviceType || null;
  }

  /**
   * 提取通道类型
   */
  static extractChannel(topic: string): string | null {
    const parsed = this.parseTopic(topic);
    return parsed?.channel || null;
  }
}
