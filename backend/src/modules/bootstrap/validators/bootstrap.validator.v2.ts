/**
 * 重构后的引导请求验证器
 * 
 * 职责边界清晰：
 * - 结构验证：字段类型、格式、存在性
 * - 语义验证：业务规则（交给Service层）
 */

import { DeviceBootstrapRequest } from '../types';
import { AppError, ErrorFactory } from '@/core/errors/app-error';

/**
 * 验证策略
 */
export interface ValidationStrategy {
  /** 是否严格模式 */
  strict: boolean;
  /** 是否允许缺失可选字段 */
  allowMissingOptional: boolean;
}

/**
 * 验证结果接口
 */
export interface ValidationResult {
  /** 验证是否通过 */
  isValid: boolean;
  /** 错误信息列表 */
  errors: AppError[];
  /** 验证后的数据（如果通过） */
  data?: DeviceBootstrapRequest;
  /** 警告信息（非致命问题） */
  warnings: string[];
}

/**
 * 重构后的引导请求验证器
 */
export class BootstrapValidator {
  /**
   * 验证引导请求体
   */
  static validateBootstrapRequest(
    request: any, 
    strategy: ValidationStrategy = { strict: false, allowMissingOptional: true }
  ): ValidationResult {
    const errors: AppError[] = [];
    const warnings: string[] = [];

    // 基础类型检查
    if (!request || typeof request !== 'object') {
      errors.push(ErrorFactory.validationError('Request body must be a valid object'));
      return { isValid: false, errors, warnings };
    }

    // 必需字段验证
    this.validateRequiredFields(request, errors, strategy);

    // 可选字段验证（结构层面）
    this.validateOptionalFields(request, errors, warnings, strategy);

    const result: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings
    };
    
    if (errors.length === 0) {
      result.data = request as DeviceBootstrapRequest;
    }
    
    return result;
  }

  /**
   * 验证必需字段
   */
  private static validateRequiredFields(
    request: any, 
    errors: AppError[], 
    _strategy: ValidationStrategy
  ): void {
    // 设备ID验证
    if (!this.validateDeviceId(request.deviceId)) {
      errors.push(ErrorFactory.validationError('Device ID is required and must be a non-empty string'));
    }

    // MAC地址验证
    if (!this.validateMacAddress(request.mac)) {
      errors.push(ErrorFactory.validationError('MAC address is required and must be a valid format'));
    }

    // 设备类型验证
    if (!this.validateDeviceType(request.deviceType)) {
      errors.push(ErrorFactory.validationError('Device type is required and must be a non-empty string'));
    }

    // 时间戳验证
    if (!this.validateTimestamp(request.timestamp)) {
      errors.push(ErrorFactory.validationError('Timestamp is required and must be a valid number'));
    }
  }

  /**
   * 验证可选字段（仅结构验证）
   */
  private static validateOptionalFields(
    request: any, 
    errors: AppError[], 
    warnings: string[], 
    _strategy: ValidationStrategy
  ): void {
    // 固件信息验证（结构层面）
    if (request.firmware !== undefined) {
      const firmwareValidation = this.validateFirmwareStructure(request.firmware);
      if (!firmwareValidation.isValid) {
        if (_strategy.strict) {
          errors.push(ErrorFactory.validationError('Firmware information is invalid', firmwareValidation.errors));
        } else {
          warnings.push(`Firmware validation failed: ${firmwareValidation.errors.join(', ')}`);
        }
      }
    }

    // 硬件信息验证（结构层面）
    if (request.hardware !== undefined) {
      const hardwareValidation = this.validateHardwareStructure(request.hardware);
      if (!hardwareValidation.isValid) {
        if (_strategy.strict) {
          errors.push(ErrorFactory.validationError('Hardware information is invalid', hardwareValidation.errors));
        } else {
          warnings.push(`Hardware validation failed: ${hardwareValidation.errors.join(', ')}`);
        }
      }
    }

    // 能力列表验证
    if (request.capabilities !== undefined && !this.validateCapabilitiesStructure(request.capabilities)) {
      if (_strategy.strict) {
        errors.push(ErrorFactory.validationError('Capabilities must be an array'));
      } else {
        warnings.push('Capabilities format is invalid');
      }
    }

    // 消息ID验证
    if (request.messageId !== undefined && !this.validateMessageId(request.messageId)) {
      if (_strategy.strict) {
        errors.push(ErrorFactory.validationError('Message ID must be a non-empty string if provided'));
      } else {
        warnings.push('Message ID format is invalid');
      }
    }

    // 签名格式验证
    if (request.signature !== undefined && !this.validateSignatureFormat(request.signature)) {
      if (_strategy.strict) {
        errors.push(ErrorFactory.validationError('Signature must be a valid hex string if provided'));
      } else {
        warnings.push('Signature format is invalid');
      }
    }
  }

  /**
   * 验证设备ID（结构验证）
   */
  private static validateDeviceId(deviceId: any): boolean {
    return typeof deviceId === 'string' && deviceId.trim().length > 0;
  }

  /**
   * 验证MAC地址（结构验证）
   */
  private static validateMacAddress(mac: any): boolean {
    if (typeof mac !== 'string' || mac.trim().length === 0) {
      return false;
    }
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    return macRegex.test(mac.trim());
  }

  /**
   * 验证设备类型（结构验证）
   */
  private static validateDeviceType(deviceType: any): boolean {
    return typeof deviceType === 'string' && deviceType.trim().length > 0;
  }

  /**
   * 验证时间戳（结构验证）
   */
  private static validateTimestamp(timestamp: any): boolean {
    return typeof timestamp === 'number' && 
           timestamp > 0 && 
           timestamp <= Date.now() + 30000; // 允许30秒的时钟误差
  }

  /**
   * 验证固件信息结构（不涉及业务语义）
   */
  private static validateFirmwareStructure(firmware: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!firmware || typeof firmware !== 'object') {
      errors.push('Firmware must be an object');
      return { isValid: false, errors };
    }

    // 只验证字段类型，不验证业务规则
    if (firmware.current !== undefined && typeof firmware.current !== 'string') {
      errors.push('Firmware current must be a string');
    }
    if (firmware.build !== undefined && typeof firmware.build !== 'string') {
      errors.push('Firmware build must be a string');
    }
    if (firmware.minRequired !== undefined && typeof firmware.minRequired !== 'string') {
      errors.push('Firmware minRequired must be a string');
    }
    if (firmware.channel !== undefined && !this.validateFirmwareChannel(firmware.channel)) {
      errors.push('Firmware channel must be one of: stable, beta, dev');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * 验证硬件信息结构（不涉及业务语义）
   */
  private static validateHardwareStructure(hardware: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!hardware || typeof hardware !== 'object') {
      errors.push('Hardware must be an object');
      return { isValid: false, errors };
    }

    // 只验证字段类型
    if (hardware.version !== undefined && typeof hardware.version !== 'string') {
      errors.push('Hardware version must be a string');
    }
    if (hardware.serial !== undefined && typeof hardware.serial !== 'string') {
      errors.push('Hardware serial must be a string');
    }
    if (hardware.description !== undefined && typeof hardware.description !== 'string') {
      errors.push('Hardware description must be a string');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * 验证能力列表结构
   */
  private static validateCapabilitiesStructure(capabilities: any): boolean {
    if (!Array.isArray(capabilities)) {
      return false;
    }
    return capabilities.every(cap => 
      cap && 
      typeof cap === 'object' && 
      typeof cap.name === 'string' && 
      cap.name.trim().length > 0
    );
  }

  /**
   * 验证固件通道
   */
  private static validateFirmwareChannel(channel: any): boolean {
    const validChannels = ['stable', 'beta', 'dev'];
    return typeof channel === 'string' && validChannels.includes(channel);
  }

  /**
   * 验证消息ID
   */
  private static validateMessageId(messageId: any): boolean {
    return typeof messageId === 'string' && messageId.trim().length > 0;
  }

  /**
   * 验证签名格式
   */
  private static validateSignatureFormat(signature: any): boolean {
    if (typeof signature !== 'string') {
      return false;
    }
    const hexRegex = /^[0-9a-fA-F]+$/;
    return hexRegex.test(signature) && signature.length % 2 === 0;
  }
}
