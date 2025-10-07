/**
 * 依赖注入容器
 * 管理服务和插件的生命周期
 */

import { EventEmitter } from 'events';
import { logger } from '@/common/logger';

export interface ServiceDefinition {
  name: string;
  instance: any;
  dependencies: string[];
  singleton: boolean;
  initialized: boolean;
}

export interface ServiceFactory {
  (container: ServiceContainer): any;
}

export class ServiceContainer extends EventEmitter {
  private static instance: ServiceContainer;
  private services = new Map<string, ServiceDefinition>();
  private factories = new Map<string, ServiceFactory>();
  private initializationOrder: string[] = [];

  static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  /**
   * 注册服务工厂
   */
  register<T>(
    name: string,
    factory: ServiceFactory,
    dependencies: string[] = [],
    singleton: boolean = true
  ): void {
    this.factories.set(name, factory);
    
    // 如果服务已存在，更新依赖关系
    if (this.services.has(name)) {
      const service = this.services.get(name)!;
      service.dependencies = dependencies;
      service.singleton = singleton;
    } else {
      this.services.set(name, {
        name,
        instance: null,
        dependencies,
        singleton,
        initialized: false
      });
    }

    logger.debug('Service registered', { name, dependencies, singleton });
  }

  /**
   * 注册服务实例
   */
  registerInstance<T>(name: string, instance: T, dependencies: string[] = []): void {
    this.services.set(name, {
      name,
      instance,
      dependencies,
      singleton: true,
      initialized: true
    });

    logger.debug('Service instance registered', { name });
  }

  /**
   * 获取服务
   */
  get<T>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service not found: ${name}`);
    }

    // 如果服务已初始化，直接返回
    if (service.initialized && service.instance) {
      return service.instance;
    }

    // 检查依赖
    for (const dep of service.dependencies) {
      if (!this.services.has(dep)) {
        throw new Error(`Dependency not found: ${dep} for service ${name}`);
      }
    }

    // 创建服务实例
    const factory = this.factories.get(name);
    if (!factory) {
      throw new Error(`Factory not found for service: ${name}`);
    }

    try {
      service.instance = factory(this);
      service.initialized = true;

      logger.debug('Service instantiated', { name });
      return service.instance;
    } catch (error) {
      logger.error('Failed to instantiate service', { name, error });
      throw error;
    }
  }

  /**
   * 检查服务是否存在
   */
  has(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * 获取所有服务名称
   */
  getServiceNames(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * 初始化所有服务
   */
  async initializeAll(): Promise<void> {
    try {
      // 计算初始化顺序（拓扑排序）
      this.calculateInitializationOrder();

      // 按顺序初始化服务
      for (const serviceName of this.initializationOrder) {
        await this.initializeService(serviceName);
      }

      logger.info('All services initialized', {
        count: this.initializationOrder.length
      });

      this.emit('allServicesInitialized');
    } catch (error) {
      logger.error('Failed to initialize services', error);
      throw error;
    }
  }

  /**
   * 初始化单个服务
   */
  private async initializeService(name: string): Promise<void> {
    const service = this.services.get(name);
    if (!service || service.initialized) {
      return;
    }

    // 确保依赖已初始化
    for (const dep of service.dependencies) {
      await this.initializeService(dep);
    }

    // 获取服务实例（这会触发创建）
    const instance = this.get(name);

    // 如果服务有初始化方法，调用它
    if (typeof instance.initialize === 'function') {
      await instance.initialize();
    }

    logger.debug('Service initialized', { name });
    this.emit('serviceInitialized', { name, instance });
  }

  /**
   * 计算初始化顺序（拓扑排序）
   */
  private calculateInitializationOrder(): void {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const order: string[] = [];

    const visit = (name: string) => {
      if (visiting.has(name)) {
        throw new Error(`Circular dependency detected: ${name}`);
      }
      
      if (visited.has(name)) {
        return;
      }

      visiting.add(name);
      
      const service = this.services.get(name);
      if (service) {
        for (const dep of service.dependencies) {
          visit(dep);
        }
      }

      visiting.delete(name);
      visited.add(name);
      order.push(name);
    };

    for (const name of this.services.keys()) {
      visit(name);
    }

    this.initializationOrder = order;
  }

  /**
   * 关闭所有服务
   */
  async shutdownAll(): Promise<void> {
    try {
      // 逆序关闭服务
      const shutdownOrder = [...this.initializationOrder].reverse();

      for (const serviceName of shutdownOrder) {
        await this.shutdownService(serviceName);
      }

      logger.info('All services shutdown');
      this.emit('allServicesShutdown');
    } catch (error) {
      logger.error('Failed to shutdown services', error);
      throw error;
    }
  }

  /**
   * 关闭单个服务
   */
  private async shutdownService(name: string): Promise<void> {
    const service = this.services.get(name);
    if (!service || !service.initialized) {
      return;
    }

    try {
      const instance = service.instance;
      
      // 如果服务有关闭方法，调用它
      if (instance && typeof instance.shutdown === 'function') {
        await instance.shutdown();
      }

      service.initialized = false;
      if (!service.singleton) {
        service.instance = null;
      }

      logger.debug('Service shutdown', { name });
      this.emit('serviceShutdown', { name });
    } catch (error) {
      logger.error('Failed to shutdown service', { name, error });
    }
  }

  /**
   * 获取容器统计信息
   */
  getStats(): {
    totalServices: number;
    initializedServices: number;
    initializationOrder: string[];
  } {
    let initializedCount = 0;
    for (const service of this.services.values()) {
      if (service.initialized) {
        initializedCount++;
      }
    }

    return {
      totalServices: this.services.size,
      initializedServices: initializedCount,
      initializationOrder: this.initializationOrder
    };
  }

  /**
   * 清除所有服务
   */
  clear(): void {
    this.services.clear();
    this.factories.clear();
    this.initializationOrder = [];
    logger.info('Service container cleared');
  }
}

export const serviceContainer = ServiceContainer.getInstance();
