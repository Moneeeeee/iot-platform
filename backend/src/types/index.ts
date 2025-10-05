/**
 * 核心类型定义文件
 * 定义整个IoT平台的基础数据类型和接口
 */

// ==================== 用户相关类型 ====================

/**
 * 用户角色枚举
 */
export enum UserRole {
  ADMIN = 'admin',           // 管理员
  OPERATOR = 'operator',     // 操作员
  VIEWER = 'viewer'         // 查看者
}

/**
 * 用户权限枚举
 */
export enum Permission {
  // 用户管理权限
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  
  // 设备管理权限
  DEVICE_CREATE = 'device:create',
  DEVICE_READ = 'device:read',
  DEVICE_UPDATE = 'device:update',
  DEVICE_DELETE = 'device:delete',
  DEVICE_CONTROL = 'device:control',
  
  // 系统管理权限
  SYSTEM_CONFIG = 'system:config',
  SYSTEM_LOGS = 'system:logs',
  SYSTEM_MONITOR = 'system:monitor'
}

/**
 * 用户接口
 */
export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  permissions: Permission[];
  language: Language;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 用户创建请求
 */
export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  language?: Language;
}

/**
 * 用户更新请求
 */
export interface UpdateUserRequest {
  username?: string;
  email?: string;
  role?: UserRole;
  language?: Language;
  isActive?: boolean;
}

/**
 * 登录请求
 */
export interface LoginRequest {
  username: string;
  password: string;
}

/**
 * 登录响应
 */
export interface LoginResponse {
  user: Omit<User, 'passwordHash'>;
  token: string;
  expiresIn: number;
}

// ==================== 设备相关类型 ====================

/**
 * 设备状态枚举
 */
export enum DeviceStatus {
  ONLINE = 'online',         // 在线
  OFFLINE = 'offline',       // 离线
  ERROR = 'error',          // 错误
  MAINTENANCE = 'maintenance' // 维护中
}

/**
 * 设备类型枚举
 */
export enum DeviceType {
  SMART_SENSOR = 'smart-sensor',       // 智能传感器
  SMART_GATEWAY = 'smart-gateway',     // 智能网关
  SMART_CONTROLLER = 'smart-controller' // 智能控制器
}

/**
 * 协议类型枚举
 */
export enum ProtocolType {
  MQTT = 'mqtt',
  TCP = 'tcp',
  UDP = 'udp',
  HTTP = 'http',
  HTTPS = 'https',
  WEBSOCKET = 'websocket'
}

/**
 * 协议配置接口
 */
export interface ProtocolConfig {
  type: ProtocolType;
  enabled: boolean;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  topics?: Record<string, string>;
  timeout?: number;
  retryAttempts?: number;
  ssl?: boolean;
  [key: string]: any;
}

/**
 * 设备配置接口
 */
export interface DeviceConfig {
  protocols: ProtocolConfig[];
  dashboard: DashboardConfig;
  manager: ManagerConfig;
  api: ApiConfig;
  alerts: AlertConfig[];
}

/**
 * 仪表板配置
 */
export interface DashboardConfig {
  widgets: WidgetConfig[];
  refreshInterval: number;
  maxDataPoints: number;
}

/**
 * 管理界面配置
 */
export interface ManagerConfig {
  tabs: TabConfig[];
  permissions: Permission[];
}

/**
 * API配置
 */
export interface ApiConfig {
  endpoints: EndpointConfig[];
  rateLimit: number;
  authentication: boolean;
}

/**
 * 告警配置
 */
export interface AlertConfig {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  enabled: boolean;
  notifications: NotificationConfig[];
}

/**
 * 通知配置
 */
export interface NotificationConfig {
  type: 'email' | 'webhook' | 'sms';
  target: string;
  template?: string;
}

/**
 * 组件配置
 */
export interface WidgetConfig {
  id: string;
  type: 'chart' | 'gauge' | 'table' | 'status';
  title: string;
  dataSource: string;
  position: { x: number; y: number; w: number; h: number };
  config: Record<string, any>;
}

/**
 * 标签页配置
 */
export interface TabConfig {
  id: string;
  title: string;
  component: string;
  permissions?: Permission[];
}

/**
 * 端点配置
 */
export interface EndpointConfig {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  description: string;
  parameters?: ParameterConfig[];
  response?: ResponseConfig;
}

/**
 * 参数配置
 */
export interface ParameterConfig {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object';
  required: boolean;
  description: string;
  defaultValue?: any;
}

/**
 * 响应配置
 */
export interface ResponseConfig {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  example?: any;
}

/**
 * 设备接口
 */
export interface Device {
  id: string;
  slug: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  config: DeviceConfig;
  capabilities: string[];
  lastSeenAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 设备创建请求
 */
export interface CreateDeviceRequest {
  slug: string;
  name: string;
  type: DeviceType;
  config: DeviceConfig;
  capabilities: string[];
}

/**
 * 设备更新请求
 */
export interface UpdateDeviceRequest {
  name?: string;
  config?: Partial<DeviceConfig>;
  capabilities?: string[];
}

// ==================== 数据相关类型 ====================

/**
 * 设备数据接口
 */
export interface DeviceData {
  id: string;
  deviceId: string;
  data: Record<string, any>;
  timestamp: Date;
  protocol: ProtocolType;
  source: string;
}

/**
 * 数据查询参数
 */
export interface DataQueryParams {
  deviceId: string;
  startTime?: Date;
  endTime?: Date;
  limit?: number;
  offset?: number;
  fields?: string[];
}

// ==================== 告警相关类型 ====================

/**
 * 告警级别枚举
 */
export enum AlertLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

/**
 * 告警状态枚举
 */
export enum AlertStatus {
  ACTIVE = 'active',
  RESOLVED = 'resolved',
  SUPPRESSED = 'suppressed'
}

/**
 * 告警接口
 */
export interface Alert {
  id: string;
  deviceId: string;
  level: AlertLevel;
  status: AlertStatus;
  title: string;
  message: string;
  data: Record<string, any>;
  triggeredAt: Date;
  resolvedAt?: Date;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

// ==================== 系统相关类型 ====================

/**
 * 语言枚举
 */
export enum Language {
  ZH_CN = 'zh-CN',
  ZH_TW = 'zh-TW',
  EN = 'en'
}

/**
 * 系统配置接口
 */
export interface SystemConfig {
  general: GeneralConfig;
  mqtt: MQTTConfig;
  udp: UDPConfig;
  alerts: SystemAlertConfig;
  security: SecurityConfig;
}

/**
 * 通用配置
 */
export interface GeneralConfig {
  siteName: string;
  siteDescription: string;
  defaultLanguage: Language;
  timezone: string;
  maintenanceMode: boolean;
}

/**
 * MQTT配置
 */
export interface MQTTConfig {
  brokerUrl: string;
  username?: string;
  password?: string;
  clientId: string;
  keepAlive: number;
  reconnectPeriod: number;
  connectTimeout: number;
}

/**
 * UDP配置
 */
export interface UDPConfig {
  port: number;
  host: string;
  timeout: number;
  maxPacketSize: number;
}

/**
 * 系统告警配置
 */
export interface SystemAlertConfig {
  emailNotifications: boolean;
  webhookUrl?: string;
  smsEnabled: boolean;
  alertRetentionDays: number;
}

/**
 * 安全配置
 */
export interface SecurityConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  passwordMinLength: number;
  maxLoginAttempts: number;
  lockoutDuration: number;
  requireEmailVerification: boolean;
}

// ==================== API响应类型 ====================

/**
 * 标准API响应接口
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: Date;
}

/**
 * 分页响应接口
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ==================== 请求类型 ====================

/**
 * 分页查询参数
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 搜索参数
 */
export interface SearchParams extends PaginationParams {
  search?: string;
  filters?: Record<string, any>;
}

// ==================== WebSocket消息类型 ====================

/**
 * WebSocket消息类型枚举
 */
export enum WSMessageType {
  DEVICE_DATA = 'device:data',
  DEVICE_STATUS = 'device:status',
  ALERT = 'alert',
  SYSTEM_STATUS = 'system:status',
  HEARTBEAT = 'heartbeat'
}

/**
 * WebSocket消息接口
 */
export interface WSMessage {
  type: WSMessageType;
  data: any;
  timestamp: Date;
  deviceId?: string;
}

// ==================== 日志类型 ====================

/**
 * 日志级别枚举
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

/**
 * 日志接口
 */
export interface Log {
  id: string;
  level: LogLevel;
  message: string;
  data?: Record<string, any>;
  userId?: string;
  deviceId?: string;
  timestamp: Date;
}

// ==================== 导出所有类型 ====================
export * from './auth';
export * from './device';
export * from './protocol';
