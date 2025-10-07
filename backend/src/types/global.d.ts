// Global TypeScript declarations

// 定义基础类型
export interface TenantContext {
  id: string;
  name?: string;
  [k: string]: any;
}

export interface AuthContext {
  userId: string;
  email?: string;
  roles?: string[];
  [k: string]: any;
}

// 扩展 Fastify 类型
declare module 'fastify' {
  interface FastifyRequest {
    tenant?: TenantContext;
    auth?: AuthContext;
  }
}
