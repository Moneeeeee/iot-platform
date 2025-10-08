/**
 * MQTT 配置加载器
 * 
 * 负责加载和管理MQTT相关的YAML配置文件
 */

import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';

/**
 * QoS策略配置接口
 */
export interface QosPolicyConfig {
  device_types: {
    [deviceType: string]: {
      default_qos: 0 | 1 | 2;
      allow_retain: boolean;
      channels: {
        [channel: string]: {
          qos: 0 | 1 | 2;
          retain: boolean;
          reason: string;
        } | {
          [subchannel: string]: {
            qos: 0 | 1 | 2;
            retain: boolean;
            reason: string;
          };
        };
      };
    };
  };
  global: {
    max_qos: 0 | 1 | 2;
    default_retain: boolean;
    low_power_devices: string[];
    high_reliability_devices: string[];
  };
}

/**
 * ACL策略配置接口
 */
export interface AclPolicyConfig {
  base_rules: {
    publish_patterns: string[];
    subscribe_patterns: string[];
    deny_patterns: string[];
  };
  device_type_rules: {
    [deviceType: string]: {
      additional_publish?: string[];
      additional_subscribe?: string[];
      restrictions?: string[];
    };
  };
  tenant_rules: {
    [tenantId: string]: {
      allow_cross_tenant: boolean;
      allow_admin_topics: boolean;
      max_topics_per_device: number;
      additional_patterns?: {
        publish?: string[];
        subscribe?: string[];
      };
    };
  };
  security: {
    topic_validation: {
      enabled: boolean;
      max_topic_length: number;
      allowed_characters: string;
    };
    permission_check: {
      enabled: boolean;
      cache_ttl: number;
      strict_mode: boolean;
    };
    audit_logging: {
      enabled: boolean;
      log_level: string;
      log_topics: string[];
    };
  };
}

/**
 * 主题模板配置接口
 */
export interface TopicSchemaConfig {
  naming_convention: {
    base_format: string;
    subchannel_format: string;
    subdevice_format: string;
    versioned_format: string;
  };
  channels: {
    [channel: string]: {
      description: string;
      qos_default: 0 | 1 | 2;
      retain_default: boolean;
      frequency: string;
      subchannels?: {
        [subchannel: string]: {
          description: string;
          qos_default: 0 | 1 | 2;
          retain_default: boolean;
        };
      };
    };
  };
  device_types: {
    [deviceType: string]: {
      display_name: string;
      category: string;
      supports_subdevices: boolean;
    };
  };
  templates: {
    device_base: {
      [channel: string]: string;
    };
    device_shadow: {
      [subchannel: string]: string;
    };
    device_ota: {
      [subchannel: string]: string;
    };
    gateway_subdevice: {
      [channel: string]: string;
    };
  };
  validation: {
    max_length: number;
    min_length: number;
    allowed_characters: string;
    forbidden_patterns: string[];
    required_fields: string[];
    optional_fields: string[];
  };
}

/**
 * MQTT配置管理器
 */
export class MqttConfigLoader {
  private static instance: MqttConfigLoader;
  private qosPolicyConfig: QosPolicyConfig | null = null;
  private aclPolicyConfig: AclPolicyConfig | null = null;
  private topicSchemaConfig: TopicSchemaConfig | null = null;
  private configPath: string;

  constructor(configPath: string = 'configs/mqtt') {
    this.configPath = configPath;
  }

  /**
   * 获取单例实例
   */
  static getInstance(configPath?: string): MqttConfigLoader {
    if (!MqttConfigLoader.instance) {
      MqttConfigLoader.instance = new MqttConfigLoader(configPath);
    }
    return MqttConfigLoader.instance;
  }

  /**
   * 加载所有配置文件
   */
  async loadAllConfigs(): Promise<void> {
    await Promise.all([
      this.loadQosPolicyConfig(),
      this.loadAclPolicyConfig(),
      this.loadTopicSchemaConfig()
    ]);
  }

  /**
   * 加载QoS策略配置
   */
  async loadQosPolicyConfig(): Promise<QosPolicyConfig> {
    if (this.qosPolicyConfig) {
      return this.qosPolicyConfig;
    }

    const configPath = path.join(this.configPath, 'qos-policies.yaml');
    const configContent = fs.readFileSync(configPath, 'utf8');
    this.qosPolicyConfig = yaml.load(configContent) as QosPolicyConfig;
    
    return this.qosPolicyConfig;
  }

  /**
   * 加载ACL策略配置
   */
  async loadAclPolicyConfig(): Promise<AclPolicyConfig> {
    if (this.aclPolicyConfig) {
      return this.aclPolicyConfig;
    }

    const configPath = path.join(this.configPath, 'acl-policies.yaml');
    const configContent = fs.readFileSync(configPath, 'utf8');
    this.aclPolicyConfig = yaml.load(configContent) as AclPolicyConfig;
    
    return this.aclPolicyConfig;
  }

  /**
   * 加载主题模板配置
   */
  async loadTopicSchemaConfig(): Promise<TopicSchemaConfig> {
    if (this.topicSchemaConfig) {
      return this.topicSchemaConfig;
    }

    const configPath = path.join(this.configPath, 'topic-schema.yaml');
    const configContent = fs.readFileSync(configPath, 'utf8');
    this.topicSchemaConfig = yaml.load(configContent) as TopicSchemaConfig;
    
    return this.topicSchemaConfig;
  }

  /**
   * 获取QoS策略配置
   */
  getQosPolicyConfig(): QosPolicyConfig {
    if (!this.qosPolicyConfig) {
      throw new Error('QoS policy config not loaded. Call loadQosPolicyConfig() first.');
    }
    return this.qosPolicyConfig;
  }

  /**
   * 获取ACL策略配置
   */
  getAclPolicyConfig(): AclPolicyConfig {
    if (!this.aclPolicyConfig) {
      throw new Error('ACL policy config not loaded. Call loadAclPolicyConfig() first.');
    }
    return this.aclPolicyConfig;
  }

  /**
   * 获取主题模板配置
   */
  getTopicSchemaConfig(): TopicSchemaConfig {
    if (!this.topicSchemaConfig) {
      throw new Error('Topic schema config not loaded. Call loadTopicSchemaConfig() first.');
    }
    return this.topicSchemaConfig;
  }

  /**
   * 获取设备类型的QoS策略
   */
  getDeviceTypeQosPolicy(deviceType: string): {
    defaultQos: 0 | 1 | 2;
    allowRetain: boolean;
    channels: any;
  } | null {
    const config = this.getQosPolicyConfig();
    const deviceConfig = config.device_types[deviceType];
    
    if (!deviceConfig) {
      return null;
    }

    return {
      defaultQos: deviceConfig.default_qos,
      allowRetain: deviceConfig.allow_retain,
      channels: deviceConfig.channels
    };
  }

  /**
   * 获取租户的ACL规则
   */
  getTenantAclRules(tenantId: string): {
    allowCrossTenant: boolean;
    allowAdminTopics: boolean;
    maxTopicsPerDevice: number;
    additionalPatterns?: {
      publish?: string[];
      subscribe?: string[];
    };
  } | null {
    const config = this.getAclPolicyConfig();
    const tenantConfig = config.tenant_rules[tenantId];
    
    if (!tenantConfig) {
      // 返回默认租户规则
      const defaultConfig = config.tenant_rules['default'];
      return defaultConfig ? {
        allowCrossTenant: defaultConfig.allow_cross_tenant,
        allowAdminTopics: defaultConfig.allow_admin_topics,
        maxTopicsPerDevice: defaultConfig.max_topics_per_device,
        ...(defaultConfig.additional_patterns && { additionalPatterns: defaultConfig.additional_patterns })
      } : null;
    }

    return {
      allowCrossTenant: tenantConfig.allow_cross_tenant,
      allowAdminTopics: tenantConfig.allow_admin_topics,
      maxTopicsPerDevice: tenantConfig.max_topics_per_device,
      ...(tenantConfig.additional_patterns && { additionalPatterns: tenantConfig.additional_patterns })
    };
  }

  /**
   * 获取设备类型的基础ACL规则
   */
  getDeviceTypeAclRules(deviceType: string): {
    additionalPublish?: string[];
    additionalSubscribe?: string[];
    restrictions?: string[];
  } | null {
    const config = this.getAclPolicyConfig();
    const deviceConfig = config.device_type_rules[deviceType];
    
    return deviceConfig ? {
      ...(deviceConfig.additional_publish && { additionalPublish: deviceConfig.additional_publish }),
      ...(deviceConfig.additional_subscribe && { additionalSubscribe: deviceConfig.additional_subscribe }),
      ...(deviceConfig.restrictions && { restrictions: deviceConfig.restrictions })
    } : null;
  }

  /**
   * 获取主题模板
   */
  getTopicTemplate(templateType: 'device_base' | 'device_shadow' | 'device_ota' | 'gateway_subdevice'): any {
    const config = this.getTopicSchemaConfig();
    return config.templates[templateType];
  }

  /**
   * 验证主题是否符合规范
   */
  validateTopic(topic: string): {
    isValid: boolean;
    errors: string[];
  } {
    const config = this.getTopicSchemaConfig();
    const validation = config.validation;
    const errors: string[] = [];

    // 长度检查
    if (topic.length > validation.max_length) {
      errors.push(`Topic length exceeds maximum ${validation.max_length}`);
    }
    if (topic.length < validation.min_length) {
      errors.push(`Topic length below minimum ${validation.min_length}`);
    }

    // 字符检查
    const allowedRegex = new RegExp(validation.allowed_characters);
    if (!allowedRegex.test(topic)) {
      errors.push(`Topic contains invalid characters`);
    }

    // 禁止模式检查
    validation.forbidden_patterns.forEach(pattern => {
      if (topic.includes(pattern)) {
        errors.push(`Topic contains forbidden pattern: ${pattern}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 重新加载配置（热更新）
   */
  async reloadConfigs(): Promise<void> {
    this.qosPolicyConfig = null;
    this.aclPolicyConfig = null;
    this.topicSchemaConfig = null;
    await this.loadAllConfigs();
  }

  /**
   * 检查配置是否已加载
   */
  isConfigLoaded(): boolean {
    return !!(this.qosPolicyConfig && this.aclPolicyConfig && this.topicSchemaConfig);
  }
}
