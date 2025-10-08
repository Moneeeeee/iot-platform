/**
 * 测试数据工厂
 * 用于生成符合类型定义的测试数据
 */

import { BootstrapResponseEnvelope, DeviceBootstrapResponse, BootstrapConfig, MqttConfig, DeviceFirmware } from '@/modules/bootstrap/types/bootstrap-response';

export class TestDataFactory {
  /**
   * 创建完整的BootstrapResponseEnvelope
   */
  static createBootstrapResponseEnvelope(overrides: Partial<BootstrapResponseEnvelope> = {}): BootstrapResponseEnvelope {
    return {
      code: 200,
      message: 'Success',
      timestamp: Date.now(),
      signature: 'mock-signature',
      data: this.createDeviceBootstrapResponse(),
      ...overrides
    };
  }

  /**
   * 创建完整的DeviceBootstrapResponse
   */
  static createDeviceBootstrapResponse(overrides: Partial<DeviceBootstrapResponse> = {}): DeviceBootstrapResponse {
    return {
      cfg: this.createBootstrapConfig(),
      mqtt: this.createMqttConfig(),
      ota: { available: false, retry: { baseMs: 5000, maxMs: 60000 } },
      shadowDesired: { 
        reporting: { heartbeatMs: 60000 },
        sensors: { samplingMs: 1000 },
        thresholds: { voltage: { min: 3.0, max: 5.0 } },
        features: { alarmEnabled: true, autoRebootDays: 7 }
      },
      policies: { 
        ingestLimits: { telemetryQps: 10, statusQps: 5 },
        retention: { telemetryDays: 30, statusDays: 7, eventsDays: 14 }
      },
      serverTime: { timestamp: Date.now(), timezoneOffset: 0 },
      websocket: { 
        enabled: true,
        url: 'ws://localhost:8000/ws', 
        reconnectMs: 5000,
        heartbeatMs: 30000,
        timeoutMs: 10000
      },
      ...overrides
    };
  }

  /**
   * 创建BootstrapConfig
   */
  static createBootstrapConfig(overrides: Partial<BootstrapConfig> = {}): BootstrapConfig {
    return {
      ver: '1.0.0',
      issuedAt: Date.now(),
      expiresAt: Date.now() + 3600000,
      tenant: 'default',
      device: {
        id: 'test-device-001',
        type: 'sensor',
        uniqueId: 'test-device-001',
        fw: this.createDeviceFirmware(),
        hw: 'v1.0',
        capabilities: ['temperature_sensor']
      },
      ...overrides
    };
  }

  /**
   * 创建DeviceFirmware
   */
  static createDeviceFirmware(overrides: Partial<DeviceFirmware> = {}): DeviceFirmware {
    return {
      current: '1.0.0',
      build: '001',
      minRequired: '1.0.0',
      channel: 'stable',
      ...overrides
    };
  }

  /**
   * 创建MqttConfig
   */
  static createMqttConfig(overrides: Partial<MqttConfig> = {}): MqttConfig {
    return {
      brokers: [
        { url: 'mqtt://localhost:1883', priority: 1 }
      ],
      clientId: 'test-device-001',
      username: 'test-user',
      password: 'test-password',
      passwordExpiresAt: Date.now() + 3600000,
      keepalive: 60,
      sessionExpiry: 604800,
      cleanStart: true,
      topics: {
        telemetryPub: 'iot/default/sensor/test-device-001/telemetry',
        statusPub: 'iot/default/sensor/test-device-001/status',
        eventPub: 'iot/default/sensor/test-device-001/event',
        cmdSub: 'iot/default/sensor/test-device-001/cmd',
        cmdresPub: 'iot/default/sensor/test-device-001/cmdres',
        shadowDesiredSub: 'iot/default/sensor/test-device-001/shadow/desired',
        shadowReportedPub: 'iot/default/sensor/test-device-001/shadow/reported',
        cfgSub: 'iot/default/sensor/test-device-001/cfg',
        otaProgressPub: 'iot/default/sensor/test-device-001/ota/progress'
      },
      lwt: {
        topic: 'iot/default/sensor/test-device-001/status',
        qos: 1,
        retain: true,
        payload: {
          ts: new Date().toISOString(),
          online: false,
          reason: 'connection_lost'
        }
      },
      qosRetainPolicy: [
        { topic: 'iot/default/sensor/test-device-001/telemetry', qos: 1, retain: false },
        { topic: 'iot/default/sensor/test-device-001/status', qos: 1, retain: true },
        { topic: 'iot/default/sensor/test-device-001/event', qos: 1, retain: false },
        { topic: 'iot/default/sensor/test-device-001/cmd', qos: 1, retain: false },
        { topic: 'iot/default/sensor/test-device-001/shadow/desired', qos: 1, retain: true },
        { topic: 'iot/default/sensor/test-device-001/cfg', qos: 1, retain: true }
      ],
      acl: {
        publish: [
          'iot/default/sensor/test-device-001/telemetry',
          'iot/default/sensor/test-device-001/status',
          'iot/default/sensor/test-device-001/event',
          'iot/default/sensor/test-device-001/cmdres',
          'iot/default/sensor/test-device-001/shadow/reported',
          'iot/default/sensor/test-device-001/ota/progress'
        ],
        subscribe: [
          'iot/default/sensor/test-device-001/cmd',
          'iot/default/sensor/test-device-001/shadow/desired',
          'iot/default/sensor/test-device-001/cfg'
        ]
      },
      tls: {
        enabled: false
      },
      backoff: {
        baseMs: 1000,
        maxMs: 30000,
        jitter: true
      },
      ...overrides
    };
  }

  /**
   * 创建错误响应
   */
  static createErrorResponse(code: number, message: string, errorCode?: string): BootstrapResponseEnvelope {
    return {
      code,
      message,
      timestamp: Date.now(),
      signature: 'mock-signature',
      errorCode: errorCode || 'UNKNOWN_ERROR',
      errorDetails: { deviceId: 'test-device-001', tenantId: 'default' },
      data: this.createDeviceBootstrapResponse()
    };
  }
}
