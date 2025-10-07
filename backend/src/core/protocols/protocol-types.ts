/**
 * 协议层通用类型定义
 */

export enum ProtocolType {
  MQTT = 'mqtt',
  HTTP = 'http',
  WEBSOCKET = 'websocket',
  UDP = 'udp',
  TCP = 'tcp',
  LORA = 'lora'
}

export interface ProtocolMessage {
  protocol: ProtocolType;
  topic?: string;
  payload: Buffer | string | object;
  qos?: number;
  retain?: boolean;
  timestamp: Date;
  source: string;
}

export interface ProtocolConfig {
  enabled: boolean;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  clientId?: string;
  [key: string]: any;
}

export interface AdapterStatus {
  connected: boolean;
  lastConnected?: Date;
  reconnectAttempts: number;
  error?: string;
}

export interface ProtocolAdapter {
  readonly protocol: ProtocolType;
  readonly status: AdapterStatus;
  
  initialize(): Promise<void>;
  publish(topic: string, payload: any, options?: any): Promise<boolean>;
  subscribe(topic: string, options?: any): Promise<boolean>;
  unsubscribe(topic: string): Promise<boolean>;
  shutdown(): Promise<void>;
  
  on(event: 'message', listener: (message: ProtocolMessage) => void): this;
  on(event: 'connected', listener: () => void): this;
  on(event: 'disconnected', listener: () => void): this;
  on(event: 'error', listener: (error: Error) => void): this;
}
