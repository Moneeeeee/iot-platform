/**
 * MQTT 策略解析器统一接口
 * 
 * 提供统一的MQTT策略解析接口，整合主题和策略服务
 */

import { DeviceBootstrapRequest } from '../types';
import { MqttTopicsStrategy } from './mqtt-topics.strategy';
import { MqttPolicyStrategy, MqttPolicyResult } from './mqtt-policy.strategy';

/**
 * MQTT策略解析器接口
 */
export interface MqttPolicyResolver {
  /**
   * 解析MQTT策略
   */
  resolvePolicy(
    deviceRequest: DeviceBootstrapRequest,
    tenantId: string
  ): Promise<MqttPolicyResult>;
  
  /**
   * 验证主题权限
   */
  validateTopicPermission(
    topic: string,
    action: 'publish' | 'subscribe',
    deviceId: string
  ): boolean;
  
  /**
   * 生成网关子设备策略
   */
  generateSubDevicePolicy(
    gatewayDeviceId: string,
    subDeviceId: string,
    subDeviceType: string,
    tenantId: string
  ): Promise<MqttPolicyResult>;
}

/**
 * MQTT策略解析器实现
 */
export class DefaultMqttPolicyResolver implements MqttPolicyResolver {
  private readonly policyStrategy: MqttPolicyStrategy;
  // private readonly topicsStrategy: MqttTopicsStrategy; // 暂时未使用

  constructor(tenantId: string, deviceType: string) {
    this.policyStrategy = new MqttPolicyStrategy(tenantId, deviceType);
    // this.topicsStrategy = new MqttTopicsStrategy(tenantId, deviceType); // 暂时未使用
  }

  /**
   * 解析MQTT策略
   */
  async resolvePolicy(
    deviceRequest: DeviceBootstrapRequest,
    tenantId: string
  ): Promise<MqttPolicyResult> {
    return this.policyStrategy.resolvePolicy(deviceRequest, tenantId);
  }

  /**
   * 验证主题权限
   */
  validateTopicPermission(
    topic: string,
    action: 'publish' | 'subscribe',
    deviceId: string
  ): boolean {
    return this.policyStrategy.validateTopicPermission(topic, action, deviceId);
  }

  /**
   * 生成网关子设备策略
   */
  async generateSubDevicePolicy(
    gatewayDeviceId: string,
    subDeviceId: string,
    subDeviceType: string,
    tenantId: string
  ): Promise<MqttPolicyResult> {
    // 创建网关主题策略（用于生成子设备主题）
    const gatewayTopicsStrategy = new MqttTopicsStrategy(tenantId, 'gateway');
    
    // 生成子设备主题
    const topics = gatewayTopicsStrategy.generateSubDeviceTopics(
      gatewayDeviceId,
      subDeviceId,
      subDeviceType
    );

    // 创建子设备策略解析器（用于生成ACL和QoS策略）
    const subDeviceResolver = new DefaultMqttPolicyResolver(tenantId, subDeviceType);
    
    // 模拟子设备请求
    const subDeviceRequest: DeviceBootstrapRequest = {
      deviceId: subDeviceId,
      mac: '00:00:00:00:00:00', // 子设备可能没有独立MAC
      deviceType: subDeviceType,
      firmware: {
        current: '1.0.0',
        build: '001',
        minRequired: '1.0.0',
        channel: 'stable'
      },
      hardware: {
        version: 'v1.0',
        serial: `SUB-${subDeviceId}`
      },
      capabilities: [{ name: 'sub_device' }],
      tenantId,
      timestamp: Date.now()
    };

    // 解析子设备策略
    const policy = await subDeviceResolver.resolvePolicy(subDeviceRequest, tenantId);
    
    // 使用正确的子设备主题替换
    return {
      ...policy,
      topics
    };
  }
}

/**
 * MQTT策略工厂
 */
export class MqttPolicyFactory {
  /**
   * 创建策略解析器
   */
  static createResolver(tenantId: string, deviceType: string): MqttPolicyResolver {
    return new DefaultMqttPolicyResolver(tenantId, deviceType);
  }

  /**
   * 批量创建策略解析器
   */
  static createResolvers(
    tenantId: string, 
    deviceTypes: string[]
  ): Map<string, MqttPolicyResolver> {
    const resolvers = new Map<string, MqttPolicyResolver>();
    
    deviceTypes.forEach(deviceType => {
      resolvers.set(deviceType, this.createResolver(tenantId, deviceType));
    });
    
    return resolvers;
  }
}
