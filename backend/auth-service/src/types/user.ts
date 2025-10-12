export interface User {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  tenant_id: string;
  created_at: Date;
  updated_at: Date;
}

export type UserRole = 'admin' | 'operator' | 'viewer';

export interface UserCreateInput {
  email: string;
  password: string;
  role: UserRole;
  tenant_id: string;
}

export interface UserLoginInput {
  email: string;
  password: string;
}

export interface UserResponse {
  id: string;
  email: string;
  role: UserRole;
  tenant_id: string;
  created_at: Date;
}

export interface AuthTokens {
  token: string;
  refreshToken: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  tenantId: string;
  type: 'access' | 'refresh';
}


