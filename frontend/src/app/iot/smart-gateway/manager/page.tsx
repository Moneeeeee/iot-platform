/**
 * 智能网关管理平台页面
 * 提供网关配置、协议转换和连接管理功能
 */

"use client";

import Link from 'next/link';
import { 
  ArrowLeft,
  BarChart3, 
  Settings,
  Power,
  Wifi,
  Battery,
  Clock,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Edit,
  Trash2,
  Plus,
  Download,
  Upload,
  Network,
  Shield,
  Database,
  Router
} from 'lucide-react';

/**
 * 配置卡片组件
 */
function ConfigCard({ 
  title, 
  description, 
  children,
  onSave
}: { 
  title: string; 
  description: string; 
  children: React.ReactNode;
  onSave?: () => void;
}) {
  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
        {onSave && (
          <button
            onClick={onSave}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Save className="h-4 w-4 mr-1" />
            保存
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

/**
 * 状态指示器组件
 */
function StatusIndicator({ status, label }: { status: 'online' | 'offline' | 'error'; label: string }) {
  const statusConfig = {
    online: { color: 'bg-green-500', text: '在线' },
    offline: { color: 'bg-gray-400', text: '离线' },
    error: { color: 'bg-red-500', text: '错误' }
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center space-x-2">
      <div className={`w-2 h-2 rounded-full ${config.color}`}></div>
      <span className="text-sm text-gray-600">{label}: {config.text}</span>
    </div>
  );
}

/**
 * 智能网关管理页面
 */
export default function SmartGatewayManagerPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部导航 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link 
                href="/iot"
                className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                返回设备列表
              </Link>
              <div className="h-6 w-px bg-gray-300"></div>
              <h1 className="text-xl font-semibold text-gray-900">智能网关管理</h1>
            </div>
            <div className="flex items-center space-x-4">
              <StatusIndicator status="online" label="网关状态" />
              <button className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <RefreshCw className="h-4 w-4 mr-1" />
                刷新
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：网关状态和配置 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 网关概览 */}
            <ConfigCard title="网关概览" description="智能网关基本信息和状态">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">网关ID</p>
                      <p className="text-lg font-semibold text-gray-900">GW-001</p>
                    </div>
                    <Router className="h-8 w-8 text-blue-500" />
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">连接设备</p>
                      <p className="text-lg font-semibold text-gray-900">24/30</p>
                    </div>
                    <Network className="h-8 w-8 text-green-500" />
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">数据吞吐量</p>
                      <p className="text-lg font-semibold text-gray-900">2.4MB/s</p>
                    </div>
                    <Database className="h-8 w-8 text-purple-500" />
                  </div>
                </div>
              </div>
            </ConfigCard>

            {/* 协议配置 */}
            <ConfigCard title="协议配置" description="配置网关支持的通信协议">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      主要协议
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option>MQTT</option>
                      <option>HTTP/HTTPS</option>
                      <option>CoAP</option>
                      <option>Modbus TCP</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      端口配置
                    </label>
                    <input 
                      type="number" 
                      defaultValue="1883"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    支持的协议
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {['MQTT', 'HTTP', 'CoAP', 'Modbus', 'OPC-UA', 'BACnet', 'Zigbee', 'LoRaWAN'].map((protocol) => (
                      <label key={protocol} className="flex items-center">
                        <input type="checkbox" defaultChecked className="mr-2" />
                        <span className="text-sm">{protocol}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </ConfigCard>

            {/* 设备连接管理 */}
            <ConfigCard title="设备连接管理" description="管理连接到网关的设备">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">已连接设备</h4>
                  <button className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200">
                    <Plus className="h-4 w-4 mr-1" />
                    添加设备
                  </button>
                </div>
                <div className="space-y-3">
                  {[
                    { id: 'SENSOR-001', name: '温度传感器', type: 'MQTT', status: 'online' },
                    { id: 'SENSOR-002', name: '湿度传感器', type: 'MQTT', status: 'online' },
                    { id: 'CTRL-001', name: '智能控制器', type: 'Modbus', status: 'online' },
                    { id: 'SENSOR-003', name: '压力传感器', type: 'HTTP', status: 'offline' },
                    { id: 'GATEWAY-002', name: '子网关', type: 'CoAP', status: 'online' }
                  ].map((device) => (
                    <div key={device.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${
                          device.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                        }`}></div>
                        <div>
                          <p className="font-medium text-gray-900">{device.name}</p>
                          <p className="text-sm text-gray-500">{device.id} • {device.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          device.status === 'online' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {device.status === 'online' ? '在线' : '离线'}
                        </span>
                        <button className="p-1 text-gray-400 hover:text-gray-600">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button className="p-1 text-gray-400 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ConfigCard>

            {/* 数据路由配置 */}
            <ConfigCard title="数据路由配置" description="配置数据转发和路由规则">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">路由规则</h4>
                  <button className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-100 hover:bg-blue-200">
                    <Plus className="h-4 w-4 mr-1" />
                    添加规则
                  </button>
                </div>
                <div className="space-y-3">
                  {[
                    { source: 'SENSOR-001', target: 'Cloud', protocol: 'MQTT', topic: 'sensors/temperature' },
                    { source: 'CTRL-001', target: 'Local DB', protocol: 'HTTP', topic: 'control/status' },
                    { source: 'GATEWAY-002', target: 'Analytics', protocol: 'CoAP', topic: 'analytics/data' }
                  ].map((rule, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">{rule.source}</p>
                          <p className="text-gray-500">→ {rule.target}</p>
                        </div>
                        <div className="text-sm">
                          <p className="text-gray-600">协议: {rule.protocol}</p>
                          <p className="text-gray-500">主题: {rule.topic}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button className="p-1 text-gray-400 hover:text-gray-600">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button className="p-1 text-gray-400 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ConfigCard>
          </div>

          {/* 右侧：快速操作和状态 */}
          <div className="space-y-6">
            {/* 快速操作 */}
            <ConfigCard title="快速操作" description="常用网关操作">
              <div className="space-y-3">
                <button className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700">
                  <Power className="h-4 w-4 mr-2" />
                  启动所有服务
                </button>
                <button className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700">
                  <Power className="h-4 w-4 mr-2" />
                  停止所有服务
                </button>
                <button className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                  <Shield className="h-4 w-4 mr-2" />
                  安全检查
                </button>
                <button className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                  <Download className="h-4 w-4 mr-2" />
                  导出配置
                </button>
                <button className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                  <Upload className="h-4 w-4 mr-2" />
                  导入配置
                </button>
              </div>
            </ConfigCard>

            {/* 系统状态 */}
            <ConfigCard title="系统状态" description="网关系统信息">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">CPU使用率</span>
                  <span className="text-sm font-medium text-gray-900">25%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{width: '25%'}}></div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">内存使用</span>
                  <span className="text-sm font-medium text-gray-900">512MB / 1GB</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{width: '50%'}}></div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">网络带宽</span>
                  <span className="text-sm font-medium text-gray-900">15.2Mbps / 100Mbps</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full" style={{width: '15%'}}></div>
                </div>
              </div>
            </ConfigCard>

            {/* 连接状态 */}
            <ConfigCard title="连接状态" description="网络和通信状态">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Wifi className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-gray-600">WiFi连接</span>
                  </div>
                  <span className="text-sm text-green-600">已连接</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Network className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-gray-600">MQTT Broker</span>
                  </div>
                  <span className="text-sm text-green-600">已连接</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Database className="h-4 w-4 text-purple-500" />
                    <span className="text-sm text-gray-600">数据库连接</span>
                  </div>
                  <span className="text-sm text-green-600">已连接</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Battery className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-gray-600">电源状态</span>
                  </div>
                  <span className="text-sm text-green-600">正常</span>
                </div>
              </div>
            </ConfigCard>

            {/* 最近活动 */}
            <ConfigCard title="最近活动" description="网关操作记录">
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">新设备 SENSOR-004 已连接</p>
                    <p className="text-xs text-gray-500">1分钟前</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">数据路由规则已更新</p>
                    <p className="text-xs text-gray-500">3分钟前</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">设备 SENSOR-003 连接超时</p>
                    <p className="text-xs text-gray-500">5分钟前</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">网关配置已保存</p>
                    <p className="text-xs text-gray-500">10分钟前</p>
                  </div>
                </div>
              </div>
            </ConfigCard>
          </div>
        </div>
      </div>
    </div>
  );
}
