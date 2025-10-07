// Modules Layer - 设备服务
import { getPrismaClient } from '@/infrastructure/db/prisma';
import { query } from '@/infrastructure/db/pg';
import { CacheService } from '@/infrastructure/cache/redis';
import { AdapterFactory } from '@/core/adapters/factory';

export interface Device {
  id: string;
  tenantId: string;
  name: string;
  type: string;
  status: 'online' | 'offline';
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TelemetryData {
  deviceId: string;
  timestamp: Date;
  data: Record<string, any>;
}

export class DeviceService {
  private prisma = getPrismaClient();
  private cache = new CacheService();

  // 创建设备
  async createDevice(tenantId: string, deviceData: Omit<Device, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>): Promise<Device> {
    const device = await this.prisma.device.create({
      data: {
        ...deviceData,
        tenantId,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // 清除相关缓存
    await this.cache.del(`devices:${tenantId}`);
    
    return device as Device;
  }

  // 获取设备列表
  async getDevices(tenantId: string): Promise<Device[]> {
    // 先尝试从缓存获取
    const cacheKey = `devices:${tenantId}`;
    const cached = await this.cache.get<Device[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // 从数据库获取
    const devices = await this.prisma.device.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });

    // 缓存结果（5分钟）
    await this.cache.set(cacheKey, devices, 300);

    return devices as Device[];
  }

  // 获取单个设备
  async getDevice(deviceId: string): Promise<Device | null> {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId }
    });

    return device as Device | null;
  }

  // 更新设备状态
  async updateDeviceStatus(deviceId: string, status: 'online' | 'offline'): Promise<void> {
    await this.prisma.device.update({
      where: { id: deviceId },
      data: {
        status,
        lastSeen: new Date(),
        updatedAt: new Date()
      }
    });

    // 清除相关缓存
    const device = await this.getDevice(deviceId);
    if (device) {
      await this.cache.del(`devices:${device.tenantId}`);
    }
  }

  // 存储遥测数据（使用时序数据库）
  async storeTelemetry(deviceId: string, data: Record<string, any>): Promise<void> {
    const timestamp = new Date();
    
    // 使用原生 SQL 插入到时序表
    await query(`
      INSERT INTO telemetry_data (device_id, timestamp, data)
      VALUES ($1, $2, $3)
    `, [deviceId, timestamp, JSON.stringify(data)]);

    // 更新设备最后在线时间
    await this.updateDeviceStatus(deviceId, 'online');

    // 发布到 MQTT（用于实时通知）
    const mqtt = AdapterFactory.getMqttAdapter();
    if (mqtt.isConnected()) {
      await mqtt.publish(`telemetry/${deviceId}`, JSON.stringify({
        deviceId,
        timestamp,
        data
      }));
    }
  }

  // 获取设备遥测数据
  async getTelemetryData(deviceId: string, startTime: Date, endTime: Date): Promise<TelemetryData[]> {
    const results = await query(`
      SELECT device_id as "deviceId", timestamp, data
      FROM telemetry_data
      WHERE device_id = $1 
        AND timestamp BETWEEN $2 AND $3
      ORDER BY timestamp DESC
      LIMIT 1000
    `, [deviceId, startTime, endTime]);

    return results.map(row => ({
      deviceId: row.deviceId,
      timestamp: row.timestamp,
      data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data
    }));
  }
}
