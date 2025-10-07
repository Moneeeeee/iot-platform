/**
 * 设备模板引擎
 * 功能：
 * 1. 模板定义解析
 * 2. 设备属性验证
 * 3. 遥测数据验证
 * 4. 数据映射与转换
 * 5. 指令验证
 */

import { logger } from '@/common/logger';
import { AppError } from '@/core/middleware/errorHandler';

// ==========================================
// 模板定义类型
// ==========================================

export interface AttributeDefinition {
  type: 'number' | 'string' | 'boolean' | 'object' | 'array';
  unit?: string;
  min?: number;
  max?: number;
  scale?: number;
  precision?: number;
  enum?: any[];
  range?: [number, number];
  serverMapping?: string; // 服务端字段映射
  schema?: Record<string, AttributeDefinition>; // 对象类型的嵌套 schema
  items?: AttributeDefinition; // 数组项类型
  required?: boolean;
  default?: any;
  description?: string;
}

export interface TelemetryMetricDefinition {
  name: string;
  type: 'number' | 'string' | 'boolean';
  unit?: string;
  sampling?: string; // '1m', '5m', '1h'
  range?: [number, number];
  precision?: number;
  validators?: string[]; // ['range(0,100)', 'positive']
  serverMapping?: string;
  required?: boolean;
}

export interface EventDefinition {
  name: string;
  level: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  fields: Record<string, AttributeDefinition>;
  description?: string;
}

export interface CommandDefinition {
  name: string;
  params: Record<string, AttributeDefinition>;
  timeout?: number; // 秒
  ackPolicy?: 'required' | 'optional' | 'none';
  retry?: number;
  rollback?: string; // 回滚指令名称
  description?: string;
}

export interface DeviceTemplateData {
  id: string;
  tenantId: string;
  name: string;
  type: string;
  version: string;
  attributes: Record<string, AttributeDefinition>;
  telemetryMetrics: TelemetryMetricDefinition[];
  events: EventDefinition[];
  commands: CommandDefinition[];
  firmwareConstraints?: {
    minVersion?: string;
    maxVersion?: string;
    requiredFeatures?: string[];
    minMemory?: number;
    minStorage?: number;
  };
}

// ==========================================
// 验证错误
// ==========================================

export class ValidationError extends Error {
  constructor(
    public field: string,
    message: string,
    public value?: any
  ) {
    super(`Validation error for ${field}: ${message}`);
    this.name = 'ValidationError';
  }
}

// ==========================================
// 设备模板引擎
// ==========================================

export class DeviceTemplateEngine {
  private template: DeviceTemplateData;

  constructor(template: DeviceTemplateData) {
    this.template = template;
  }

  // ==========================================
  // 属性验证
  // ==========================================

  /**
   * 验证设备属性
   */
  validateAttributes(attributes: Record<string, any>): {
    valid: boolean;
    errors: ValidationError[];
    normalized: Record<string, any>;
  } {
    const errors: ValidationError[] = [];
    const normalized: Record<string, any> = {};

    for (const [key, definition] of Object.entries(this.template.attributes)) {
      const value = attributes[key];

      // 检查必填字段
      if (definition.required && (value === undefined || value === null)) {
        errors.push(new ValidationError(key, 'Required field is missing'));
        continue;
      }

      // 如果没有值且有默认值
      if (value === undefined && definition.default !== undefined) {
        normalized[key] = definition.default;
        continue;
      }

      // 如果没有值且非必填，跳过
      if (value === undefined) {
        continue;
      }

      // 验证并规范化
      try {
        normalized[key] = this.validateValue(key, value, definition);
      } catch (error) {
        if (error instanceof ValidationError) {
          errors.push(error);
        } else {
          errors.push(new ValidationError(key, String(error)));
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      normalized,
    };
  }

  /**
   * 验证遥测数据
   */
  validateTelemetry(metrics: Record<string, any>): {
    valid: boolean;
    errors: ValidationError[];
    normalized: Record<string, any>;
  } {
    const errors: ValidationError[] = [];
    const normalized: Record<string, any> = {};

    for (const metricDef of this.template.telemetryMetrics) {
      const value = metrics[metricDef.name];

      // 检查必填字段
      if (metricDef.required && (value === undefined || value === null)) {
        errors.push(new ValidationError(metricDef.name, 'Required metric is missing'));
        continue;
      }

      // 如果没有值且非必填，跳过
      if (value === undefined) {
        continue;
      }

      // 验证并规范化
      try {
        const validatedValue = this.validateTelemetryValue(metricDef, value);
        normalized[metricDef.name] = validatedValue;
      } catch (error) {
        if (error instanceof ValidationError) {
          errors.push(error);
        } else {
          errors.push(new ValidationError(metricDef.name, String(error)));
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      normalized,
    };
  }

  /**
   * 验证事件数据
   */
  validateEvent(eventType: string, data: Record<string, any>): {
    valid: boolean;
    errors: ValidationError[];
    normalized: Record<string, any>;
    eventDef?: EventDefinition;
  } {
    const eventDef = this.template.events.find((e) => e.name === eventType);

    if (!eventDef) {
      return {
        valid: false,
        errors: [new ValidationError('eventType', `Unknown event type: ${eventType}`)],
        normalized: {},
      };
    }

    const errors: ValidationError[] = [];
    const normalized: Record<string, any> = {};

    for (const [key, definition] of Object.entries(eventDef.fields)) {
      const value = data[key];

      if (definition.required && (value === undefined || value === null)) {
        errors.push(new ValidationError(key, 'Required field is missing'));
        continue;
      }

      if (value === undefined) {
        continue;
      }

      try {
        normalized[key] = this.validateValue(key, value, definition);
      } catch (error) {
        if (error instanceof ValidationError) {
          errors.push(error);
        } else {
          errors.push(new ValidationError(key, String(error)));
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      normalized,
      eventDef,
    };
  }

  /**
   * 验证指令参数
   */
  validateCommand(commandName: string, params: Record<string, any>): {
    valid: boolean;
    errors: ValidationError[];
    normalized: Record<string, any>;
    commandDef?: CommandDefinition;
  } {
    const commandDef = this.template.commands.find((c) => c.name === commandName);

    if (!commandDef) {
      return {
        valid: false,
        errors: [new ValidationError('commandName', `Unknown command: ${commandName}`)],
        normalized: {},
      };
    }

    const errors: ValidationError[] = [];
    const normalized: Record<string, any> = {};

    for (const [key, definition] of Object.entries(commandDef.params)) {
      const value = params[key];

      if (definition.required && (value === undefined || value === null)) {
        errors.push(new ValidationError(key, 'Required parameter is missing'));
        continue;
      }

      if (value === undefined) {
        continue;
      }

      try {
        normalized[key] = this.validateValue(key, value, definition);
      } catch (error) {
        if (error instanceof ValidationError) {
          errors.push(error);
        } else {
          errors.push(new ValidationError(key, String(error)));
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      normalized,
      commandDef,
    };
  }

  // ==========================================
  // 值验证
  // ==========================================

  private validateValue(field: string, value: any, definition: AttributeDefinition): any {
    // 类型检查
    const actualType = this.getActualType(value);
    if (actualType !== definition.type) {
      throw new ValidationError(
        field,
        `Expected type ${definition.type}, got ${actualType}`,
        value
      );
    }

    // 数字验证
    if (definition.type === 'number') {
      return this.validateNumber(field, value, definition);
    }

    // 字符串验证
    if (definition.type === 'string') {
      return this.validateString(field, value, definition);
    }

    // 枚举验证
    if (definition.enum && !definition.enum.includes(value)) {
      throw new ValidationError(
        field,
        `Value must be one of: ${definition.enum.join(', ')}`,
        value
      );
    }

    // 对象验证
    if (definition.type === 'object' && definition.schema) {
      return this.validateObject(field, value, definition.schema);
    }

    // 数组验证
    if (definition.type === 'array' && definition.items) {
      return this.validateArray(field, value, definition.items);
    }

    return value;
  }

  private validateNumber(field: string, value: number, definition: AttributeDefinition): number {
    // 范围检查
    if (definition.min !== undefined && value < definition.min) {
      throw new ValidationError(field, `Value must be >= ${definition.min}`, value);
    }

    if (definition.max !== undefined && value > definition.max) {
      throw new ValidationError(field, `Value must be <= ${definition.max}`, value);
    }

    if (definition.range) {
      const [min, max] = definition.range;
      if (value < min || value > max) {
        throw new ValidationError(field, `Value must be in range [${min}, ${max}]`, value);
      }
    }

    // 精度处理
    if (definition.precision !== undefined) {
      value = Number(value.toFixed(definition.precision));
    }

    // 缩放
    if (definition.scale !== undefined) {
      value = value * definition.scale;
    }

    return value;
  }

  private validateString(field: string, value: string, definition: AttributeDefinition): string {
    // 可以扩展：正则验证、长度验证等
    return value;
  }

  private validateObject(
    field: string,
    value: Record<string, any>,
    schema: Record<string, AttributeDefinition>
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, subDefinition] of Object.entries(schema)) {
      const subValue = value[key];
      const subField = `${field}.${key}`;

      if (subDefinition.required && (subValue === undefined || subValue === null)) {
        throw new ValidationError(subField, 'Required field is missing');
      }

      if (subValue !== undefined) {
        result[key] = this.validateValue(subField, subValue, subDefinition);
      }
    }

    return result;
  }

  private validateArray(field: string, value: any[], itemDefinition: AttributeDefinition): any[] {
    return value.map((item, index) => {
      return this.validateValue(`${field}[${index}]`, item, itemDefinition);
    });
  }

  private validateTelemetryValue(metricDef: TelemetryMetricDefinition, value: any): any {
    // 类型检查
    const actualType = this.getActualType(value);
    if (actualType !== metricDef.type) {
      throw new ValidationError(
        metricDef.name,
        `Expected type ${metricDef.type}, got ${actualType}`,
        value
      );
    }

    // 数字验证
    if (metricDef.type === 'number') {
      if (metricDef.range) {
        const [min, max] = metricDef.range;
        if (value < min || value > max) {
          throw new ValidationError(
            metricDef.name,
            `Value must be in range [${min}, ${max}]`,
            value
          );
        }
      }

      if (metricDef.precision !== undefined) {
        value = Number(value.toFixed(metricDef.precision));
      }

      // 验证器
      if (metricDef.validators) {
        for (const validator of metricDef.validators) {
          this.applyValidator(metricDef.name, value, validator);
        }
      }
    }

    return value;
  }

  private applyValidator(field: string, value: any, validator: string): void {
    // range(min,max)
    if (validator.startsWith('range(')) {
      const match = validator.match(/range\((-?\d+\.?\d*),(-?\d+\.?\d*)\)/);
      if (match) {
        const min = Number(match[1]);
        const max = Number(match[2]);
        if (value < min || value > max) {
          throw new ValidationError(field, `Value must be in range [${min}, ${max}]`, value);
        }
      }
    }

    // positive
    if (validator === 'positive' && value <= 0) {
      throw new ValidationError(field, 'Value must be positive', value);
    }

    // negative
    if (validator === 'negative' && value >= 0) {
      throw new ValidationError(field, 'Value must be negative', value);
    }

    // integer
    if (validator === 'integer' && !Number.isInteger(value)) {
      throw new ValidationError(field, 'Value must be an integer', value);
    }
  }

  private getActualType(value: any): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'string') return 'string';
    if (typeof value === 'boolean') return 'boolean';
    return 'unknown';
  }

  // ==========================================
  // 数据映射
  // ==========================================

  /**
   * 将设备上报数据映射到服务端字段
   */
  mapDeviceDataToServer(deviceData: Record<string, any>): Record<string, any> {
    const mapped: Record<string, any> = {};

    // 映射属性
    for (const [key, definition] of Object.entries(this.template.attributes)) {
      const value = deviceData[key];
      if (value !== undefined) {
        const serverKey = definition.serverMapping || key;
        mapped[serverKey] = value;
      }
    }

    // 映射遥测指标
    for (const metricDef of this.template.telemetryMetrics) {
      const value = deviceData[metricDef.name];
      if (value !== undefined) {
        const serverKey = metricDef.serverMapping || metricDef.name;
        mapped[serverKey] = value;
      }
    }

    return mapped;
  }

  /**
   * 将服务端数据映射到设备字段
   */
  mapServerDataToDevice(serverData: Record<string, any>): Record<string, any> {
    const mapped: Record<string, any> = {};

    // 反向映射
    const reverseMapping: Record<string, string> = {};

    for (const [key, definition] of Object.entries(this.template.attributes)) {
      const serverKey = definition.serverMapping || key;
      reverseMapping[serverKey] = key;
    }

    for (const metricDef of this.template.telemetryMetrics) {
      const serverKey = metricDef.serverMapping || metricDef.name;
      reverseMapping[serverKey] = metricDef.name;
    }

    for (const [serverKey, value] of Object.entries(serverData)) {
      const deviceKey = reverseMapping[serverKey] || serverKey;
      mapped[deviceKey] = value;
    }

    return mapped;
  }

  // ==========================================
  // 工具方法
  // ==========================================

  getTemplate(): DeviceTemplateData {
    return this.template;
  }

  getEventDefinition(eventType: string): EventDefinition | undefined {
    return this.template.events.find((e) => e.name === eventType);
  }

  getCommandDefinition(commandName: string): CommandDefinition | undefined {
    return this.template.commands.find((c) => c.name === commandName);
  }

  getTelemetryMetric(metricName: string): TelemetryMetricDefinition | undefined {
    return this.template.telemetryMetrics.find((m) => m.name === metricName);
  }
}

// ==========================================
// 模板管理器（缓存）
// ==========================================

export class TemplateManager {
  private static cache: Map<string, DeviceTemplateEngine> = new Map();

  /**
   * 加载模板（带缓存）
   */
  static async loadTemplate(templateId: string): Promise<DeviceTemplateEngine> {
    const cached = this.cache.get(templateId);
    if (cached) {
      return cached;
    }

    // 从数据库加载（需要 prisma）
    // 这里暂时返回占位，实际需要集成 Prisma
    throw new Error('Template loading not implemented');
  }

  /**
   * 设置模板缓存
   */
  static setTemplate(templateId: string, template: DeviceTemplateData): DeviceTemplateEngine {
    const engine = new DeviceTemplateEngine(template);
    this.cache.set(templateId, engine);
    return engine;
  }

  /**
   * 清除缓存
   */
  static clearCache(templateId?: string): void {
    if (templateId) {
      this.cache.delete(templateId);
    } else {
      this.cache.clear();
    }
  }
}

export default DeviceTemplateEngine;

