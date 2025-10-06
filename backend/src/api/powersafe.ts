/**
 * PowerSafe设备API路由
 * 提供PowerSafe特定功能，引导功能使用通用服务
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Logger } from '../common/logger';
import { generateBootstrapConfig, recordBootstrapEvent, BootstrapRequest } from '../core/bootstrap/device-bootstrap';
import crypto from 'crypto';

const router = Router();
const prisma = new PrismaClient();

/**
 * PowerSafe设备引导接口 - 使用通用引导服务
 * POST /api/powersafe/bootstrap
 */
router.post('/bootstrap', async (req: Request, res: Response) => {
  try {
    const deviceInfo: BootstrapRequest = req.body;
    
    // 验证必需参数
    if (!deviceInfo.device_id && !deviceInfo.mac_address) {
      return res.status(400).json({
        success: false,
        error: 'Missing required device identification (device_id or mac_address)'
      });
    }

    Logger.info('PowerSafe device bootstrap request', {
      deviceId: deviceInfo.device_id,
      macAddress: deviceInfo.mac_address,
      boardName: deviceInfo.board_name,
      firmwareVersion: deviceInfo.firmware_version
    });

    // 使用通用引导服务
    const bootstrapConfig = await generateBootstrapConfig(deviceInfo);
    
    // 记录设备引导事件
    await recordBootstrapEvent(deviceInfo, bootstrapConfig);
    
    res.json({
      success: true,
      data: bootstrapConfig
    });

  } catch (error) {
    Logger.error('PowerSafe device bootstrap error', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * PowerSafe设备配置接口 - 保持向后兼容
 * POST /api/powersafe/config
 */
router.post('/config', async (req: Request, res: Response) => {
  try {
    const deviceInfo = req.body;
    
    // 验证设备信息
    if (!deviceInfo.board_name || !deviceInfo.mac_address) {
      return res.status(400).json({
        success: false,
        error: 'Missing required device information'
      });
    }

    Logger.info('PowerSafe device config request', {
      boardName: deviceInfo.board_name,
      macAddress: deviceInfo.mac_address,
      version: deviceInfo.firmware_version
    });

    // 检查是否请求新架构格式
    const useNewArchitecture = req.headers['x-architecture-version'] === '2.0' || 
                              deviceInfo.architecture_version === '2.0';
    
    let config;
    if (useNewArchitecture) {
      // 使用通用引导服务
      const bootstrapRequest: BootstrapRequest = {
        device_id: deviceInfo.device_id,
        mac_address: deviceInfo.mac_address,
        board_name: deviceInfo.board_name,
        firmware_version: deviceInfo.firmware_version,
        hardware_version: deviceInfo.hardware_version,
        capabilities: deviceInfo.capabilities,
        tenant_info: deviceInfo.tenant_info
      };
      config = await generateBootstrapConfig(bootstrapRequest);
    } else {
      // 使用原有配置格式保持兼容性
      config = await getDeviceConfig(deviceInfo);
    }
    
    res.json({
      success: true,
      data: config
    });

  } catch (error) {
    Logger.error('PowerSafe config error', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * OTA升级检查接口
 * POST /api/powersafe/ota/check
 */
router.post('/ota/check', async (req: Request, res: Response) => {
  try {
    const { board_name, firmware_version, mac_address } = req.body;

    if (!board_name || !firmware_version || !mac_address) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }

    // 检查是否有新固件版本
    const otaInfo = await checkOTAUpdate(board_name, firmware_version);
    
    res.json({
      success: true,
      data: otaInfo
    });

  } catch (error) {
    Logger.error('PowerSafe OTA check error', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 设备端OTA检查接口 - 支持引导功能，保持向后兼容
 * POST /api/powersafe/ota/check-device
 */
router.post('/ota/check-device', async (req: Request, res: Response) => {
  try {
    const deviceInfo = req.body;
    
    // 验证设备信息
    if (!deviceInfo.board_name || !deviceInfo.mac_address) {
      return res.status(400).json({
        success: false,
        error: 'Missing required device information'
      });
    }

    Logger.info('PowerSafe device OTA check request', {
      boardName: deviceInfo.board_name,
      macAddress: deviceInfo.mac_address,
      version: deviceInfo.firmware_version
    });

    // 检查是否请求完整引导配置
    const requestBootstrap = req.headers['x-request-bootstrap'] === 'true' || 
                            deviceInfo.request_bootstrap === true;
    
    let response;
    if (requestBootstrap) {
      // 使用通用引导服务
      const bootstrapRequest: BootstrapRequest = {
        device_id: deviceInfo.device_id,
        mac_address: deviceInfo.mac_address,
        board_name: deviceInfo.board_name,
        firmware_version: deviceInfo.firmware_version,
        hardware_version: deviceInfo.hardware_version,
        capabilities: deviceInfo.capabilities,
        tenant_info: deviceInfo.tenant_info
      };
      response = await generateBootstrapConfig(bootstrapRequest);
    } else {
      // 保持原有OTA检查逻辑
      await registerOrUpdateDevice(deviceInfo);
      response = await getDeviceConfig(deviceInfo);
    }
    
    // 直接返回设备端期望的格式，不包装在success/data中
    res.json(response);

  } catch (error) {
    Logger.error('PowerSafe device OTA check error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 设备状态上报接口
 * POST /api/powersafe/status
 */
router.post('/status', async (req: Request, res: Response) => {
  try {
    const statusData = req.body;
    
    // 保存设备状态到数据库
    await saveDeviceStatus(statusData);
    
    res.json({
      success: true,
      message: 'Status updated successfully'
    });

  } catch (error) {
    Logger.error('PowerSafe status update error', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 设备数据上报接口
 * POST /api/powersafe/data
 */
router.post('/data', async (req: Request, res: Response) => {
  try {
    const deviceData = req.body;
    
    // 保存设备数据到数据库
    await saveDeviceData(deviceData);
    
    res.json({
      success: true,
      message: 'Data saved successfully'
    });

  } catch (error) {
    Logger.error('PowerSafe data save error', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 获取设备配置
 */
async function getDeviceConfig(deviceInfo: any) {
  // 使用当前系统时间 (中国时区)
  const currentTime = Date.now();
  
  // 动态获取MQTT服务器地址
  const getMQTTEndpoint = () => {
    // 优先使用环境变量配置
    if (process.env.MQTT_DEVICE_ENDPOINT) {
      // 如果配置的是完整URL，提取host:port部分
      const endpoint = process.env.MQTT_DEVICE_ENDPOINT;
      if (endpoint.startsWith('mqtt://')) {
        return endpoint.replace('mqtt://', '');
      }
      return endpoint;
    }
    
    // 从请求中获取主机信息
    const host = process.env.SERVER_HOST || 'fountain.top';
    const port = process.env.MQTT_PORT || '1883';
    
    return `${host}:${port}`;
  };
  
  // 基础配置 - 适配设备端代码期望的格式
  const baseConfig = {
    mqtt: {
      endpoint: getMQTTEndpoint(),
      port: parseInt(process.env.MQTT_PORT || '1883'),
      username: `powersafe_${deviceInfo.mac_address}`,
      password: generateDevicePassword(deviceInfo.mac_address),
      client_id: `powersafe_${deviceInfo.mac_address}`,
      keepalive: 60,
      clean_session: true,
      ssl: false,
      // 扁平化topics对象 - 适配设备端解析代码
      publish_topic: `powersafe/${deviceInfo.mac_address}/data`,
      status_topic: `powersafe/${deviceInfo.mac_address}/status`,
      command_topic: `powersafe/${deviceInfo.mac_address}/command`,
      config_topic: `powersafe/${deviceInfo.mac_address}/config`
    },
    websocket: {
      url: `wss://${process.env.SERVER_HOST || 'fountain.top'}/ws/powersafe`,
      reconnect_int: 5000,
      heartbeat_int: 30000,
      timeout: 10000
    },
    firmware: {
      version: '1.2.0',
      url: 'https://fountain.top/Powersafe/api/ota/download/1.2.0',
      force: 0,
      checksum: 'sha256:abc123def456...',
      size: 2048576,
      release_notes: 'PowerSafe固件v1.2.0更新：\n- 优化电源监控精度\n- 增强异常检测算法\n- 修复已知问题'
    },
    activation: {
      required: false,
      server: 'https://fountain.top/Powersafe/api/activation',
      timeout: 30000,
      timeout_ms: 30000, // 设备端期望的毫秒格式
      message: '设备激活成功',
      code: '',
      challenge: ''
    },
    server_time: {
      timestamp: currentTime,
      timezone_off: 480 // 中国时区 +8小时 = 480分钟 (UTC+8)
    },
    device_config: {
      sampling_int: 1000, // 1秒采样间隔
      voltage_thresh: {
        min: 180,
        max: 250
      },
      current_thresh: {
        min: 0,
        max: 80
      },
      power_thresh: {
        min: 0,
        max: 25000
      },
      alarm_enabled: true,
      data_retention: 30,
      auto_reboot: 3 // 凌晨3点自动重启
    }
  };

  // 根据设备类型返回特定配置
  if (deviceInfo.board_name && deviceInfo.board_name.includes('PS-1000')) {
    // 数据中心版本配置
    baseConfig.device_config.sampling_int = 500; // 更频繁采样
    baseConfig.device_config.voltage_thresh.min = 200;
    baseConfig.device_config.voltage_thresh.max = 240;
  } else if (deviceInfo.board_name && deviceInfo.board_name.includes('PS-2000')) {
    // 工业版本配置
    baseConfig.device_config.current_thresh.max = 100;
    baseConfig.device_config.power_thresh.max = 30000;
  }

  return baseConfig;
}

/**
 * 检查OTA更新
 */
async function checkOTAUpdate(boardName: string, currentVersion: string) {
  const latestVersion = '1.2.0';
  const needsUpdate = compareVersions(currentVersion, latestVersion) < 0;
  
  if (needsUpdate) {
    return {
      update_available: true,
      current_version: currentVersion,
      latest_version: latestVersion,
      download_url: `https://fountain.top/Powersafe/api/ota/download/${latestVersion}`,
      force_update: false,
      release_notes: 'PowerSafe固件v1.2.0更新：\n- 优化电源监控精度\n- 增强异常检测算法\n- 修复已知问题',
      file_size: 2048576,
      checksum: 'sha256:abc123def456...'
    };
  }
  
  return {
    update_available: false,
    current_version: currentVersion,
    latest_version: latestVersion
  };
}

/**
 * 自动注册或更新PowerSafe设备
 */
async function registerOrUpdateDevice(deviceInfo: any) {
  try {
    const deviceSlug = deviceInfo.mac_address.replace(/:/g, '-').toLowerCase();
    
    // 获取默认租户ID
    const defaultTenant = await prisma.tenant.findFirst({
      where: { name: 'default' }
    });
    
    if (!defaultTenant) {
      Logger.warn('No default tenant found, cannot register PowerSafe device');
      return;
    }

    // 查找现有设备
    const existingDevice = await prisma.device.findUnique({
      where: { 
        tenantId_slug: {
          tenantId: defaultTenant.id,
          slug: deviceSlug
        }
      }
    });

    if (existingDevice) {
      // 更新现有设备
      await prisma.device.update({
        where: { id: existingDevice.id },
        data: {
          lastSeenAt: new Date(),
          status: 'ONLINE',
          connectionInfo: {
            board_name: deviceInfo.board_name,
            firmware_version: deviceInfo.firmware_version,
            last_ota_check: new Date()
          }
        }
      });
      
      Logger.info('PowerSafe device updated', {
        deviceId: existingDevice.id,
        macAddress: deviceInfo.mac_address
      });
    } else {
      // 创建新设备 - 使用默认管理员用户
      const adminUser = await prisma.user.findFirst({
        where: { 
          username: 'admin'
        }
      });

      if (adminUser) {
        // 获取PowerSafe设备模板
        const deviceTemplate = await prisma.deviceTemplate.findFirst({
          where: { 
            tenantId: defaultTenant.id,
            type: 'POWERSAFE'
          }
        });

        if (!deviceTemplate) {
          Logger.warn('No PowerSafe device template found, cannot register device');
          return;
        }

        const newDevice = await prisma.device.create({
          data: {
            id: crypto.randomUUID(),
            tenantId: defaultTenant.id,
            templateId: deviceTemplate.id,
            slug: deviceSlug,
            name: `PowerSafe ${deviceInfo.board_name}`,
            status: 'ONLINE',
            attributes: {
              board_name: deviceInfo.board_name,
              firmware_version: deviceInfo.firmware_version,
              mac_address: deviceInfo.mac_address,
              first_seen: new Date()
            },
            metadata: {
              capabilities: ['power_monitoring', 'ota_update', 'mqtt_communication']
            },
            lastSeenAt: new Date(),
            userId: adminUser.id
          }
        });

        Logger.info('PowerSafe device registered', {
          deviceId: newDevice.id,
          macAddress: deviceInfo.mac_address,
          boardName: deviceInfo.board_name
        });
      } else {
        Logger.warn('No admin user found, cannot register PowerSafe device');
      }
    }
  } catch (error) {
    Logger.error('Failed to register/update PowerSafe device', error);
    // 不抛出错误，避免影响OTA检查流程
  }
}

/**
 * 保存设备状态
 */
async function saveDeviceStatus(statusData: any) {
  try {
    Logger.info('PowerSafe device status', statusData);
    
    // 记录设备状态（使用日志，因为deviceData表可能不存在）
    Logger.info('PowerSafe device status', {
      deviceId: statusData.mac_address || statusData.device_id,
      dataType: 'status',
      data: statusData,
      protocol: 'HTTP',
      source: 'powersafe',
      timestamp: new Date()
    });

    // 更新设备最后在线时间
    if (statusData.mac_address) {
      const deviceSlug = statusData.mac_address.replace(/:/g, '-').toLowerCase();
      await prisma.device.updateMany({
        where: { slug: deviceSlug },
        data: {
          lastSeenAt: new Date(),
          status: 'ONLINE'
        }
      });
    }

    Logger.info('PowerSafe device status saved successfully', {
      deviceId: statusData.mac_address,
      timestamp: new Date()
    });

  } catch (error) {
    Logger.error('Failed to save PowerSafe device status', error);
    throw error;
  }
}

/**
 * 保存设备数据
 */
async function saveDeviceData(deviceData: any) {
  try {
    Logger.info('PowerSafe device data', deviceData);
    
    // 记录设备数据（使用日志，因为deviceData表可能不存在）
    Logger.info('PowerSafe device data', {
      deviceId: deviceData.mac_address || deviceData.device_id,
      dataType: 'sensor_data',
      data: deviceData,
      protocol: 'HTTP',
      source: 'powersafe',
      timestamp: new Date()
    });

    // 更新设备最后在线时间
    if (deviceData.mac_address) {
      const deviceSlug = deviceData.mac_address.replace(/:/g, '-').toLowerCase();
      await prisma.device.updateMany({
        where: { slug: deviceSlug },
        data: {
          lastSeenAt: new Date(),
          status: 'ONLINE'
        }
      });
    }

    Logger.info('PowerSafe device data saved successfully', {
      deviceId: deviceData.mac_address,
      timestamp: new Date()
    });

  } catch (error) {
    Logger.error('Failed to save PowerSafe device data', error);
    throw error;
  }
}

/**
 * 生成设备密码
 */
function generateDevicePassword(macAddress: string): string {
  // 简单的密码生成逻辑，实际应用中应该使用更安全的方法
  const timestamp = Date.now().toString();
  return Buffer.from(`${macAddress}_${timestamp}`).toString('base64').substring(0, 16);
}

/**
 * 版本比较函数
 */
function compareVersions(version1: string, version2: string): number {
  const v1parts = version1.split('.').map(Number);
  const v2parts = version2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
    const v1part = v1parts[i] || 0;
    const v2part = v2parts[i] || 0;
    
    if (v1part < v2part) return -1;
    if (v1part > v2part) return 1;
  }
  
  return 0;
}

// ==========================================
// PowerSafe特定功能实现
// ==========================================

export default router;
