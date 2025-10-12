/**
 * 动态设备类型管理器
 * 支持运行时加载和验证设备类型，无需修改代码
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export interface DeviceTypeConfig {
  display_name: string;
  category: string;
  description: string;
  supports_subdevices: boolean;
  default_capabilities: DeviceCapability[];
}

export interface DeviceCapability {
  name: string;
  type: 'sensor' | 'control' | 'communication' | 'system';
  description: string;
  params: Record<string, any>;
}

export interface CapabilityTypeConfig {
  description: string;
  data_format: 'telemetry' | 'command' | 'status' | 'event';
  qos_default: number;
  retain_default: boolean;
}

export interface DataFormatConfig {
  description: string;
  required_fields: string[];
  optional_fields: string[];
}

export interface ValidationRules {
  device_type: {
    required: boolean;
    pattern: string;
    max_length: number;
  };
  capability_name: {
    required: boolean;
    pattern: string;
    max_length: number;
  };
  mac_address: {
    required: boolean;
    pattern: string;
  };
  timestamp: {
    required: boolean;
    type: string;
    min_value: number;
  };
}

export interface DeviceTypesConfig {
  device_types: Record<string, DeviceTypeConfig>;
  capability_types: Record<string, CapabilityTypeConfig>;
  data_formats: Record<string, DataFormatConfig>;
  validation_rules: ValidationRules;
}

/**
 * 设备类型管理器
 */
export class DeviceTypeManager {
  private static instance: DeviceTypeManager;
  private config: DeviceTypesConfig | null = null;
  private configPath: string;
  
  private constructor() {
    this.configPath = path.join(process.cwd(), 'configs', 'device-types.yaml');
  }
  
  /**
   * 获取单例实例
   */
  static getInstance(): DeviceTypeManager {
    if (!DeviceTypeManager.instance) {
      DeviceTypeManager.instance = new DeviceTypeManager();
    }
    return DeviceTypeManager.instance;
  }
  
  /**
   * 加载设备类型配置
   */
  async loadConfig(): Promise<void> {
    try {
      console.log('📋 加载设备类型配置:', this.configPath);
      
      const configContent = fs.readFileSync(this.configPath, 'utf8');
      this.config = yaml.load(configContent) as DeviceTypesConfig;
      
      console.log('✅ 设备类型配置加载成功');
      console.log(`   支持设备类型: ${Object.keys(this.config.device_types).join(', ')}`);
      console.log(`   能力类型: ${Object.keys(this.config.capability_types).join(', ')}`);
      
    } catch (error) {
      console.error('❌ 加载设备类型配置失败:', error);
      throw new Error(`Failed to load device types config: ${error.message}`);
    }
  }
  
  /**
   * 获取配置
   */
  getConfig(): DeviceTypesConfig {
    if (!this.config) {
      throw new Error('Device types config not loaded');
    }
    return this.config;
  }
  
  /**
   * 检查设备类型是否支持
   */
  isDeviceTypeSupported(deviceType: string): boolean {
    if (!this.config) {
      return false;
    }
    return deviceType in this.config.device_types;
  }
  
  /**
   * 获取设备类型配置
   */
  getDeviceTypeConfig(deviceType: string): DeviceTypeConfig | null {
    if (!this.config) {
      return null;
    }
    return this.config.device_types[deviceType] || null;
  }
  
  /**
   * 获取设备类型的默认能力
   */
  getDefaultCapabilities(deviceType: string): DeviceCapability[] {
    const deviceConfig = this.getDeviceTypeConfig(deviceType);
    return deviceConfig?.default_capabilities || [];
  }
  
  /**
   * 验证设备能力
   */
  validateCapabilities(capabilities: any[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!Array.isArray(capabilities)) {
      errors.push('Capabilities must be an array');
      return { isValid: false, errors };
    }
    
    capabilities.forEach((capability, index) => {
      if (!capability.name || typeof capability.name !== 'string') {
        errors.push(`Capability ${index}: name is required and must be a string`);
      }
      
      if (!capability.type || !['sensor', 'control', 'communication', 'system'].includes(capability.type)) {
        errors.push(`Capability ${index}: type must be one of sensor, control, communication, system`);
      }
      
      if (!capability.description || typeof capability.description !== 'string') {
        errors.push(`Capability ${index}: description is required and must be a string`);
      }
      
      // 验证能力名称格式
      if (capability.name && !this.validateCapabilityName(capability.name)) {
        errors.push(`Capability ${index}: name format is invalid`);
      }
    });
    
    return { isValid: errors.length === 0, errors };
  }
  
  /**
   * 验证能力名称格式
   */
  private validateCapabilityName(name: string): boolean {
    if (!this.config) {
      return false;
    }
    
    const rule = this.config.validation_rules.capability_name;
    const pattern = new RegExp(rule.pattern);
    
    return pattern.test(name) && name.length <= rule.max_length;
  }
  
  /**
   * 验证设备类型格式
   */
  validateDeviceType(deviceType: string): boolean {
    if (!this.config) {
      return false;
    }
    
    const rule = this.config.validation_rules.device_type;
    const pattern = new RegExp(rule.pattern);
    
    return pattern.test(deviceType) && deviceType.length <= rule.max_length;
  }
  
  /**
   * 验证MAC地址格式
   */
  validateMacAddress(mac: string): boolean {
    if (!this.config) {
      return false;
    }
    
    const rule = this.config.validation_rules.mac_address;
    const pattern = new RegExp(rule.pattern);
    
    return pattern.test(mac);
  }
  
  /**
   * 验证时间戳
   */
  validateTimestamp(timestamp: any): boolean {
    if (!this.config) {
      return false;
    }
    
    const rule = this.config.validation_rules.timestamp;
    
    return typeof timestamp === rule.type && 
           timestamp >= rule.min_value && 
           timestamp <= Date.now() + 30000; // 允许30秒误差
  }
  
  /**
   * 获取能力类型配置
   */
  getCapabilityTypeConfig(capabilityType: string): CapabilityTypeConfig | null {
    if (!this.config) {
      return null;
    }
    return this.config.capability_types[capabilityType] || null;
  }
  
  /**
   * 获取数据格式配置
   */
  getDataFormatConfig(dataFormat: string): DataFormatConfig | null {
    if (!this.config) {
      return null;
    }
    return this.config.data_formats[dataFormat] || null;
  }
  
  /**
   * 获取支持的设备类型列表
   */
  getSupportedDeviceTypes(): string[] {
    if (!this.config) {
      return [];
    }
    return Object.keys(this.config.device_types);
  }
  
  /**
   * 获取设备类型统计信息
   */
  getDeviceTypeStats(): Record<string, any> {
    if (!this.config) {
      return {};
    }
    
    const stats: Record<string, any> = {};
    
    Object.entries(this.config.device_types).forEach(([type, config]) => {
      stats[type] = {
        display_name: config.display_name,
        category: config.category,
        capability_count: config.default_capabilities.length,
        supports_subdevices: config.supports_subdevices
      };
    });
    
    return stats;
  }
  
  /**
   * 重新加载配置（热重载）
   */
  async reloadConfig(): Promise<void> {
    console.log('🔄 重新加载设备类型配置...');
    await this.loadConfig();
    console.log('✅ 设备类型配置重新加载完成');
  }
}

export default DeviceTypeManager;

