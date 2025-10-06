/**
 * 数据层类型定义
 */

import { ApiResponse, QueryParams } from '@/types/contracts';

// 数据客户端配置
export interface DataClientConfig {
  apiBaseUrl: string;
  wsUrl: string;
  mqttUrl?: string;
  timeout: number;
  retries: number;
  retryDelay: number;
  retryBackoff: boolean;
}

// 请求配置
export interface RequestConfig {
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  retryBackoff?: boolean;
  cache?: CacheConfig;
}

// 缓存配置
export interface CacheConfig {
  enabled: boolean;
  ttl: number; // 生存时间（毫秒）
  maxSize: number;
  strategy: 'memory' | 'localStorage' | 'sessionStorage';
}

// WebSocket配置
export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
  heartbeatTimeout: number;
}

// MQTT配置
export interface MqttConfig {
  brokerUrl: string;
  clientId: string;
  username?: string;
  password?: string;
  clean: boolean;
  keepalive: number;
  reconnectPeriod: number;
  connectTimeout: number;
}

// 数据适配器接口
export interface DataAdapter<T = any> {
  get: (url: string, config?: RequestConfig) => Promise<ApiResponse<T>>;
  post: (url: string, data?: any, config?: RequestConfig) => Promise<ApiResponse<T>>;
  put: (url: string, data?: any, config?: RequestConfig) => Promise<ApiResponse<T>>;
  delete: (url: string, config?: RequestConfig) => Promise<ApiResponse<T>>;
  patch: (url: string, data?: any, config?: RequestConfig) => Promise<ApiResponse<T>>;
}

// WebSocket适配器接口
export interface WebSocketAdapter {
  connect: (config: WebSocketConfig) => Promise<void>;
  disconnect: () => void;
  subscribe: (topic: string, callback: (data: any) => void) => void;
  unsubscribe: (topic: string) => void;
  send: (topic: string, data: any) => void;
  isConnected: () => boolean;
  onConnect: (callback: () => void) => void;
  onDisconnect: (callback: () => void) => void;
  onError: (callback: (error: Error) => void) => void;
}

// MQTT适配器接口
export interface MqttAdapter {
  connect: (config: MqttConfig) => Promise<void>;
  disconnect: () => void;
  subscribe: (topic: string, callback: (data: any) => void) => void;
  unsubscribe: (topic: string) => void;
  publish: (topic: string, data: any) => void;
  isConnected: () => boolean;
  onConnect: (callback: () => void) => void;
  onDisconnect: (callback: () => void) => void;
  onError: (callback: (error: Error) => void) => void;
}

// 查询客户端接口
export interface QueryClient {
  get: <T>(key: string, fetcher: () => Promise<T>, options?: QueryOptions) => Promise<T>;
  set: <T>(key: string, data: T, options?: QueryOptions) => void;
  invalidate: (key: string) => void;
  invalidateAll: () => void;
  clear: () => void;
}

// 查询选项
export interface QueryOptions {
  staleTime?: number;
  cacheTime?: number;
  retry?: boolean | number;
  retryDelay?: number;
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
  enabled?: boolean;
}

// 实时数据流接口
export interface RealtimeStream {
  subscribe: (topic: string, callback: (data: any) => void) => void;
  unsubscribe: (topic: string) => void;
  publish: (topic: string, data: any) => void;
  isConnected: () => boolean;
  reconnect: () => Promise<void>;
}

// 数据同步接口
export interface DataSync {
  sync: () => Promise<void>;
  isOnline: () => boolean;
  onOnline: (callback: () => void) => void;
  onOffline: (callback: () => void) => void;
  queue: (operation: SyncOperation) => void;
  flush: () => Promise<void>;
}

// 同步操作
export interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  resource: string;
  data: any;
  timestamp: number;
  retries: number;
}

// 数据层上下文
export interface DataContext {
  rest: DataAdapter;
  websocket: WebSocketAdapter;
  mqtt?: MqttAdapter;
  query: QueryClient;
  realtime: RealtimeStream;
  sync: DataSync;
}

// 数据层Hook返回值
export interface UseDataReturn {
  data: any;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  mutate: (data: any) => void;
  invalidate: () => void;
}

// 数据层Provider Props
export interface DataProviderProps {
  children: React.ReactNode;
  config?: Partial<DataClientConfig>;
  wsConfig?: Partial<WebSocketConfig>;
  mqttConfig?: Partial<MqttConfig>;
}

// 数据层Hook配置
export interface UseDataConfig {
  enabled?: boolean;
  refetchInterval?: number;
  retry?: boolean | number;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

// 缓存策略
export interface CacheStrategy {
  get: (key: string) => any;
  set: (key: string, value: any, ttl?: number) => void;
  delete: (key: string) => void;
  clear: () => void;
  has: (key: string) => boolean;
  size: () => number;
}

// 重试策略
export interface RetryStrategy {
  shouldRetry: (error: Error, attempt: number) => boolean;
  getDelay: (attempt: number) => number;
  getMaxAttempts: () => number;
}

// 错误处理策略
export interface ErrorHandlingStrategy {
  handleError: (error: Error, context: any) => void;
  shouldRetry: (error: Error) => boolean;
  getRetryDelay: (error: Error, attempt: number) => number;
}

// 数据验证接口
export interface DataValidator<T = any> {
  validate: (data: T) => ValidationResult;
  schema: any;
}

// 验证结果
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// 验证错误
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// 数据转换接口
export interface DataTransformer<TInput = any, TOutput = any> {
  transform: (data: TInput) => TOutput;
  reverse?: (data: TOutput) => TInput;
}

// 数据过滤器接口
export interface DataFilter<T = any> {
  filter: (data: T[]) => T[];
  criteria: FilterCriteria;
}

// 过滤条件
export interface FilterCriteria {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'startsWith' | 'endsWith';
  value: any;
}

// 数据分页接口
export interface DataPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// 数据排序接口
export interface DataSort {
  field: string;
  direction: 'asc' | 'desc';
}

// 数据聚合接口
export interface DataAggregation {
  field: string;
  operation: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'distinct';
  alias?: string;
}

// 数据查询构建器
export interface QueryBuilder {
  where: (criteria: FilterCriteria) => QueryBuilder;
  orderBy: (sort: DataSort) => QueryBuilder;
  limit: (count: number) => QueryBuilder;
  offset: (count: number) => QueryBuilder;
  groupBy: (field: string) => QueryBuilder;
  having: (criteria: FilterCriteria) => QueryBuilder;
  aggregate: (aggregation: DataAggregation) => QueryBuilder;
  build: () => QueryParams;
}
