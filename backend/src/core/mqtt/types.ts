/**
 * MQTT 类型定义
 */

export interface MQTTConfig {
  enabled: boolean;
  brokerUrl: string;
  port: number;
  username?: string;
  password?: string;
  clientId: string;
  clean: boolean;
  connectTimeout: number;
  reconnectPeriod: number;
  will?: {
    topic: string;
    payload: string;
    qos: 0 | 1 | 2;
    retain: boolean;
  };
}

export interface MQTTMessage {
  topic: string;
  payload: Buffer;
  qos: 0 | 1 | 2;
  retain: boolean;
  timestamp: Date;
}

export interface MQTTPublishOptions {
  qos?: 0 | 1 | 2;
  retain?: boolean;
  dup?: boolean;
}

export interface MQTTSubscribeOptions {
  qos?: 0 | 1 | 2;
}

export interface MQTTConnectionInfo {
  connected: boolean;
  clientId: string;
  brokerUrl: string;
  lastConnected?: Date;
  reconnectAttempts: number;
}
