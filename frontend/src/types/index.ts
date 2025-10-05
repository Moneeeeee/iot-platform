/**
 * 前端类型定义
 * 与后端API接口保持一致的类型定义
 */

// ==================== 用户相关类型 ====================

/**
 * 用户角色枚举
 */
export enum UserRole {
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
  VIEWER = 'VIEWER'
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
 * 语言枚举
 */
export enum Language {
  ZH_CN = 'zh-CN',
  ZH_TW = 'zh-TW',
  EN = 'en'
}

/**
 * 用户接口
 */
export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
  language: Language;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
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
  user: User;
  token: string;
  expiresIn: string;
}

// ==================== 设备相关类型 ====================

/**
 * 设备状态枚举
 */
export enum DeviceStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  ERROR = 'ERROR',
  MAINTENANCE = 'MAINTENANCE'
}

/**
 * 设备类型枚举
 */
export enum DeviceType {
  SMART_SENSOR = 'SMART_SENSOR',
  SMART_GATEWAY = 'SMART_GATEWAY',
  SMART_CONTROLLER = 'SMART_CONTROLLER'
}

/**
 * 协议类型枚举
 */
export enum ProtocolType {
  MQTT = 'MQTT',
  TCP = 'TCP',
  UDP = 'UDP',
  HTTP = 'HTTP',
  HTTPS = 'HTTPS',
  WEBSOCKET = 'WEBSOCKET'
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
  lastSeenAt?: string;
  createdAt: string;
  updatedAt: string;
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
  timestamp: string;
  protocol: ProtocolType;
  source: string;
}

/**
 * 数据查询参数
 */
export interface DataQueryParams {
  deviceId: string;
  startTime?: string;
  endTime?: string;
  limit?: number;
  offset?: number;
  fields?: string[];
}

// ==================== 告警相关类型 ====================

/**
 * 告警级别枚举
 */
export enum AlertLevel {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

/**
 * 告警状态枚举
 */
export enum AlertStatus {
  ACTIVE = 'ACTIVE',
  RESOLVED = 'RESOLVED',
  SUPPRESSED = 'SUPPRESSED'
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
  triggeredAt: string;
  resolvedAt?: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  device?: {
    name: string;
    slug: string;
  };
  user?: {
    username: string;
  };
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
  timestamp: string;
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
  timestamp: string;
  deviceId?: string;
}

// ==================== 系统相关类型 ====================

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

// ==================== 前端特定类型 ====================

/**
 * 主题类型
 */
export type Theme = 'light' | 'dark' | 'system';

/**
 * 侧边栏状态
 */
export type SidebarState = 'expanded' | 'collapsed';

/**
 * 表格列配置
 */
export interface TableColumn<T = any> {
  key: keyof T | string;
  title: string;
  dataIndex?: keyof T | string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, record: T, index: number) => React.ReactNode;
}

/**
 * 表单字段配置
 */
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea' | 'checkbox' | 'switch';
  required?: boolean;
  placeholder?: string;
  options?: Array<{ label: string; value: any }>;
  validation?: any;
}

/**
 * 图表数据类型
 */
export interface ChartData {
  name: string;
  value: number;
  timestamp?: string;
  [key: string]: any;
}

/**
 * 仪表板卡片数据
 */
export interface DashboardCard {
  id: string;
  title: string;
  value: number | string;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon?: string;
  color?: string;
}

/**
 * 导航菜单项
 */
export interface MenuItem {
  id: string;
  title: string;
  icon?: string;
  path?: string;
  children?: MenuItem[];
  permissions?: Permission[];
  badge?: string | number;
}

/**
 * 面包屑导航项
 */
export interface BreadcrumbItem {
  title: string;
  path?: string;
}

/**
 * 通知类型
 */
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  timestamp: string;
}

/**
 * 模态框配置
 */
export interface ModalConfig {
  title: string;
  content: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closable?: boolean;
  onClose?: () => void;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
}

// ==================== 导出所有类型 ====================
export * from './auth';
export * from './device';
export * from './common';
