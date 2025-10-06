/**
 * 通用设备引导路由
 * 支持所有设备类型的统一引导接口
 * 提供MQTT配置、影子期望态、OTA决策等
 */

import { Router, Request, Response } from 'express';
import { Logger } from '../utils/logger';
import { generateBootstrapConfig, recordBootstrapEvent, BootstrapRequest } from '../services/device-bootstrap';

const router = Router();

/**
 * 统一设备引导接口
 * POST /api/device/bootstrap
 * 支持所有设备类型：PowerSafe、ESP32、Arduino、Raspberry Pi等
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

    Logger.info('Device bootstrap request', {
      deviceId: deviceInfo.device_id,
      macAddress: deviceInfo.mac_address,
      boardName: deviceInfo.board_name,
      deviceType: deviceInfo.device_type,
      firmwareVersion: deviceInfo.firmware_version,
      hardwareVersion: deviceInfo.hardware_version,
      capabilities: deviceInfo.capabilities,
      tenantInfo: deviceInfo.tenant_info
    });

    // 生成完整的引导配置
    const bootstrapConfig = await generateBootstrapConfig(deviceInfo);
    
    // 记录设备引导事件
    await recordBootstrapEvent(deviceInfo, bootstrapConfig);
    
    res.json({
      success: true,
      data: bootstrapConfig
    });

  } catch (error) {
    Logger.error('Device bootstrap error', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 设备配置接口 - 兼容旧版本
 * POST /api/device/config
 * 支持通过header或参数选择架构版本
 */
router.post('/config', async (req: Request, res: Response) => {
  try {
    const deviceInfo: BootstrapRequest = req.body;
    
    // 验证设备信息
    if (!deviceInfo.device_id && !deviceInfo.mac_address) {
      return res.status(400).json({
        success: false,
        error: 'Missing required device identification'
      });
    }

    Logger.info('Device config request', {
      deviceId: deviceInfo.device_id,
      macAddress: deviceInfo.mac_address,
      boardName: deviceInfo.board_name,
      deviceType: deviceInfo.device_type
    });

    // 检查是否请求新架构格式
    const useNewArchitecture = req.headers['x-architecture-version'] === '2.0' || 
                              deviceInfo.architecture_version === '2.0';
    
    let config;
    if (useNewArchitecture) {
      // 使用新的引导架构
      config = await generateBootstrapConfig(deviceInfo);
    } else {
      // 使用简化的配置格式保持兼容性
      config = await generateLegacyConfig(deviceInfo);
    }
    
    res.json({
      success: true,
      data: config
    });

  } catch (error) {
    Logger.error('Device config error', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * 生成兼容旧版本的配置
 */
async function generateLegacyConfig(deviceInfo: BootstrapRequest) {
  // 简化的配置格式，保持与现有设备的兼容性
  const currentTime = Date.now();
  
  return {
    mqtt: {
      broker: process.env.MQTT_BROKER_URL || "mqtt://emqx:1883",
      port: 1883,
      username: `device_${deviceInfo.device_id || deviceInfo.mac_address}`,
      password: generateSimplePassword(deviceInfo.mac_address || deviceInfo.device_id),
      client_id: `device_${deviceInfo.device_id || deviceInfo.mac_address}`,
      keepalive: 60,
      clean_session: true,
      ssl: false,
      topics: {
        data: `devices/${deviceInfo.device_id || deviceInfo.mac_address}/data`,
        status: `devices/${deviceInfo.device_id || deviceInfo.mac_address}/status`,
        command: `devices/${deviceInfo.device_id || deviceInfo.mac_address}/command`,
        config: `devices/${deviceInfo.device_id || deviceInfo.mac_address}/config`
      }
    },
    websocket: {
      url: `wss://${process.env.SERVER_HOST || 'fountain.top'}/ws/device/${deviceInfo.device_id || deviceInfo.mac_address}`,
      reconnect_interval: 5000,
      heartbeat_interval: 30000,
      timeout: 10000
    },
    server_time: {
      timestamp: currentTime,
      timezone_offset: 480
    }
  };
}

/**
 * 生成简单密码
 */
function generateSimplePassword(deviceId: string): string {
  const timestamp = Date.now().toString();
  return Buffer.from(`${deviceId}_${timestamp}`).toString('base64').substring(0, 16);
}

export default router;
