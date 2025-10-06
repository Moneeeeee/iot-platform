/**
 * 插件系统类型定义
 */

import { PluginManifest, PluginExports, PluginRoute, PluginMenu, PluginWidget } from '@/types/contracts';

// 插件状态
export type PluginStatus = 'loading' | 'loaded' | 'error' | 'unloaded';

// 插件实例
export interface PluginInstance {
  manifest: PluginManifest;
  exports: PluginExports;
  status: PluginStatus;
  error?: Error;
  loadedAt?: Date;
  dependencies: string[];
  dependents: string[];
}

// 插件加载器配置
export interface PluginLoaderConfig {
  basePath: string;
  manifestPath: string;
  enableHotReload: boolean;
  enableLazyLoading: boolean;
  enableDependencyResolution: boolean;
  maxConcurrentLoads: number;
  timeout: number;
}

// 插件注册器配置
export interface PluginRegistryConfig {
  enableValidation: boolean;
  enableVersionCheck: boolean;
  enableDependencyCheck: boolean;
  allowOverrides: boolean;
  strictMode: boolean;
}

// 插件生命周期钩子
export interface PluginLifecycle {
  install?: () => Promise<void>;
  activate?: () => Promise<void>;
  deactivate?: () => Promise<void>;
  uninstall?: () => Promise<void>;
  upgrade?: (fromVersion: string, toVersion: string) => Promise<void>;
  onConfigUpdate?: (config: any) => Promise<void>;
  onTenantChange?: (tenantId: string) => Promise<void>;
  onUserChange?: (userId: string) => Promise<void>;
}

// 插件上下文
export interface PluginContext {
  pluginId: string;
  tenantId: string;
  userId: string;
  config: any;
  api: PluginAPI;
  events: PluginEventBus;
  storage: PluginStorage;
  i18n: PluginI18n;
}

// 插件API接口
export interface PluginAPI {
  rest: {
    get: <T>(url: string, options?: any) => Promise<T>;
    post: <T>(url: string, data?: any, options?: any) => Promise<T>;
    put: <T>(url: string, data?: any, options?: any) => Promise<T>;
    delete: <T>(url: string, options?: any) => Promise<T>;
  };
  websocket: {
    subscribe: (topic: string, callback: (data: any) => void) => void;
    unsubscribe: (topic: string) => void;
    send: (topic: string, data: any) => void;
  };
  mqtt?: {
    subscribe: (topic: string, callback: (data: any) => void) => void;
    unsubscribe: (topic: string) => void;
    publish: (topic: string, data: any) => void;
  };
  query: {
    get: <T>(key: string, fetcher: () => Promise<T>, options?: any) => Promise<T>;
    set: <T>(key: string, data: T, options?: any) => void;
    invalidate: (key: string) => void;
  };
}

// 插件事件总线
export interface PluginEventBus {
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: (data?: any) => void) => void;
  off: (event: string, callback: (data?: any) => void) => void;
  once: (event: string, callback: (data?: any) => void) => void;
}

// 插件存储接口
export interface PluginStorage {
  get: <T>(key: string) => T | null;
  set: <T>(key: string, value: T) => void;
  remove: (key: string) => void;
  clear: () => void;
  keys: () => string[];
  has: (key: string) => boolean;
}

// 插件国际化接口
export interface PluginI18n {
  t: (key: string, options?: any) => string;
  setLanguage: (language: string) => void;
  getLanguage: () => string;
  addTranslations: (language: string, translations: Record<string, string>) => void;
}

// 插件依赖解析器
export interface PluginDependencyResolver {
  resolve: (pluginId: string, dependencies: string[]) => Promise<string[]>;
  validate: (pluginId: string, dependencies: string[]) => Promise<boolean>;
  getDependencyTree: (pluginId: string) => Promise<DependencyTree>;
}

// 依赖树
export interface DependencyTree {
  pluginId: string;
  dependencies: DependencyTree[];
  depth: number;
  circular: boolean;
}

// 插件验证器
export interface PluginValidator {
  validateManifest: (manifest: PluginManifest) => ValidationResult;
  validateExports: (exports: PluginExports) => ValidationResult;
  validateDependencies: (dependencies: string[]) => ValidationResult;
  validateVersion: (version: string) => boolean;
}

// 验证结果
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

// 验证错误
export interface ValidationError {
  code: string;
  message: string;
  field?: string;
  value?: any;
}

// 验证警告
export interface ValidationWarning {
  code: string;
  message: string;
  field?: string;
  value?: any;
}

// 插件加载器
export interface PluginLoader {
  load: (pluginId: string) => Promise<PluginInstance>;
  unload: (pluginId: string) => Promise<void>;
  reload: (pluginId: string) => Promise<PluginInstance>;
  isLoaded: (pluginId: string) => boolean;
  getLoadedPlugins: () => string[];
  getPluginInstance: (pluginId: string) => PluginInstance | null;
}

// 插件注册器
export interface PluginRegistry {
  register: (plugin: PluginManifest) => void;
  unregister: (pluginId: string) => void;
  getPlugin: (pluginId: string) => PluginManifest | null;
  getPlugins: (kind?: string) => PluginManifest[];
  getEnabledPlugins: (tenantId: string) => PluginManifest[];
  enablePlugin: (pluginId: string, tenantId: string) => void;
  disablePlugin: (pluginId: string, tenantId: string) => void;
  isEnabled: (pluginId: string, tenantId: string) => boolean;
}

// 插件管理器
export interface PluginManager {
  load: (pluginId: string) => Promise<PluginInstance>;
  unload: (pluginId: string) => Promise<void>;
  reload: (pluginId: string) => Promise<PluginInstance>;
  loadAll: (tenantId: string) => Promise<PluginInstance[]>;
  unloadAll: () => Promise<void>;
  getStatus: () => PluginManagerStatus;
  getPluginRoutes: (tenantId: string) => PluginRoute[];
  getPluginMenus: (tenantId: string) => PluginMenu[];
  getPluginWidgets: (tenantId: string) => PluginWidget[];
}

// 插件管理器状态
export interface PluginManagerStatus {
  totalPlugins: number;
  loadedPlugins: number;
  errorPlugins: number;
  loadingPlugins: number;
  plugins: PluginInstance[];
}

// 插件Hook返回值
export interface UsePluginReturn {
  plugin: PluginInstance | null;
  isLoading: boolean;
  error: Error | null;
  load: () => Promise<void>;
  unload: () => Promise<void>;
  reload: () => Promise<void>;
}

// 插件Provider Props
export interface PluginProviderProps {
  children: React.ReactNode;
  config?: Partial<PluginLoaderConfig>;
  registryConfig?: Partial<PluginRegistryConfig>;
}

// 插件Hook配置
export interface UsePluginConfig {
  autoLoad?: boolean;
  enableHotReload?: boolean;
  onLoad?: (plugin: PluginInstance) => void;
  onError?: (error: Error) => void;
}

// 插件事件
export interface PluginEvent {
  type: 'load' | 'unload' | 'error' | 'activate' | 'deactivate';
  pluginId: string;
  data?: any;
  timestamp: number;
}

// 插件监听器
export interface PluginListener {
  onLoad: (callback: (plugin: PluginInstance) => void) => void;
  onUnload: (callback: (pluginId: string) => void) => void;
  onError: (callback: (pluginId: string, error: Error) => void) => void;
  onActivate: (callback: (pluginId: string) => void) => void;
  onDeactivate: (callback: (pluginId: string) => void) => void;
  offLoad: (callback: (plugin: PluginInstance) => void) => void;
  offUnload: (callback: (pluginId: string) => void) => void;
  offError: (callback: (pluginId: string, error: Error) => void) => void;
  offActivate: (callback: (pluginId: string) => void) => void;
  offDeactivate: (callback: (pluginId: string) => void) => void;
}

// 插件配置
export interface PluginConfig {
  id: string;
  enabled: boolean;
  config: Record<string, any>;
  permissions: string[];
  featureFlags: Record<string, boolean>;
}

// 插件配置管理器
export interface PluginConfigManager {
  getConfig: (pluginId: string) => PluginConfig | null;
  setConfig: (pluginId: string, config: Partial<PluginConfig>) => void;
  updateConfig: (pluginId: string, updates: Record<string, any>) => void;
  resetConfig: (pluginId: string) => void;
  getAllConfigs: () => PluginConfig[];
}

// 插件热重载
export interface PluginHotReload {
  enable: (pluginId: string) => void;
  disable: (pluginId: string) => void;
  isEnabled: (pluginId: string) => boolean;
  reload: (pluginId: string) => Promise<void>;
  watch: (pluginId: string, callback: () => void) => void;
  unwatch: (pluginId: string) => void;
}
