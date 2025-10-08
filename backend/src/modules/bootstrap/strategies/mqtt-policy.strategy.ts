/**
 * MQTT 策略服务
 * 
 * 合并QoS + ACL逻辑，负责：
 * 1. QoS/Retain策略决策
 * 2. ACL权限控制
 * 3. 设备类型特定策略
 * 4. 低功耗设备优化
 */

import { DeviceBootstrapRequest } from '../types';
import { MqttTopicsStrategy, MqttTopics } from './mqtt-topics.strategy';

/**
 * QoS/Retain策略配置
 */
export interface QosRetainPolicy {
  topic: string;
  qos: 0 | 1 | 2;
  retain: boolean;
  reason: string;
}

/**
 * ACL权限配置
 */
export interface AclPolicy {
  publish: string[];
  subscribe: string[];
  deny: string[];
}

/**
 * 设备能力检测结果
 */
export interface DeviceCapabilities {
  isLowPower: boolean;
  hasSensors: boolean;
  isGateway: boolean;
  supportsOta: boolean;
  supportsShadow: boolean;
}

/**
 * MQTT策略解析结果
 */
export interface MqttPolicyResult {
  topics: MqttTopics;
  qosRetainPolicy: QosRetainPolicy[];
  acl: AclPolicy;
  capabilities: DeviceCapabilities;
}

/**
 * MQTT策略服务
 */
export class MqttPolicyStrategy {
  private readonly topicsStrategy: MqttTopicsStrategy;

  constructor(tenantId: string, deviceType: string) {
    this.topicsStrategy = new MqttTopicsStrategy(tenantId, deviceType);
  }

  /**
   * 解析MQTT策略
   */
  async resolvePolicy(
    deviceRequest: DeviceBootstrapRequest,
    _tenantId: string // 暂时未使用，但保留参数接口一致性
  ): Promise<MqttPolicyResult> {
    const deviceId = deviceRequest.deviceId;
    
    // 1. 生成主题配置
    const topics = this.topicsStrategy.generateTopics(deviceId);
    
    // 2. 检测设备能力
    const capabilities = this.detectDeviceCapabilities(deviceRequest);
    
    // 3. 生成QoS/Retain策略
    const qosRetainPolicy = this.generateQosRetainPolicy(topics, capabilities);
    
    // 4. 生成ACL权限
    const acl = this.generateAclPolicy(topics, capabilities);
    
    return {
      topics,
      qosRetainPolicy,
      acl,
      capabilities
    };
  }

  /**
   * 检测设备能力
   */
  private detectDeviceCapabilities(deviceRequest: DeviceBootstrapRequest): DeviceCapabilities {
    const capabilities = deviceRequest.capabilities?.map(cap => cap.name) || [];
    
    return {
      isLowPower: capabilities.includes('low_power_mode') || 
                  deviceRequest.deviceType === 'sensor',
      hasSensors: capabilities.some(cap => 
        ['temperature_sensor', 'humidity_sensor', 'voltage_sensor', 'current_sensor'].includes(cap)
      ),
      isGateway: deviceRequest.deviceType === 'gateway',
      supportsOta: capabilities.includes('ota_support') || true, // 默认支持OTA
      supportsShadow: capabilities.includes('shadow_support') || true // 默认支持Shadow
    };
  }

  /**
   * 生成QoS/Retain策略
   */
  private generateQosRetainPolicy(
    topics: MqttTopics, 
    capabilities: DeviceCapabilities
  ): QosRetainPolicy[] {
    const policies: QosRetainPolicy[] = [];
    
    // 遥测数据策略
    policies.push({
      topic: topics.telemetryPub,
      qos: capabilities.isLowPower ? 0 : 1, // 低功耗设备用QoS0减少开销
      retain: false, // 遥测数据不保留
      reason: capabilities.isLowPower ? 'low_power_optimization' : 'standard_telemetry'
    });

    // 状态数据策略
    policies.push({
      topic: topics.statusPub,
      qos: 1, // 状态数据需要可靠传输
      retain: true, // 保留最新状态
      reason: 'status_persistence'
    });

    // 事件数据策略
    policies.push({
      topic: topics.eventPub,
      qos: 1, // 事件需要可靠传输
      retain: false, // 事件不保留
      reason: 'event_reliability'
    });

    // 命令订阅策略
    policies.push({
      topic: topics.cmdSub,
      qos: 1, // 命令需要可靠接收
      retain: false, // 命令不保留
      reason: 'command_reliability'
    });

    // 命令响应策略
    policies.push({
      topic: topics.cmdresPub,
      qos: 1, // 响应需要可靠传输
      retain: false, // 响应不保留
      reason: 'response_reliability'
    });

    // 影子期望状态策略
    policies.push({
      topic: topics.shadowDesiredSub,
      qos: 1, // 期望状态需要可靠接收
      retain: true, // 保留期望状态
      reason: 'shadow_desired_persistence'
    });

    // 影子报告状态策略
    policies.push({
      topic: topics.shadowReportedPub,
      qos: capabilities.isLowPower ? 0 : 1, // 低功耗设备用QoS0
      retain: false, // 报告状态不保留
      reason: capabilities.isLowPower ? 'low_power_shadow' : 'standard_shadow'
    });

    // 配置订阅策略
    policies.push({
      topic: topics.cfgSub,
      qos: 1, // 配置需要可靠接收
      retain: true, // 保留配置
      reason: 'config_persistence'
    });

    // OTA进度策略
    policies.push({
      topic: topics.otaProgressPub,
      qos: 1, // OTA进度需要可靠传输
      retain: false, // 进度不保留
      reason: 'ota_progress_reliability'
    });

    return policies;
  }

  /**
   * 生成ACL权限策略
   */
  private generateAclPolicy(
    topics: MqttTopics, 
    capabilities: DeviceCapabilities
  ): AclPolicy {
    const publish: string[] = [];
    const subscribe: string[] = [];
    const deny: string[] = [];

    // 基础发布权限
    publish.push(
      topics.telemetryPub,
      topics.statusPub,
      topics.eventPub,
      topics.cmdresPub,
      topics.shadowReportedPub,
      topics.otaProgressPub
    );

    // 基础订阅权限
    subscribe.push(
      topics.cmdSub,
      topics.shadowDesiredSub,
      topics.cfgSub
    );

    // 网关设备额外权限
    if (capabilities.isGateway) {
      // 网关可以发布子设备数据
      publish.push(`${topics.telemetryPub.replace('/telemetry', '')}/subdev/+/telemetry`);
      publish.push(`${topics.statusPub.replace('/status', '')}/subdev/+/status`);
      publish.push(`${topics.eventPub.replace('/event', '')}/subdev/+/event`);
      
      // 网关可以订阅子设备命令
      subscribe.push(`${topics.cmdSub.replace('/cmd', '')}/subdev/+/cmd`);
    }

    // 拒绝权限（安全考虑）
    deny.push(
      'iot/+/+/+/admin/+', // 拒绝管理主题
      'iot/+/+/+/system/+', // 拒绝系统主题
      'iot/+/+/+/debug/+'   // 拒绝调试主题
    );

    return {
      publish,
      subscribe,
      deny
    };
  }

  /**
   * 验证主题权限
   */
  validateTopicPermission(
    topic: string, 
    action: 'publish' | 'subscribe',
    deviceId: string
  ): boolean {
    const acl = this.generateAclPolicy(
      this.topicsStrategy.generateTopics(deviceId),
      { isLowPower: false, hasSensors: false, isGateway: false, supportsOta: true, supportsShadow: true }
    );

    const allowedTopics = action === 'publish' ? acl.publish : acl.subscribe;
    
    // 检查精确匹配
    if (allowedTopics.includes(topic)) {
      return true;
    }

    // 检查通配符匹配
    return allowedTopics.some(pattern => {
      const regex = this.convertWildcardToRegex(pattern);
      return regex.test(topic);
    });
  }

  /**
   * 将通配符模式转换为正则表达式
   */
  private convertWildcardToRegex(pattern: string): RegExp {
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // 转义特殊字符
      .replace(/\\\*/g, '.*') // * 匹配任意字符
      .replace(/\\\+/g, '[^/]+'); // + 匹配非/的字符
    
    return new RegExp(`^${escaped}$`);
  }

  /**
   * 获取设备类型特定的QoS策略
   */
  getDeviceTypeQosPolicy(deviceType: string): { defaultQos: 0 | 1 | 2; allowRetain: boolean } {
    switch (deviceType) {
      case 'sensor':
        return { defaultQos: 0, allowRetain: false }; // 传感器优化
      case 'gateway':
        return { defaultQos: 1, allowRetain: true }; // 网关可靠传输
      case 'ps-ctrl':
      case 'dtu':
      case 'rtu':
      case 'ftu':
        return { defaultQos: 1, allowRetain: true }; // 控制设备可靠传输
      default:
        return { defaultQos: 1, allowRetain: true }; // 默认策略
    }
  }
}
