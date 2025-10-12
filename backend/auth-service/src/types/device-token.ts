export interface DeviceToken {
  id: string;
  device_id: string;
  tenant_id: string;
  token_hash: string;
  expires_at: Date;
  created_at: Date;
}

export interface DeviceTokenCreateInput {
  device_id: string;
  tenant_id: string;
  expires_in?: string; // e.g., '365d', '30d'
}

export interface DeviceTokenResponse {
  token: string;
  device_id: string;
  tenant_id: string;
  expires_at: Date;
}

export interface DeviceTokenVerifyInput {
  device_id: string;
  token: string;
}

export interface DeviceTokenVerifyResponse {
  valid: boolean;
  device_id?: string;
  tenant_id?: string;
}

export interface MQTTAuthRequest {
  clientid: string;
  username: string;
  password: string;
}

export interface MQTTAuthResponse {
  result: 'allow' | 'deny';
  is_superuser?: boolean;
  reason?: string;
}

export interface MQTTACLRequest {
  clientid: string;
  username: string;
  topic: string;
  action: 'publish' | 'subscribe';
}

export interface MQTTACLResponse {
  result: 'allow' | 'deny';
  reason?: string;
}


