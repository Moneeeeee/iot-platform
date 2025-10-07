/**
 * 前端配置管理器
 * 统一管理应用程序配置
 */

export interface FrontendConfig {
  api: {
    baseUrl: string;
    timeout: number;
  };
  app: {
    name: string;
    version: string;
    environment: string;
  };
  features: {
    darkMode: boolean;
    realTimeUpdates: boolean;
    deviceManagement: boolean;
    dataVisualization: boolean;
  };
  ui: {
    theme: string;
    language: string;
    pageSize: number;
  };
}

class ConfigManager {
  private config: FrontendConfig;
  private configPath: string;

  constructor() {
    this.configPath = '/config/config.json';
    this.config = this.loadConfig();
  }

  private loadConfig(): FrontendConfig {
    try {
      // 在浏览器环境中，配置文件通过Docker挂载
      if (typeof window !== 'undefined') {
        // 尝试从挂载的配置文件读取
        const configData = localStorage.getItem('app_config');
        if (configData) {
          return JSON.parse(configData);
        }
      }

      // 回退到环境变量
      return {
        api: {
          baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
          timeout: 10000
        },
        app: {
          name: 'IoT设备管理平台',
          version: '1.7.0',
          environment: process.env.NODE_ENV || 'development'
        },
        features: {
          darkMode: true,
          realTimeUpdates: true,
          deviceManagement: true,
          dataVisualization: true
        },
        ui: {
          theme: 'light',
          language: 'zh-CN',
          pageSize: 20
        }
      };
    } catch (error) {
      console.error('加载配置文件失败:', error);
      return this.getDefaultConfig();
    }
  }

  private getDefaultConfig(): FrontendConfig {
    return {
      api: {
        baseUrl: 'http://localhost:8000',
        timeout: 10000
      },
      app: {
        name: 'IoT设备管理平台',
        version: '1.7.0',
        environment: 'development'
      },
      features: {
        darkMode: true,
        realTimeUpdates: true,
        deviceManagement: true,
        dataVisualization: true
      },
      ui: {
        theme: 'light',
        language: 'zh-CN',
        pageSize: 20
      }
    };
  }

  public get<K extends keyof FrontendConfig>(key: K): FrontendConfig[K] {
    return this.config[key];
  }

  public getApiBaseUrl(): string {
    return this.config.api.baseUrl;
  }

  public getApiTimeout(): number {
    return this.config.api.timeout;
  }

  public getAppName(): string {
    return this.config.app.name;
  }

  public getAppVersion(): string {
    return this.config.app.version;
  }

  public getEnvironment(): string {
    return this.config.app.environment;
  }

  public isFeatureEnabled(feature: keyof FrontendConfig['features']): boolean {
    return this.config.features[feature];
  }

  public getTheme(): string {
    return this.config.ui.theme;
  }

  public getLanguage(): string {
    return this.config.ui.language;
  }

  public getPageSize(): number {
    return this.config.ui.pageSize;
  }

  public updateConfig(updates: Partial<FrontendConfig>): void {
    this.config = { ...this.config, ...updates };
    
    // 保存到localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('app_config', JSON.stringify(this.config));
    }
  }
}

// 导出单例实例
export const configManager = new ConfigManager();

// 导出默认配置
export const defaultConfig = configManager.getDefaultConfig();
