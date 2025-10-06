/**
 * 前端统一数据层接口类型定义
 */

import { ApiResponse, PaginationParams, QueryParams } from './contracts';

// 设备相关接口
export interface Device {
  id: string;
  name: string;
  type: string;
  status: 'online' | 'offline' | 'error';
  tenantId: string;
  productId?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  lastSeen?: string;
}

export interface DeviceCreateRequest {
  name: string;
  type: string;
  productId?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  metadata?: Record<string, any>;
}

export interface DeviceUpdateRequest {
  name?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  metadata?: Record<string, any>;
}

export interface DeviceListResponse extends ApiResponse<Device[]> {
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

// 遥测数据接口
export interface TelemetryData {
  id: string;
  deviceId: string;
  timestamp: string;
  metrics: Record<string, number | string | boolean>;
  tags?: Record<string, string>;
}

export interface TelemetryQuery extends QueryParams {
  deviceId?: string;
  startTime?: string;
  endTime?: string;
  metrics?: string[];
  tags?: Record<string, string>;
}

export interface TelemetryResponse extends ApiResponse<TelemetryData[]> {
  meta: {
    total: number;
    page: number;
    limit: number;
    timeRange: {
      start: string;
      end: string;
    };
  };
}

// 告警相关接口
export interface Alert {
  id: string;
  deviceId: string;
  type: 'error' | 'warning' | 'info';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  status: 'active' | 'acknowledged' | 'resolved';
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  metadata?: Record<string, any>;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  deviceType?: string;
  conditions: AlertCondition[];
  actions: AlertAction[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne';
  value: number | string;
  duration?: number; // 持续时间（秒）
}

export interface AlertAction {
  type: 'email' | 'webhook' | 'sms' | 'notification';
  config: Record<string, any>;
}

export interface AlertListResponse extends ApiResponse<Alert[]> {
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

// OTA升级相关接口
export interface Firmware {
  id: string;
  name: string;
  version: string;
  description?: string;
  fileUrl: string;
  fileSize: number;
  checksum: string;
  deviceTypes: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OtaRollout {
  id: string;
  name: string;
  description?: string;
  firmwareId: string;
  deviceIds: string[];
  rolloutStrategy: 'immediate' | 'scheduled' | 'staged';
  scheduledAt?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  progress: {
    total: number;
    completed: number;
    failed: number;
    pending: number;
  };
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface OtaRolloutCreateRequest {
  name: string;
  description?: string;
  firmwareId: string;
  deviceIds: string[];
  rolloutStrategy: 'immediate' | 'scheduled' | 'staged';
  scheduledAt?: string;
}

export interface OtaRolloutListResponse extends ApiResponse<OtaRollout[]> {
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

// 用户管理接口
export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  tenantId: string;
  isActive: boolean;
  profile?: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
    phone?: string;
  };
  permissions: string[];
  featureFlags: Record<string, boolean>;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface UserCreateRequest {
  username: string;
  email: string;
  password: string;
  role: string;
  tenantId: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
}

export interface UserUpdateRequest {
  username?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
  profile?: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
    phone?: string;
  };
}

export interface UserListResponse extends ApiResponse<User[]> {
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}

// 租户管理接口
export interface Tenant {
  id: string;
  name: string;
  description?: string;
  domain?: string;
  isActive: boolean;
  settings: {
    timezone: string;
    language: string;
    dateFormat: string;
    timeFormat: '12h' | '24h';
  };
  theme: {
    mode: 'light' | 'dark' | 'auto';
    primaryColor: string;
    brand: {
      logo: string;
      name: string;
      favicon: string;
    };
  };
  featureFlags: Record<string, boolean>;
  createdAt: string;
  updatedAt: string;
}

export interface TenantCreateRequest {
  name: string;
  description?: string;
  domain?: string;
  settings: {
    timezone: string;
    language: string;
    dateFormat: string;
    timeFormat: '12h' | '24h';
  };
  theme: {
    mode: 'light' | 'dark' | 'auto';
    primaryColor: string;
    brand: {
      logo: string;
      name: string;
      favicon: string;
    };
  };
  featureFlags: Record<string, boolean>;
}

export interface TenantUpdateRequest {
  name?: string;
  description?: string;
  domain?: string;
  isActive?: boolean;
  settings?: Partial<Tenant['settings']>;
  theme?: Partial<Tenant['theme']>;
  featureFlags?: Record<string, boolean>;
}

// 系统统计接口
export interface SystemStats {
  devices: {
    total: number;
    online: number;
    offline: number;
    error: number;
  };
  alerts: {
    active: number;
    acknowledged: number;
    resolved: number;
  };
  ota: {
    pending: number;
    inProgress: number;
    completed: number;
    failed: number;
  };
  users: {
    total: number;
    active: number;
    inactive: number;
  };
  tenants: {
    total: number;
    active: number;
    inactive: number;
  };
}

// 实时事件接口
export interface RealtimeEvent {
  id: string;
  type: 'device_status' | 'telemetry' | 'alert' | 'ota_progress' | 'user_action';
  deviceId?: string;
  tenantId: string;
  data: Record<string, any>;
  timestamp: string;
}

// WebSocket消息接口
export interface WebSocketMessage {
  type: 'telemetry' | 'alert' | 'device_status' | 'ota_progress' | 'system_event';
  payload: any;
  timestamp: string;
  tenantId?: string;
  deviceId?: string;
}

// MQTT消息接口
export interface MqttMessage {
  topic: string;
  payload: Buffer | string;
  qos: 0 | 1 | 2;
  retain: boolean;
  timestamp: string;
}

// 文件上传接口
export interface FileUpload {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface FileUploadResponse extends ApiResponse<FileUpload> {}

// 日志接口
export interface LogEntry {
  id: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: Record<string, any>;
  userId?: string;
  tenantId?: string;
  deviceId?: string;
  timestamp: string;
}

export interface LogQuery extends QueryParams {
  level?: string[];
  startTime?: string;
  endTime?: string;
  userId?: string;
  tenantId?: string;
  deviceId?: string;
}

export interface LogListResponse extends ApiResponse<LogEntry[]> {
  meta: {
    total: number;
    page: number;
    limit: number;
  };
}
