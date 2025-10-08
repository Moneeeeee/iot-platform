/**
 * BootstrapValidator 测试
 * 
 * 测试验证器的功能，包括：
 * 1. 基础字段验证
 * 2. 数据类型验证
 * 3. 业务规则验证
 * 4. 错误信息收集
 * 5. 边界条件处理
 */

import { BootstrapValidator } from '@/modules/bootstrap/validators/bootstrap.validator';
// import { ValidationResult } from '@/modules/bootstrap/validators/bootstrap.validator';
// import { DeviceBootstrapRequest } from '@/modules/bootstrap/types';

describe('BootstrapValidator', () => {
  let validRequest: any;

  beforeEach(() => {
    validRequest = {
      deviceId: 'test-device-001',
      mac: 'AA:BB:CC:DD:EE:FF',
      deviceType: 'sensor',
      firmware: {
        current: '1.0.0',
        build: '20240101.001',
        minRequired: '1.0.0',
        channel: 'stable'
      },
      hardware: {
        version: 'v1.0',
        serial: 'HW123456'
      },
      capabilities: [
        { name: 'temperature' },
        { name: 'humidity' }
      ],
      timestamp: 1730899200000,
      messageId: 'msg-001',
      signature: 'abc123def456'
    };
  });

  describe('validateBootstrapRequest', () => {
    it('should validate correct request successfully', () => {
      const result = BootstrapValidator.validateBootstrapRequest(validRequest);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.data).toEqual(validRequest);
    });

    it('should reject null or undefined request', () => {
      const result1 = BootstrapValidator.validateBootstrapRequest(null);
      const result2 = BootstrapValidator.validateBootstrapRequest(undefined);

      expect(result1.isValid).toBe(false);
      expect(result1.errors).toContain('Request body must be a valid object');
      expect(result2.isValid).toBe(false);
      expect(result2.errors).toContain('Request body must be a valid object');
    });

    it('should reject non-object request', () => {
      const result = BootstrapValidator.validateBootstrapRequest('invalid');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Request body must be a valid object');
    });
  });

  describe('Device ID Validation', () => {
    it('should reject empty device ID', () => {
      const request = { ...validRequest, deviceId: '' };
      const result = BootstrapValidator.validateBootstrapRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Device ID is required and must be a non-empty string');
    });

    it('should reject undefined device ID', () => {
      const request = { ...validRequest };
      delete request.deviceId;
      const result = BootstrapValidator.validateBootstrapRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Device ID is required and must be a non-empty string');
    });

    it('should reject non-string device ID', () => {
      const request = { ...validRequest, deviceId: 123 };
      const result = BootstrapValidator.validateBootstrapRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Device ID is required and must be a non-empty string');
    });

    it('should accept valid device ID', () => {
      const request = { ...validRequest, deviceId: 'device-123-abc' };
      const result = BootstrapValidator.validateBootstrapRequest(request);

      expect(result.isValid).toBe(true);
      expect(result.errors).not.toContain(expect.stringContaining('Device ID'));
    });

    it('should accept device ID with special characters', () => {
      const request = { ...validRequest, deviceId: 'device_123-abc.test' };
      const result = BootstrapValidator.validateBootstrapRequest(request);

      expect(result.isValid).toBe(true);
    });
  });

  describe('MAC Address Validation', () => {
    it('should reject empty MAC address', () => {
      const request = { ...validRequest, mac: '' };
      const result = BootstrapValidator.validateBootstrapRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('MAC address is required and must be a valid format');
    });

    it('should reject undefined MAC address', () => {
      const request = { ...validRequest };
      delete request.mac;
      const result = BootstrapValidator.validateBootstrapRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('MAC address is required and must be a valid format');
    });

    it('should reject invalid MAC format', () => {
      const invalidMacs = [
        'invalid-mac',
        'AA:BB:CC:DD:EE', // 太短
        'AA:BB:CC:DD:EE:FF:GG', // 太长
        'AA-BB-CC-DD-EE-GG', // 无效字符
        'AA:BB:CC:DD:EE:FF:HH', // 超过6组
        'AA:BB:CC:DD:EE' // 只有5组
      ];

      invalidMacs.forEach(mac => {
        const request = { ...validRequest, mac };
        const result = BootstrapValidator.validateBootstrapRequest(request);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('MAC address is required and must be a valid format');
      });
    });

    it('should accept valid MAC formats', () => {
      const validMacs = [
        'AA:BB:CC:DD:EE:FF', // 冒号分隔
        'AA-BB-CC-DD-EE-FF', // 连字符分隔
        'AA:bb:CC:dd:EE:ff' // 混合大小写
      ];

      validMacs.forEach(mac => {
        const request = { ...validRequest, mac };
        const result = BootstrapValidator.validateBootstrapRequest(request);

        expect(result.isValid).toBe(true);
        expect(result.errors).not.toContain(expect.stringContaining('MAC address'));
      });
    });
  });

  describe('Device Type Validation', () => {
    it('should reject empty device type', () => {
      const request = { ...validRequest, deviceType: '' };
      const result = BootstrapValidator.validateBootstrapRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Device type is required and must be a non-empty string');
    });

    it('should reject undefined device type', () => {
      const request = { ...validRequest };
      delete request.deviceType;
      const result = BootstrapValidator.validateBootstrapRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Device type is required and must be a non-empty string');
    });

    it('should reject non-string device type', () => {
      const request = { ...validRequest, deviceType: 123 };
      const result = BootstrapValidator.validateBootstrapRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Device type is required and must be a non-empty string');
    });

    it('should accept valid device types', () => {
      const validTypes = ['sensor', 'gateway', 'ps-ctrl', 'dtu', 'rtu', 'ftu'];
      
      validTypes.forEach(type => {
        const request = { ...validRequest, deviceType: type };
        const result = BootstrapValidator.validateBootstrapRequest(request);

        expect(result.isValid).toBe(true);
        expect(result.errors).not.toContain(expect.stringContaining('Device type'));
      });
    });
  });

  describe('Firmware Validation', () => {
    it('should reject missing firmware object', () => {
      const request = { ...validRequest };
      delete request.firmware;
      const result = BootstrapValidator.validateBootstrapRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Firmware information is invalid');
    });

    it('should reject non-object firmware', () => {
      const request = { ...validRequest, firmware: 'invalid' };
      const result = BootstrapValidator.validateBootstrapRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Firmware information is invalid');
    });

    it('should reject empty firmware version', () => {
      const request = { ...validRequest, firmware: { ...validRequest.firmware, current: '' } };
      const result = BootstrapValidator.validateBootstrapRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Firmware information is invalid');
    });

    it('should reject missing firmware build', () => {
      const request = { ...validRequest, firmware: { ...validRequest.firmware } };
      delete request.firmware.build;
      const result = BootstrapValidator.validateBootstrapRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Firmware information is invalid');
    });

    it('should reject missing minRequired version', () => {
      const request = { ...validRequest, firmware: { ...validRequest.firmware } };
      delete request.firmware.minRequired;
      const result = BootstrapValidator.validateBootstrapRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Firmware information is invalid');
    });

    it('should reject invalid firmware channel', () => {
      const request = { ...validRequest, firmware: { ...validRequest.firmware, channel: 'invalid' } };
      const result = BootstrapValidator.validateBootstrapRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Firmware information is invalid');
    });

    it('should accept valid firmware channels', () => {
      const validChannels = ['stable', 'beta', 'dev'];
      
      validChannels.forEach(channel => {
        const request = { ...validRequest, firmware: { ...validRequest.firmware, channel } };
        const result = BootstrapValidator.validateBootstrapRequest(request);

        expect(result.isValid).toBe(true);
        expect(result.errors).not.toContain(expect.stringContaining('Firmware information'));
      });
    });

    it('should accept firmware without channel', () => {
      const request = { ...validRequest, firmware: { ...validRequest.firmware } };
      delete request.firmware.channel;
      const result = BootstrapValidator.validateBootstrapRequest(request);

      expect(result.isValid).toBe(true);
    });
  });

  describe('Hardware Validation', () => {
    it('should reject missing hardware object', () => {
      const request = { ...validRequest };
      delete request.hardware;
      const result = BootstrapValidator.validateBootstrapRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Hardware information is invalid');
    });

    it('should reject non-object hardware', () => {
      const request = { ...validRequest, hardware: 'invalid' };
      const result = BootstrapValidator.validateBootstrapRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Hardware information is invalid');
    });

    it('should reject empty hardware version', () => {
      const request = { ...validRequest, hardware: { ...validRequest.hardware, version: '' } };
      const result = BootstrapValidator.validateBootstrapRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Hardware information is invalid');
    });

    it('should reject missing hardware serial', () => {
      const request = { ...validRequest, hardware: { ...validRequest.hardware } };
      delete request.hardware.serial;
      const result = BootstrapValidator.validateBootstrapRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Hardware information is invalid');
    });

    it('should accept hardware with description', () => {
      const request = { 
        ...validRequest, 
        hardware: { 
          ...validRequest.hardware, 
          description: 'Temperature sensor v1.0' 
        } 
      };
      const result = BootstrapValidator.validateBootstrapRequest(request);

      expect(result.isValid).toBe(true);
    });

    it('should reject non-string hardware description', () => {
      const request = { 
        ...validRequest, 
        hardware: { 
          ...validRequest.hardware, 
          description: 123 
        } 
      };
      const result = BootstrapValidator.validateBootstrapRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Hardware information is invalid');
    });
  });

  describe('Capabilities Validation', () => {
    it('should reject non-array capabilities', () => {
      const request = { ...validRequest, capabilities: 'invalid' };
      const result = BootstrapValidator.validateBootstrapRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Capabilities must be an array');
    });

    it('should accept empty capabilities array', () => {
      const request = { ...validRequest, capabilities: [] };
      const result = BootstrapValidator.validateBootstrapRequest(request);

      expect(result.isValid).toBe(true);
    });

    it('should reject capabilities with invalid items', () => {
      const invalidCapabilities = [
        null,
        undefined,
        'invalid',
        123,
        {},
        { name: '' }, // 空名称
        { invalid: 'field' } // 缺少 name 字段
      ];

      invalidCapabilities.forEach(cap => {
        const request = { ...validRequest, capabilities: [cap] };
        const result = BootstrapValidator.validateBootstrapRequest(request);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Capabilities must be an array');
      });
    });

    it('should accept valid capabilities', () => {
      const validCapabilities = [
        { name: 'temperature' },
        { name: 'humidity' },
        { name: 'pressure' },
        { name: 'gps' }
      ];

      const request = { ...validRequest, capabilities: validCapabilities };
      const result = BootstrapValidator.validateBootstrapRequest(request);

      expect(result.isValid).toBe(true);
    });
  });

  describe('Timestamp Validation', () => {
    it('should reject missing timestamp', () => {
      const request = { ...validRequest };
      delete request.timestamp;
      const result = BootstrapValidator.validateBootstrapRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Timestamp is required and must be a valid number');
    });

    it('should reject non-number timestamp', () => {
      const request = { ...validRequest, timestamp: 'invalid' };
      const result = BootstrapValidator.validateBootstrapRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Timestamp is required and must be a valid number');
    });

    it('should reject negative timestamp', () => {
      const request = { ...validRequest, timestamp: -1 };
      const result = BootstrapValidator.validateBootstrapRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Timestamp is required and must be a valid number');
    });

    it('should reject zero timestamp', () => {
      const request = { ...validRequest, timestamp: 0 };
      const result = BootstrapValidator.validateBootstrapRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Timestamp is required and must be a valid number');
    });

    it('should reject future timestamp beyond tolerance', () => {
      const futureTime = Date.now() + 60000; // 1分钟后
      const request = { ...validRequest, timestamp: futureTime };
      const result = BootstrapValidator.validateBootstrapRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Timestamp is required and must be a valid number');
    });

    it('should accept valid timestamp within tolerance', () => {
      const validTimestamps = [
        Date.now() - 1000, // 1秒前
        Date.now() - 30000, // 30秒前
        Date.now() + 10000 // 10秒后（在容差范围内）
      ];

      validTimestamps.forEach(timestamp => {
        const request = { ...validRequest, timestamp };
        const result = BootstrapValidator.validateBootstrapRequest(request);

        expect(result.isValid).toBe(true);
        expect(result.errors).not.toContain(expect.stringContaining('Timestamp'));
      });
    });
  });

  describe('Optional Fields Validation', () => {
    it('should accept valid message ID', () => {
      const request = { ...validRequest, messageId: 'msg-123-abc' };
      const result = BootstrapValidator.validateBootstrapRequest(request);

      expect(result.isValid).toBe(true);
    });

    it('should reject empty message ID', () => {
      const request = { ...validRequest, messageId: '' };
      const result = BootstrapValidator.validateBootstrapRequest(request);

      // 空字符串被认为是提供了字段但无效
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Message ID must be a non-empty string if provided');
    });

    it('should reject non-string message ID', () => {
      const request = { ...validRequest, messageId: 123 };
      const result = BootstrapValidator.validateBootstrapRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Message ID must be a non-empty string if provided');
    });

    it('should accept valid signature format', () => {
      const validSignatures = [
        'abc123def456',
        'ABCDEF123456',
        'abcdef1234567890abcdef1234567890'
      ];

      validSignatures.forEach(signature => {
        const request = { ...validRequest, signature };
        const result = BootstrapValidator.validateBootstrapRequest(request);

        expect(result.isValid).toBe(true);
        expect(result.errors).not.toContain(expect.stringContaining('Signature'));
      });
    });

    it('should reject invalid signature format', () => {
      const invalidSignatures = [
        'invalid-signature', // 包含非十六进制字符
        'abc123g', // 包含非十六进制字符
        'abc123def' // 奇数长度
      ];

      invalidSignatures.forEach(signature => {
        const request = { ...validRequest, signature };
        const result = BootstrapValidator.validateBootstrapRequest(request);

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Signature must be a valid hex string if provided');
      });
    });

    it('should accept request without optional fields', () => {
      const request = { ...validRequest };
      delete request.messageId;
      delete request.signature;
      const result = BootstrapValidator.validateBootstrapRequest(request);

      expect(result.isValid).toBe(true);
    });
  });

  describe('Multiple Errors', () => {
    it('should collect multiple validation errors', () => {
      const invalidRequest = {
        deviceId: '',
        mac: 'invalid-mac',
        deviceType: '',
        firmware: {
          current: '',
          build: '',
          minRequired: '',
          channel: 'invalid'
        },
        hardware: {
          version: '',
          serial: ''
        },
        capabilities: 'invalid',
        timestamp: -1
      };

      const result = BootstrapValidator.validateBootstrapRequest(invalidRequest);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(5);
      expect(result.errors).toContain('Device ID is required and must be a non-empty string');
      expect(result.errors).toContain('MAC address is required and must be a valid format');
      expect(result.errors).toContain('Device type is required and must be a non-empty string');
      expect(result.errors).toContain('Firmware information is invalid');
      expect(result.errors).toContain('Hardware information is invalid');
      expect(result.errors).toContain('Capabilities must be an array');
      expect(result.errors).toContain('Timestamp is required and must be a valid number');
    });
  });

  describe('Edge Cases', () => {
    it('should handle whitespace-only strings', () => {
      const request = {
        ...validRequest,
        deviceId: '   ',
        deviceType: '   ',
        mac: '   '
      };
      const result = BootstrapValidator.validateBootstrapRequest(request);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Device ID is required and must be a non-empty string');
      expect(result.errors).toContain('Device type is required and must be a non-empty string');
      expect(result.errors).toContain('MAC address is required and must be a valid format');
    });

    it('should handle very long strings', () => {
      const longString = 'a'.repeat(1000);
      const request = {
        ...validRequest,
        deviceId: longString,
        deviceType: longString
      };
      const result = BootstrapValidator.validateBootstrapRequest(request);

      // 长字符串应该被接受（除非有长度限制）
      expect(result.isValid).toBe(true);
    });

    it('should handle special characters in valid fields', () => {
      const request = {
        ...validRequest,
        deviceId: 'device-123_test.abc',
        deviceType: 'sensor-v2.0',
        hardware: {
          ...validRequest.hardware,
          serial: 'HW-123_ABC.456'
        }
      };
      const result = BootstrapValidator.validateBootstrapRequest(request);

      expect(result.isValid).toBe(true);
    });
  });
});
