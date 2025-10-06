# PowerSafe API 文档

## 🌐 API 基础信息

**基础URL**: `https://fountain.top/Powersafe/api/`  
**协议**: HTTPS  
**数据格式**: JSON  
**字符编码**: UTF-8  

## 📋 API 接口列表

### 1. 设备配置接口

**接口地址**: `POST /config`  
**完整URL**: `https://fountain.top/Powersafe/api/config`  

#### 请求参数

```json
{
  "board_name": "PS-1000",
  "mac_address": "AA:BB:CC:DD:EE:FF",
  "firmware_version": "1.1.0",
  "hardware_version": "v2.1",
  "device_id": "PS-001",
  "boot_count": 123,
  "uptime": 86400,
  "free_heap": 32768,
  "wifi_ssid": "IoT-Network",
  "wifi_rssi": -45
}
```

#### 响应格式

```json
{
  "success": true,
  "data": {
    "mqtt": {
      "broker": "mqtt://fountain.top:1883",
      "port": 1883,
      "username": "powersafe_AA:BB:CC:DD:EE:FF",
      "password": "base64_encoded_password",
      "client_id": "powersafe_AA:BB:CC:DD:EE:FF",
      "keepalive": 60,
      "clean_session": true,
      "ssl": false,
      "topics": {
        "data": "powersafe/AA:BB:CC:DD:EE:FF/data",
        "status": "powersafe/AA:BB:CC:DD:EE:FF/status",
        "command": "powersafe/AA:BB:CC:DD:EE:FF/command",
        "config": "powersafe/AA:BB:CC:DD:EE:FF/config"
      }
    },
    "websocket": {
      "url": "wss://fountain.top/ws/powersafe",
      "reconnect_interval": 5000,
      "heartbeat_interval": 30000,
      "timeout": 10000
    },
    "firmware": {
      "version": "1.2.0",
      "url": "https://fountain.top/Powersafe/api/ota/download/1.2.0",
      "force": 0,
      "checksum": "sha256:abc123def456...",
      "size": 2048576,
      "release_notes": "PowerSafe固件v1.2.0更新：\n- 优化电源监控精度\n- 增强异常检测算法\n- 修复已知问题"
    },
    "activation": {
      "required": false,
      "server": "https://fountain.top/Powersafe/api/activation",
      "timeout": 30000
    },
    "server_time": {
      "timestamp": 1704067200000,
      "timezone_offset": 480
    },
    "device_config": {
      "sampling_interval": 1000,
      "voltage_threshold": {
        "min": 180,
        "max": 250
      },
      "current_threshold": {
        "min": 0,
        "max": 80
      },
      "power_threshold": {
        "min": 0,
        "max": 25000
      },
      "alarm_enabled": true,
      "data_retention_days": 30,
      "auto_reboot_hour": 3
    }
  }
}
```

### 2. OTA升级检查接口

**接口地址**: `POST /ota/check`  
**完整URL**: `https://fountain.top/Powersafe/api/ota/check`  

#### 请求参数

```json
{
  "board_name": "PS-1000",
  "firmware_version": "1.1.0",
  "mac_address": "AA:BB:CC:DD:EE:FF"
}
```

#### 响应格式

```json
{
  "success": true,
  "data": {
    "update_available": true,
    "current_version": "1.1.0",
    "latest_version": "1.2.0",
    "download_url": "https://fountain.top/Powersafe/api/ota/download/1.2.0",
    "force_update": false,
    "release_notes": "PowerSafe固件v1.2.0更新：\n- 优化电源监控精度\n- 增强异常检测算法\n- 修复已知问题",
    "file_size": 2048576,
    "checksum": "sha256:abc123def456..."
  }
}
```

### 2.1. 设备端OTA检查接口（推荐）

**接口地址**: `POST /ota/check-device`  
**完整URL**: `https://fountain.top/Powersafe/api/ota/check-device`  

此接口专门为设备端设计，直接返回设备期望的JSON格式，无需包装在success/data中。

> **重要更新**: 此接口已更新为新的URL地址，请使用 `https://fountain.top/Powersafe/api/ota/check-device`

#### 请求参数

```json
{
  "board_name": "PS-1000",
  "mac_address": "AA:BB:CC:DD:EE:FF",
  "firmware_version": "1.1.0",
  "hardware_version": "v2.1",
  "device_id": "PS-001",
  "boot_count": 123,
  "uptime": 86400,
  "free_heap": 32768,
  "wifi_ssid": "IoT-Network",
  "wifi_rssi": -45
}
```

#### 响应格式

```json
{
  "mqtt": {
    "broker": "mqtt://fountain.top:1883",
    "port": 1883,
    "username": "powersafe_AA:BB:CC:DD:EE:FF",
    "password": "base64_encoded_password",
    "client_id": "powersafe_AA:BB:CC:DD:EE:FF",
    "keepalive": 60,
    "clean_session": true,
    "ssl": false,
    "topics": {
      "data": "powersafe/AA:BB:CC:DD:EE:FF/data",
      "status": "powersafe/AA:BB:CC:DD:EE:FF/status",
      "command": "powersafe/AA:BB:CC:DD:EE:FF/command",
      "config": "powersafe/AA:BB:CC:DD:EE:FF/config"
    }
  },
  "websocket": {
    "url": "wss://fountain.top/ws/powersafe",
    "reconnect_int": 5000,
    "heartbeat_int": 30000,
    "timeout": 10000
  },
  "firmware": {
    "version": "1.2.0",
    "url": "https://fountain.top/Powersafe/api/ota/download/1.2.0",
    "force": 0,
    "checksum": "sha256:abc123def456...",
    "size": 2048576,
    "release_notes": "PowerSafe固件v1.2.0更新：\n- 优化电源监控精度\n- 增强异常检测算法\n- 修复已知问题"
  },
  "activation": {
    "required": false,
    "server": "https://fountain.top/Powersafe/api/activation",
    "timeout": 30000,
    "timeout_ms": 30000,
    "message": "设备激活成功",
    "code": "",
    "challenge": ""
  },
  "server_time": {
    "timestamp": 1704067200000,
    "timezone_off": 480
  },
  "device_config": {
    "sampling_int": 500,
    "voltage_thresh": {
      "min": 200,
      "max": 240
    },
    "current_thresh": {
      "min": 0,
      "max": 80
    },
    "power_thresh": {
      "min": 0,
      "max": 25000
    },
    "alarm_enabled": true,
    "data_retention": 30,
    "auto_reboot": 3
  }
}
```

### 3. 设备状态上报接口

**接口地址**: `POST /status`  
**完整URL**: `https://fountain.top/Powersafe/api/status`  

#### 请求参数

```json
{
  "mac_address": "AA:BB:CC:DD:EE:FF",
  "timestamp": 1704067200000,
  "status": "online",
  "voltage": 220.5,
  "current": 15.8,
  "power": 3480,
  "frequency": 50.0,
  "temperature": 35.2,
  "uptime": 86400,
  "free_heap": 32768,
  "wifi_rssi": -45,
  "alarms": []
}
```

#### 响应格式

```json
{
  "success": true,
  "message": "Status updated successfully"
}
```

### 4. 设备数据上报接口

**接口地址**: `POST /data`  
**完整URL**: `https://fountain.top/Powersafe/api/data`  

#### 请求参数

```json
{
  "mac_address": "AA:BB:CC:DD:EE:FF",
  "timestamp": 1704067200000,
  "data": {
    "voltage": 220.5,
    "current": 15.8,
    "power": 3480,
    "frequency": 50.0,
    "temperature": 35.2,
    "power_factor": 0.95,
    "energy_total": 1234.56
  },
  "alarms": [
    {
      "type": "voltage_high",
      "value": 250.2,
      "threshold": 250.0,
      "timestamp": 1704067200000
    }
  ]
}
```

#### 响应格式

```json
{
  "success": true,
  "message": "Data saved successfully"
}
```

## 🔧 配置说明

### MQTT配置

| 参数 | 类型 | 说明 |
|------|------|------|
| broker | string | MQTT服务器地址 |
| port | number | MQTT服务器端口 |
| username | string | 用户名（基于MAC地址生成） |
| password | string | 密码（Base64编码） |
| client_id | string | 客户端ID（基于MAC地址生成） |
| keepalive | number | 心跳间隔（秒） |
| clean_session | boolean | 是否清理会话 |
| ssl | boolean | 是否使用SSL |
| topics | object | 主题配置 |

### 设备配置

| 参数 | 类型 | 说明 |
|------|------|------|
| sampling_interval | number | 采样间隔（毫秒） |
| voltage_threshold | object | 电压阈值配置 |
| current_threshold | object | 电流阈值配置 |
| power_threshold | object | 功率阈值配置 |
| alarm_enabled | boolean | 是否启用告警 |
| data_retention_days | number | 数据保留天数 |
| auto_reboot_hour | number | 自动重启时间（小时） |

## 🚨 错误处理

### 错误响应格式

```json
{
  "success": false,
  "error": "错误描述",
  "code": "ERROR_CODE",
  "timestamp": 1704067200000
}
```

### 常见错误码

| 错误码 | HTTP状态码 | 说明 |
|--------|------------|------|
| MISSING_PARAMS | 400 | 缺少必需参数 |
| INVALID_DEVICE | 400 | 无效设备信息 |
| DEVICE_NOT_FOUND | 404 | 设备未找到 |
| INTERNAL_ERROR | 500 | 服务器内部错误 |

## 🔒 安全说明

1. **设备认证**: 通过MAC地址进行设备身份验证
2. **HTTPS传输**: 所有API调用必须使用HTTPS
3. **密码生成**: 设备密码基于MAC地址和时间戳生成
4. **访问控制**: 支持IP白名单和访问频率限制

## 📊 使用示例

### Arduino/ESP32 示例代码

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "your_wifi_ssid";
const char* password = "your_wifi_password";
const char* api_url = "https://fountain.top/Powersafe/api/ota/check-device";

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.println("Connecting to WiFi...");
  }
  
  checkOTAAndGetConfig();
}

void checkOTAAndGetConfig() {
  HTTPClient http;
  http.begin(api_url);
  http.addHeader("Content-Type", "application/json");
  
  // 构建请求数据 - 匹配设备端代码期望的格式
  DynamicJsonDocument doc(1024);
  doc["board_name"] = "PS-1000";
  doc["mac_address"] = WiFi.macAddress();
  doc["firmware_version"] = "1.1.0";
  doc["hardware_version"] = "v2.1";
  doc["device_id"] = "PS-001";
  doc["boot_count"] = 123;
  doc["uptime"] = millis() / 1000;
  doc["free_heap"] = ESP.getFreeHeap();
  doc["wifi_ssid"] = WiFi.SSID();
  doc["wifi_rssi"] = WiFi.RSSI();
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  int httpResponseCode = http.POST(jsonString);
  
  if (httpResponseCode == 200) {
    String response = http.getString();
    Serial.println("Response: " + response);
    
    // 解析响应 - 直接解析JSON，无需success/data包装
    DynamicJsonDocument responseDoc(4096);
    DeserializationError error = deserializeJson(responseDoc, response);
    
    if (!error) {
      // 解析MQTT配置
      if (responseDoc.containsKey("mqtt")) {
        JsonObject mqtt = responseDoc["mqtt"];
        String broker = mqtt["broker"];
        int port = mqtt["port"];
        String username = mqtt["username"];
        String password = mqtt["password"];
        String clientId = mqtt["client_id"];
        
        Serial.println("MQTT Broker: " + broker);
        Serial.println("MQTT Port: " + String(port));
        Serial.println("MQTT Username: " + username);
        Serial.println("MQTT Client ID: " + clientId);
        
        // 保存MQTT配置到NVS
        saveMQTTConfig(mqtt);
      }
      
      // 解析WebSocket配置
      if (responseDoc.containsKey("websocket")) {
        JsonObject websocket = responseDoc["websocket"];
        String url = websocket["url"];
        int reconnectInterval = websocket["reconnect_int"];
        int heartbeatInterval = websocket["heartbeat_int"];
        
        Serial.println("WebSocket URL: " + url);
        Serial.println("Reconnect Interval: " + String(reconnectInterval));
        
        // 保存WebSocket配置到NVS
        saveWebSocketConfig(websocket);
      }
      
      // 解析固件信息
      if (responseDoc.containsKey("firmware")) {
        JsonObject firmware = responseDoc["firmware"];
        String version = firmware["version"];
        String url = firmware["url"];
        int force = firmware["force"];
        
        Serial.println("Firmware Version: " + version);
        Serial.println("Firmware URL: " + url);
        Serial.println("Force Update: " + String(force));
        
        // 检查是否需要更新
        if (version != "1.1.0" || force == 1) {
          Serial.println("New firmware available, starting OTA update...");
          // 执行OTA更新
          performOTAUpdate(url);
        }
      }
      
      // 解析服务器时间
      if (responseDoc.containsKey("server_time")) {
        JsonObject serverTime = responseDoc["server_time"];
        long timestamp = serverTime["timestamp"];
        int timezoneOffset = serverTime["timezone_off"];
        
        // 设置系统时间
        struct timeval tv;
        tv.tv_sec = timestamp / 1000;
        tv.tv_usec = (timestamp % 1000) * 1000;
        settimeofday(&tv, NULL);
        
        Serial.println("System time updated from server");
      }
      
      // 解析设备配置
      if (responseDoc.containsKey("device_config")) {
        JsonObject deviceConfig = responseDoc["device_config"];
        int samplingInterval = deviceConfig["sampling_int"];
        bool alarmEnabled = deviceConfig["alarm_enabled"];
        
        Serial.println("Sampling Interval: " + String(samplingInterval));
        Serial.println("Alarm Enabled: " + String(alarmEnabled));
        
        // 保存设备配置到NVS
        saveDeviceConfig(deviceConfig);
      }
      
    } else {
      Serial.println("JSON parsing failed: " + String(error.c_str()));
    }
  } else {
    Serial.println("HTTP Error: " + String(httpResponseCode));
  }
  
  http.end();
}

void saveMQTTConfig(JsonObject mqtt) {
  // 保存MQTT配置到NVS存储
  // 实现NVS保存逻辑
}

void saveWebSocketConfig(JsonObject websocket) {
  // 保存WebSocket配置到NVS存储
  // 实现NVS保存逻辑
}

void saveDeviceConfig(JsonObject deviceConfig) {
  // 保存设备配置到NVS存储
  // 实现NVS保存逻辑
}

void performOTAUpdate(String firmwareUrl) {
  // 实现OTA更新逻辑
  Serial.println("Starting OTA update from: " + firmwareUrl);
}

void loop() {
  // 主循环
  delay(10000);
}
```

## 📈 监控和日志

所有API调用都会被记录到系统日志中，包括：
- 请求时间
- 设备信息
- 响应状态
- 错误信息

可以通过管理平台查看设备连接状态和API调用统计。

## 🔄 版本更新

API版本通过URL路径管理，当前版本为v1。未来版本将使用 `/v2/` 等路径。

---

**技术支持**: support@iot-platform.com  
**文档更新**: 2024-01-01  
**API版本**: v1.0.0
