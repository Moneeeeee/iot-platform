/**
 * 路由系统类型定义
 */

import { PluginRoute, PluginMenu } from '@/types/contracts';
import { ReactNode } from 'react';

// 路由配置
export interface RouteConfig {
  path: string;
  component: string;
  layout?: string;
  permissions?: string[];
  metadata?: {
    title?: string;
    description?: string;
    icon?: string;
  };
  guards?: RouteGuard[];
  prefetch?: 'auto' | 'hover' | 'none';
}

// 路由守卫
export interface RouteGuard {
  type: 'auth' | 'permission' | 'feature' | 'tenant' | 'custom';
  config: any;
  fallback?: string;
}

// 动态路由参数
export interface DynamicRouteParams {
  tenant?: string;
  plugin?: string[];
  [key: string]: string | string[] | undefined;
}

// 路由匹配结果
export interface RouteMatch {
  route: RouteConfig;
  params: DynamicRouteParams;
  query: Record<string, string>;
  isExact: boolean;
}

// 路由注册器配置
export interface RouteRegistryConfig {
  basePath: string;
  defaultLayout: string;
  fallbackComponent: string;
  errorComponent: string;
  loadingComponent: string;
}

// 插件路由注册
export interface PluginRouteRegistration {
  pluginId: string;
  routes: PluginRoute[];
  menus: PluginMenu[];
  priority: number;
  enabled: boolean;
}

// 路由守卫配置
export interface RouteGuardConfig {
  type: 'auth' | 'permission' | 'feature' | 'tenant' | 'custom';
  requiredPermissions?: string[];
  requiredFeatures?: string[];
  requiredRoles?: string[];
  allowedTenants?: string[];
  customGuard?: (context: GuardContext) => Promise<boolean>;
  fallback?: string;
  redirectTo?: string;
}

// 守卫上下文
export interface GuardContext {
  user: any;
  tenant: any;
  route: RouteConfig;
  params: DynamicRouteParams;
  query: Record<string, string>;
}

// 路由生成器配置
export interface RouteGeneratorConfig {
  tenantParam: string;
  pluginParam: string;
  routeMapping: Record<string, string>;
}

// 菜单生成器配置
export interface MenuGeneratorConfig {
  maxDepth: number;
  collapseThreshold: number;
  showIcons: boolean;
  groupBy: 'plugin' | 'category' | 'none';
}

// 路由历史记录
export interface RouteHistory {
  path: string;
  timestamp: number;
  params: DynamicRouteParams;
  query: Record<string, string>;
}

// 路由导航配置
export interface NavigationConfig {
  historyLimit: number;
  enableBackButton: boolean;
  enableBreadcrumb: boolean;
  enableSearch: boolean;
}

// 面包屑配置
export interface BreadcrumbConfig {
  showHome: boolean;
  showCurrent: boolean;
  maxItems: number;
  separator: string;
}

// 路由状态
export interface RouteState {
  currentRoute: RouteMatch | null;
  history: RouteHistory[];
  isLoading: boolean;
  error: string | null;
}

// 路由动作
export type RouteAction =
  | { type: 'ROUTE_START'; payload: { path: string; params: DynamicRouteParams; query: Record<string, string> } }
  | { type: 'ROUTE_SUCCESS'; payload: RouteMatch }
  | { type: 'ROUTE_ERROR'; payload: string }
  | { type: 'ROUTE_CLEAR_ERROR' }
  | { type: 'ROUTE_ADD_HISTORY'; payload: RouteHistory }
  | { type: 'ROUTE_CLEAR_HISTORY' };

// 路由Hook返回值
export interface UseRouteReturn {
  currentRoute: RouteMatch | null;
  history: RouteHistory[];
  isLoading: boolean;
  error: string | null;
  navigate: (path: string, options?: NavigationOptions) => Promise<void>;
  goBack: () => void;
  goForward: () => void;
  canGoBack: boolean;
  canGoForward: boolean;
  clearError: () => void;
}

// 导航选项
export interface NavigationOptions {
  replace?: boolean;
  state?: any;
  scroll?: boolean;
}

// 路由Provider Props
export interface RouteProviderProps {
  children: ReactNode;
  config?: Partial<RouteRegistryConfig>;
  guards?: RouteGuardConfig[];
}

// 路由Hook配置
export interface UseRouteConfig {
  enableHistory?: boolean;
  enablePrefetch?: boolean;
  prefetchDelay?: number;
  onRouteChange?: (route: RouteMatch) => void;
  onRouteError?: (error: string) => void;
}

// 动态路由生成器
export interface DynamicRouteGenerator {
  generateRoute: (routeName: string, params: DynamicRouteParams) => string;
  parseRoute: (path: string) => { routeName: string; params: DynamicRouteParams };
  validateRoute: (path: string) => boolean;
}

// 路由缓存配置
export interface RouteCacheConfig {
  enabled: boolean;
  maxSize: number;
  ttl: number;
  exclude: string[];
}

// 路由预加载配置
export interface RoutePrefetchConfig {
  enabled: boolean;
  strategy: 'hover' | 'visible' | 'idle';
  delay: number;
  priority: 'high' | 'low';
}

// 路由分析配置
export interface RouteAnalyticsConfig {
  enabled: boolean;
  trackPageViews: boolean;
  trackRouteChanges: boolean;
  trackRouteErrors: boolean;
  customEvents: string[];
}
