/**
 * 插件系统契约类型定义
 */

// 插件类型枚举
export type PluginKind = 'home' | 'product' | 'tenant' | 'device' | 'feature' | 'integration';

// 插件元数据接口
export interface PluginManifest {
  id: string;
  kind: PluginKind;
  version: string;
  name: string;
  description: string;
  routes?: string[];
  features?: string[];
  devices?: string[];
  requires?: {
    designSystem?: string;
    api?: string;
    plugins?: string[];
  };
  supports?: {
    tenants?: string[];
    products?: string[];
    devices?: string[];
    features?: string[];
  };
  lifecycle?: {
    install?: () => Promise<void>;
    uninstall?: () => Promise<void>;
    upgrade?: (fromVersion: string, toVersion: string) => Promise<void>;
  };
}

// 插件导出契约
export interface PluginExports {
  routes?: PluginRoute[];
  menus?: PluginMenu[];
  widgets?: PluginWidget[];
  reducers?: string[];
  lifecycles?: string[];
  api?: {
    endpoints?: string[];
    middleware?: string[];
  };
  hooks?: {
    name: string;
    hook: Function;
  }[];
}

// 插件路由定义
export interface PluginRoute {
  name: string;
  pathRef: string;
  layoutRegion?: 'main' | 'sidebar' | 'modal';
  prefetch?: 'auto' | 'hover' | 'none';
  guards?: {
    rolesAnyOf?: string[];
    featureFlagsAllOf?: string[];
  };
  metadata?: {
    title?: string;
    description?: string;
    icon?: string;
  };
}

// 插件菜单定义
export interface PluginMenu {
  id: string;
  labelKey: string;
  to: string;
  icon?: string;
  visibleIf?: {
    rolesAnyOf?: string[];
    featureFlagsAnyOf?: string[];
  };
  children?: PluginMenu[];
}

// 插件组件定义
export interface PluginWidget {
  id: string;
  slot: string;
  propsSchemaRef?: string;
  component: React.ComponentType<any>;
}

// 租户配置接口
export interface TenantConfig {
  id: string;
  name: string;
  description: string;
  theme: TenantTheme;
  enabledPlugins: string[];
  featureFlags: Record<string, boolean>;
  permissions: TenantPermissions;
  settings: TenantSettings;
}

// 租户主题配置
export interface TenantTheme {
  mode: 'light' | 'dark' | 'auto';
  primaryColor: string;
  brand: {
    logo: string;
    name: string;
    favicon: string;
  };
  custom?: Record<string, any>;
}

// 租户权限配置
export interface TenantPermissions {
  roles: string[];
  defaultRole: string;
  policies?: Record<string, any>;
}

// 租户设置
export interface TenantSettings {
  timezone: string;
  language: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  custom?: Record<string, any>;
}

// 路由映射配置
export interface RouteMapping {
  [routeName: string]: string;
}

// 用户认证信息
export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  tenantId: string;
  permissions: string[];
  featureFlags: Record<string, boolean>;
  profile?: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
}

// 认证上下文
export interface AuthContext {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

// 登录凭据
export interface LoginCredentials {
  username: string;
  password: string;
  rememberMe?: boolean;
}

// 租户上下文
export interface TenantContext {
  currentTenant: TenantConfig | null;
  availablePlugins: PluginManifest[];
  isLoading: boolean;
  switchTenant: (tenantId: string) => Promise<void>;
  reloadPlugins: () => Promise<void>;
}

// 插件上下文
export interface PluginContext {
  loadedPlugins: Map<string, PluginManifest>;
  pluginRoutes: Map<string, PluginRoute[]>;
  pluginMenus: Map<string, PluginMenu[]>;
  pluginWidgets: Map<string, PluginWidget[]>;
  loadPlugin: (pluginId: string) => Promise<void>;
  unloadPlugin: (pluginId: string) => Promise<void>;
  getPluginRoutes: (tenantId: string) => PluginRoute[];
  getPluginMenus: (tenantId: string) => PluginMenu[];
}

// 数据层接口
export interface DataClient {
  rest: RestClient;
  websocket: WebSocketClient;
  mqtt?: MqttClient;
}

export interface RestClient {
  get: <T>(url: string, options?: RequestOptions) => Promise<T>;
  post: <T>(url: string, data?: any, options?: RequestOptions) => Promise<T>;
  put: <T>(url: string, data?: any, options?: RequestOptions) => Promise<T>;
  delete: <T>(url: string, options?: RequestOptions) => Promise<T>;
}

export interface WebSocketClient {
  connect: (url: string) => Promise<void>;
  disconnect: () => void;
  subscribe: (topic: string, callback: (data: any) => void) => void;
  unsubscribe: (topic: string) => void;
  send: (topic: string, data: any) => void;
}

export interface MqttClient {
  connect: (brokerUrl: string, options?: MqttOptions) => Promise<void>;
  disconnect: () => void;
  subscribe: (topic: string, callback: (data: any) => void) => void;
  unsubscribe: (topic: string) => void;
  publish: (topic: string, data: any) => void;
}

export interface RequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

export interface MqttOptions {
  username?: string;
  password?: string;
  clientId?: string;
  clean?: boolean;
}

// 主题系统接口
export interface ThemeContext {
  theme: TenantTheme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Partial<TenantTheme>) => void;
  getThemeToken: (token: string) => string;
}

// 国际化接口
export interface I18nContext {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string, options?: any) => string;
  availableLanguages: string[];
}

// 错误边界接口
export interface ErrorInfo {
  componentStack: string;
  errorBoundary?: string;
  errorBoundaryStack?: string;
}

// 性能监控接口
export interface TelemetryContext {
  track: (event: string, properties?: Record<string, any>) => void;
  measure: (name: string, startTime: number) => void;
  reportError: (error: Error, context?: Record<string, any>) => void;
}

// 通用API响应接口
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

// 分页参数
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

// 查询参数
export interface QueryParams extends PaginationParams {
  search?: string;
  filters?: Record<string, any>;
}
