/**
 * 设备引导请求验证器
 * 
 * 负责验证引导请求的合法性，包括：
 * 1. 基础字段验证
 * 2. 数据类型验证
 * 3. 业务规则验证
 */

import { DeviceBootstrapRequest } from '../types';

/**
 * 验证结果接口
 */
export interface ValidationResult {
  /** 验证是否通过 */
  isValid: boolean;
  /** 错误信息列表 */
  errors: string[];
  /** 验证后的数据（如果通过） */
  data?: DeviceBootstrapRequest;
}

/**
 * 引导请求验证器
 */
export class BootstrapValidator {
  /**
   * 验证引导请求体
   */
  static validateBootstrapRequest(request: any): ValidationResult {
    const errors: string[] = [];

    // 基础类型检查
    if (!request || typeof request !== 'object') {
      errors.push('Request body must be a valid object');
      return { isValid: false, errors };
    }

    // 设备ID验证
    if (!this.validateDeviceId(request.deviceId)) {
      errors.push('Device ID is required and must be a non-empty string');
    }

    // MAC地址验证
    if (!this.validateMacAddress(request.mac)) {
      errors.push('MAC address is required and must be a valid format');
    }

    // 设备类型验证
    if (!this.validateDeviceType(request.deviceType)) {
      errors.push('Device type is required and must be a non-empty string');
    }

    // 固件信息验证（可选）
    if (request.firmware !== undefined && !this.validateFirmware(request.firmware)) {
      errors.push('Firmware information is invalid');
    }

    // 硬件信息验证（可选）
    if (request.hardware !== undefined && !this.validateHardware(request.hardware)) {
      errors.push('Hardware information is invalid');
    }

    // 能力列表验证（可选）
    if (request.capabilities !== undefined && !this.validateCapabilities(request.capabilities)) {
      errors.push('Capabilities must be an array');
    }

    // 时间戳验证
    if (!this.validateTimestamp(request.timestamp)) {
      errors.push('Timestamp is required and must be a valid number');
    }

    // 可选字段验证
    if (request.messageId !== undefined && !this.validateMessageId(request.messageId)) {
      errors.push('Message ID must be a non-empty string if provided');
    }

    if (request.signature !== undefined && !this.validateSignatureFormat(request.signature)) {
      errors.push('Signature must be a valid hex string if provided');
    }

    const result: ValidationResult = {
      isValid: errors.length === 0,
      errors
    };
    
    if (errors.length === 0) {
      result.data = request as DeviceBootstrapRequest;
    }
    
    return result;
  }

  /**
   * 验证设备ID
   */
  private static validateDeviceId(deviceId: any): boolean {
    return typeof deviceId === 'string' && deviceId.trim().length > 0;
  }

  /**
   * 验证MAC地址
   */
  private static validateMacAddress(mac: any): boolean {
    if (typeof mac !== 'string' || mac.trim().length === 0) {
      return false;
    }

    // 简单的MAC地址格式验证
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    return macRegex.test(mac.trim());
  }

  /**
   * 验证设备类型
   */
  private static validateDeviceType(deviceType: any): boolean {
    return typeof deviceType === 'string' && deviceType.trim().length > 0;
  }

  /**
   * 验证固件信息
   */
  private static validateFirmware(firmware: any): boolean {
    if (!firmware || typeof firmware !== 'object') {
      return false;
    }

    // 验证必要字段
    if (!firmware.current || typeof firmware.current !== 'string' || firmware.current.trim().length === 0) {
      return false;
    }

    if (!firmware.build || typeof firmware.build !== 'string' || firmware.build.trim().length === 0) {
      return false;
    }

    if (!firmware.minRequired || typeof firmware.minRequired !== 'string' || firmware.minRequired.trim().length === 0) {
      return false;
    }

    // 验证可选字段
    if (firmware.channel && !this.validateFirmwareChannel(firmware.channel)) {
      return false;
    }

    return true;
  }

  /**
   * 验证固件通道
   */
  private static validateFirmwareChannel(channel: any): boolean {
    const validChannels = ['stable', 'beta', 'dev'];
    return typeof channel === 'string' && validChannels.includes(channel);
  }

  /**
   * 验证硬件信息
   */
  private static validateHardware(hardware: any): boolean {
    if (!hardware || typeof hardware !== 'object') {
      return false;
    }

    // 验证必要字段
    if (!hardware.version || typeof hardware.version !== 'string' || hardware.version.trim().length === 0) {
      return false;
    }

    if (!hardware.serial || typeof hardware.serial !== 'string' || hardware.serial.trim().length === 0) {
      return false;
    }

    // 验证可选字段
    if (hardware.description && typeof hardware.description !== 'string') {
      return false;
    }

    return true;
  }

  /**
   * 验证能力列表
   */
  private static validateCapabilities(capabilities: any): boolean {
    if (!Array.isArray(capabilities)) {
      return false;
    }

    // 验证每个能力对象
    return capabilities.every(cap => 
      cap && 
      typeof cap === 'object' && 
      typeof cap.name === 'string' && 
      cap.name.trim().length > 0
    );
  }

  /**
   * 验证时间戳
   */
  private static validateTimestamp(timestamp: any): boolean {
    return typeof timestamp === 'number' && 
           timestamp > 0 && 
           timestamp <= Date.now() + 30000; // 允许30秒的时钟误差
  }

  /**
   * 验证消息ID
   */
  private static validateMessageId(messageId: any): boolean {
    return typeof messageId === 'string' && messageId.trim().length > 0;
  }

  /**
   * 验证签名格式（仅格式校验，不验证签名内容）
   * 注意：签名内容的验证应在BootstrapService中使用设备密钥进行
   */
  private static validateSignatureFormat(signature: any): boolean {
    if (typeof signature !== 'string') {
      return false;
    }

    // 验证是否为有效的十六进制字符串
    const hexRegex = /^[0-9a-fA-F]+$/;
    return hexRegex.test(signature) && signature.length % 2 === 0;
  }
}
