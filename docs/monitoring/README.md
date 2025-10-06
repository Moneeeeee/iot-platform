# 监控文档

## 📊 监控概览

IoT平台提供全面的监控功能，包括系统健康状态、设备状态、性能指标和告警管理。

## 🔍 监控组件

### 1. 系统健康监控

#### 健康检查端点
```bash
# Backend健康检查
curl http://localhost:8000/health

# 响应示例
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00Z",
  "services": {
    "database": {
      "status": "up",
      "responseTime": 15
    },
    "redis": {
      "status": "up", 
      "responseTime": 5
    },
    "mqtt": {
      "status": "up",
      "responseTime": 10
    }
  }
}
```

#### 服务状态监控
- **PostgreSQL**: 连接状态、查询性能、连接池使用率
- **Redis**: 内存使用、连接数、命中率
- **EMQX**: 连接数、消息吞吐量、主题统计
- **Backend**: CPU使用率、内存使用、响应时间
- **Frontend**: 页面加载时间、错误率

### 2. 设备监控

#### 设备状态监控
```typescript
// 设备在线状态
interface DeviceStatus {
  deviceId: string;
  status: 'online' | 'offline' | 'error';
  lastSeen: Date;
  uptime: number;
  signalStrength: number;
}

// 设备性能指标
interface DeviceMetrics {
  deviceId: string;
  voltage: number;
  current: number;
  power: number;
  temperature: number;
  timestamp: Date;
}
```

#### 实时数据监控
- **电压监控**: 实时电压值、电压波动、异常检测
- **电流监控**: 电流消耗、负载分析、峰值检测
- **功率监控**: 功率计算、能耗统计、效率分析
- **温度监控**: 设备温度、过热告警、散热状态

### 3. 告警系统

#### 告警规则配置
```json
{
  "alerts": [
    {
      "id": "voltage_high",
      "name": "电压过高告警",
      "condition": "voltage > 250",
      "severity": "high",
      "enabled": true
    },
    {
      "id": "device_offline",
      "name": "设备离线告警", 
      "condition": "lastSeen > 300",
      "severity": "critical",
      "enabled": true
    }
  ]
}
```

#### 告警通知
- **邮件通知**: SMTP邮件发送
- **Webhook通知**: HTTP回调通知
- **短信通知**: 短信网关集成
- **钉钉/企业微信**: 即时通讯通知

## 📈 性能监控

### 1. 系统性能指标

#### CPU和内存监控
```bash
# 查看容器资源使用
docker stats

# 查看系统资源
htop
iostat -x 1
```

#### 网络监控
```bash
# 查看网络连接
netstat -tulpn

# 查看网络流量
iftop
nethogs
```

### 2. 应用性能监控

#### API性能监控
- **响应时间**: 平均响应时间、P95、P99
- **吞吐量**: 每秒请求数、并发连接数
- **错误率**: 4xx、5xx错误统计
- **可用性**: 服务可用性百分比

#### 数据库性能监控
```sql
-- 查看慢查询
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- 查看连接数
SELECT count(*) FROM pg_stat_activity;
```

## 📊 监控仪表板

### 1. 系统概览

#### 关键指标
- **系统状态**: 所有服务健康状态
- **设备统计**: 在线设备数、离线设备数
- **数据流量**: MQTT消息数、API请求数
- **资源使用**: CPU、内存、磁盘使用率

#### 实时图表
- **设备状态趋势**: 在线/离线设备数量变化
- **数据流量趋势**: 消息发送/接收统计
- **性能指标趋势**: CPU、内存使用率变化
- **告警统计**: 告警数量、类型分布

### 2. 设备详情

#### 设备监控页面
- **实时数据**: 电压、电流、功率实时显示
- **历史趋势**: 历史数据图表展示
- **告警历史**: 设备告警记录
- **配置信息**: 设备配置参数

#### 数据可视化
```typescript
// 实时数据图表
interface ChartData {
  timestamp: string;
  voltage: number;
  current: number;
  power: number;
  temperature: number;
}

// 告警统计图表
interface AlertStats {
  date: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}
```

## 🔔 告警管理

### 1. 告警规则

#### 阈值告警
```json
{
  "voltage_alerts": [
    {
      "name": "电压过低",
      "condition": "voltage < 180",
      "severity": "high",
      "cooldown": 300
    },
    {
      "name": "电压过高", 
      "condition": "voltage > 250",
      "severity": "critical",
      "cooldown": 60
    }
  ]
}
```

#### 状态告警
```json
{
  "status_alerts": [
    {
      "name": "设备离线",
      "condition": "lastSeen > 300",
      "severity": "critical",
      "cooldown": 600
    },
    {
      "name": "设备异常",
      "condition": "status == 'error'",
      "severity": "high", 
      "cooldown": 300
    }
  ]
}
```

### 2. 告警处理

#### 告警生命周期
1. **触发**: 满足告警条件
2. **通知**: 发送告警通知
3. **确认**: 运维人员确认告警
4. **处理**: 执行处理措施
5. **恢复**: 告警条件解除
6. **关闭**: 手动关闭告警

#### 告警升级
```json
{
  "escalation": {
    "levels": [
      {
        "level": 1,
        "delay": 300,
        "notify": ["admin@company.com"]
      },
      {
        "level": 2, 
        "delay": 600,
        "notify": ["manager@company.com", "ops@company.com"]
      },
      {
        "level": 3,
        "delay": 1800,
        "notify": ["cto@company.com"]
      }
    ]
  }
}
```

## 📋 日志管理

### 1. 日志收集

#### 应用日志
```typescript
// 结构化日志
logger.info('Device data received', {
  deviceId: 'device-001',
  voltage: 220.5,
  current: 15.8,
  timestamp: new Date()
});

// 错误日志
logger.error('Database connection failed', {
  error: error.message,
  stack: error.stack,
  timestamp: new Date()
});
```

#### 系统日志
- **Docker日志**: 容器运行日志
- **Nginx日志**: Web服务器访问日志
- **系统日志**: 系统内核和守护进程日志

### 2. 日志分析

#### 日志查询
```bash
# 查看应用日志
docker-compose logs -f backend

# 查看错误日志
docker-compose logs backend | grep ERROR

# 查看特定时间日志
docker-compose logs --since="2024-01-01T00:00:00" backend
```

#### 日志聚合
- **ELK Stack**: Elasticsearch + Logstash + Kibana
- **Fluentd**: 日志收集和转发
- **Prometheus**: 指标收集和监控

## 🛠️ 监控工具

### 1. 内置监控

#### 健康检查API
```bash
# 系统健康状态
GET /health

# 设备健康状态  
GET /health/devices

# 服务健康状态
GET /health/services
```

#### 监控指标API
```bash
# 系统指标
GET /metrics/system

# 设备指标
GET /metrics/devices

# 性能指标
GET /metrics/performance
```

### 2. 外部监控工具

#### Prometheus + Grafana
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'iot-platform'
    static_configs:
      - targets: ['backend:8000']
    metrics_path: '/metrics'
    scrape_interval: 5s
```

#### 监控面板配置
- **系统概览**: 服务状态、资源使用
- **设备监控**: 设备状态、数据统计
- **告警管理**: 告警规则、告警历史
- **性能分析**: 响应时间、吞吐量

## 📚 相关文档

- [部署文档](../deployment/README.md)
- [Backend文档](../backend/README.md)
- [API文档](../api/README.md)
- [故障排查文档](../troubleshooting/README.md)
