/**
 * 路由注册器
 */

import { 
  RouteConfig, 
  PluginRouteRegistration, 
  RouteRegistryConfig,
  RouteMatch,
  DynamicRouteParams,
  RouteGuardConfig,
  GuardContext
} from './types';
import { PluginRoute, PluginMenu } from '@/types/contracts';

// 默认配置
const defaultConfig: RouteRegistryConfig = {
  basePath: '',
  defaultLayout: 'default',
  fallbackComponent: 'NotFound',
  errorComponent: 'ErrorBoundary',
  loadingComponent: 'Loading',
};

export class RouteRegistry {
  private config: RouteRegistryConfig;
  private routes = new Map<string, RouteConfig>();
  private pluginRegistrations = new Map<string, PluginRouteRegistration>();
  private routeMapping = new Map<string, string>();
  private guards: RouteGuardConfig[] = [];

  constructor(config: Partial<RouteRegistryConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  // 注册路由映射
  registerRouteMapping(mapping: Record<string, string>): void {
    Object.entries(mapping).forEach(([name, path]) => {
      this.routeMapping.set(name, path);
    });
  }

  // 注册插件路由
  registerPlugin(registration: PluginRouteRegistration): void {
    this.pluginRegistrations.set(registration.pluginId, registration);
    
    if (registration.enabled) {
      this.registerPluginRoutes(registration);
    }
  }

  // 注册插件路由
  private registerPluginRoutes(registration: PluginRouteRegistration): void {
    registration.routes.forEach(route => {
      const routeConfig = this.convertPluginRouteToConfig(route);
      this.routes.set(route.name, routeConfig);
    });
  }

  // 转换插件路由为路由配置
  private convertPluginRouteToConfig(route: PluginRoute): RouteConfig {
    const path = this.routeMapping.get(route.pathRef) || route.pathRef;
    
    return {
      path,
      component: route.component,
      layout: route.layoutRegion || this.config.defaultLayout,
      permissions: route.guards?.rolesAnyOf,
      metadata: route.metadata,
      prefetch: route.prefetch || 'auto',
      guards: route.guards ? [{
        type: 'permission',
        config: route.guards,
      }] : [],
    };
  }

  // 启用插件
  enablePlugin(pluginId: string): void {
    const registration = this.pluginRegistrations.get(pluginId);
    if (registration) {
      registration.enabled = true;
      this.registerPluginRoutes(registration);
    }
  }

  // 禁用插件
  disablePlugin(pluginId: string): void {
    const registration = this.pluginRegistrations.get(pluginId);
    if (registration) {
      registration.enabled = false;
      // 移除插件路由
      registration.routes.forEach(route => {
        this.routes.delete(route.name);
      });
    }
  }

  // 获取路由配置
  getRoute(routeName: string): RouteConfig | undefined {
    return this.routes.get(routeName);
  }

  // 获取所有路由
  getAllRoutes(): RouteConfig[] {
    return Array.from(this.routes.values());
  }

  // 获取插件路由
  getPluginRoutes(pluginId: string): RouteConfig[] {
    const registration = this.pluginRegistrations.get(pluginId);
    if (!registration || !registration.enabled) {
      return [];
    }
    
    return registration.routes.map(route => 
      this.convertPluginRouteToConfig(route)
    );
  }

  // 获取租户路由
  getTenantRoutes(tenantId: string, enabledPlugins: string[]): RouteConfig[] {
    const tenantRoutes: RouteConfig[] = [];
    
    enabledPlugins.forEach(pluginId => {
      const pluginRoutes = this.getPluginRoutes(pluginId);
      tenantRoutes.push(...pluginRoutes);
    });
    
    return tenantRoutes;
  }

  // 匹配路由
  matchRoute(path: string): RouteMatch | null {
    // 简单的路径匹配，实际项目中可能需要更复杂的匹配逻辑
    for (const [routeName, route] of this.routes) {
      const match = this.matchPath(route.path, path);
      if (match) {
        return {
          route,
          params: match.params,
          query: match.query,
          isExact: match.isExact,
        };
      }
    }
    
    return null;
  }

  // 路径匹配
  private matchPath(routePath: string, actualPath: string): {
    params: DynamicRouteParams;
    query: Record<string, string>;
    isExact: boolean;
  } | null {
    // 解析查询参数
    const [path, queryString] = actualPath.split('?');
    const query: Record<string, string> = {};
    
    if (queryString) {
      queryString.split('&').forEach(param => {
        const [key, value] = param.split('=');
        if (key && value) {
          query[decodeURIComponent(key)] = decodeURIComponent(value);
        }
      });
    }

    // 简单的路径参数匹配
    const routeSegments = routePath.split('/');
    const pathSegments = path.split('/');
    
    if (routeSegments.length !== pathSegments.length) {
      return null;
    }

    const params: DynamicRouteParams = {};
    let isExact = true;

    for (let i = 0; i < routeSegments.length; i++) {
      const routeSegment = routeSegments[i];
      const pathSegment = pathSegments[i];

      if (routeSegment.startsWith(':')) {
        // 动态参数
        const paramName = routeSegment.slice(1);
        params[paramName] = pathSegment;
      } else if (routeSegment === '*') {
        // 通配符
        params['*'] = pathSegments.slice(i).join('/');
        isExact = false;
        break;
      } else if (routeSegment !== pathSegment) {
        // 静态段不匹配
        return null;
      }
    }

    return { params, query, isExact };
  }

  // 生成路由路径
  generatePath(routeName: string, params: DynamicRouteParams = {}): string {
    const route = this.routes.get(routeName);
    if (!route) {
      throw new Error(`Route ${routeName} not found`);
    }

    let path = route.path;
    
    // 替换路径参数
    Object.entries(params).forEach(([key, value]) => {
      if (typeof value === 'string') {
        path = path.replace(`:${key}`, value);
      }
    });

    return path;
  }

  // 注册路由守卫
  registerGuards(guards: RouteGuardConfig[]): void {
    this.guards.push(...guards);
  }

  // 检查路由守卫
  async checkGuards(context: GuardContext): Promise<boolean> {
    for (const guard of this.guards) {
      const result = await this.checkGuard(guard, context);
      if (!result) {
        return false;
      }
    }
    
    return true;
  }

  // 检查单个守卫
  private async checkGuard(guard: RouteGuardConfig, context: GuardContext): Promise<boolean> {
    switch (guard.type) {
      case 'auth':
        return context.user !== null;
      
      case 'permission':
        if (!context.user || !guard.requiredPermissions) return false;
        return guard.requiredPermissions.every(permission => 
          context.user.permissions?.includes(permission)
        );
      
      case 'feature':
        if (!context.tenant || !guard.requiredFeatures) return false;
        return guard.requiredFeatures.every(feature => 
          context.tenant.featureFlags?.[feature]
        );
      
      case 'tenant':
        if (!guard.allowedTenants) return true;
        return guard.allowedTenants.includes(context.tenant?.id);
      
      case 'custom':
        if (!guard.customGuard) return true;
        return await guard.customGuard(context);
      
      default:
        return true;
    }
  }

  // 获取插件菜单
  getPluginMenus(pluginId: string): PluginMenu[] {
    const registration = this.pluginRegistrations.get(pluginId);
    return registration?.menus || [];
  }

  // 获取租户菜单
  getTenantMenus(tenantId: string, enabledPlugins: string[]): PluginMenu[] {
    const tenantMenus: PluginMenu[] = [];
    
    enabledPlugins.forEach(pluginId => {
      const pluginMenus = this.getPluginMenus(pluginId);
      tenantMenus.push(...pluginMenus);
    });
    
    return tenantMenus;
  }

  // 清除所有路由
  clear(): void {
    this.routes.clear();
    this.pluginRegistrations.clear();
    this.routeMapping.clear();
    this.guards = [];
  }

  // 获取注册器状态
  getStatus(): {
    totalRoutes: number;
    enabledPlugins: number;
    totalPlugins: number;
    guards: number;
  } {
    const enabledPlugins = Array.from(this.pluginRegistrations.values())
      .filter(reg => reg.enabled).length;
    
    return {
      totalRoutes: this.routes.size,
      enabledPlugins,
      totalPlugins: this.pluginRegistrations.size,
      guards: this.guards.length,
    };
  }
}

// 创建全局路由注册器实例
export const routeRegistry = new RouteRegistry();
