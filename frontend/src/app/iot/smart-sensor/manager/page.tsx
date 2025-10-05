/**
 * 智能传感器管理平台页面
 * 提供设备配置、控制和管理功能
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
  Upload
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
            className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-500"
          >
            <Save className="h-4 w-4 mr-2" />
            保存
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

/**
 * 设备信息组件
 */
function DeviceInfo({ 
  deviceId, 
  status, 
  firmwareVersion, 
  lastUpdate 
}: { 
  deviceId: string; 
  status: 'online' | 'offline'; 
  firmwareVersion: string; 
  lastUpdate: string; 
}) {
  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">设备信息</h3>
          <div className="mt-4 space-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">设备ID:</span>
              <span className="text-sm font-medium text-gray-900">{deviceId}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">状态:</span>
              <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                status === 'online' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {status === 'online' ? '在线' : '离线'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">固件版本:</span>
              <span className="text-sm font-medium text-gray-900">{firmwareVersion}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">最后更新:</span>
              <span className="text-sm font-medium text-gray-900">{lastUpdate}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <button className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * 控制面板组件
 */
function ControlPanel() {
  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">设备控制</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <button className="flex items-center justify-center space-x-2 rounded-md border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
          <Power className="h-4 w-4" />
          <span>重启设备</span>
        </button>
        <button className="flex items-center justify-center space-x-2 rounded-md border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
          <Wifi className="h-4 w-4" />
          <span>重置网络</span>
        </button>
        <button className="flex items-center justify-center space-x-2 rounded-md border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
          <Settings className="h-4 w-4" />
          <span>恢复出厂</span>
        </button>
      </div>
    </div>
  );
}

export default function SmartSensorManagerPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 导航栏 */}
      <nav className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <Link href="/iot/smart-sensor/dashboard" className="flex items-center space-x-2">
                <ArrowLeft className="h-5 w-5 text-gray-500" />
                <span className="text-xl font-bold text-gray-900">IoT Platform</span>
              </Link>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link 
                  href="/iot/smart-sensor/profile" 
                  className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  设备介绍
                </Link>
                <Link 
                  href="/iot/smart-sensor/dashboard" 
                  className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  数据大盘
                </Link>
                <button className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700">
                  <Settings className="h-4 w-4 mr-2" />
                  管理平台
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* 页面标题 */}
      <div className="bg-white border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">智能传感器管理平台</h1>
              <p className="mt-1 text-sm text-gray-600">设备配置、参数设置和远程控制</p>
            </div>
            <div className="flex items-center space-x-3">
              <button className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
                <Download className="h-4 w-4 mr-2" />
                导出配置
              </button>
              <button className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700">
                <Upload className="h-4 w-4 mr-2" />
                导入配置
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* 左侧内容 */}
          <div className="lg:col-span-2 space-y-8">
            {/* 设备信息 */}
            <DeviceInfo
              deviceId="SENSOR-001"
              status="online"
              firmwareVersion="v2.1.3"
              lastUpdate="2024-01-15 14:30:25"
            />

            {/* 基本配置 */}
            <ConfigCard
              title="基本配置"
              description="设置设备的基本参数和网络配置"
              onSave={() => console.log('保存基本配置')}
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    设备名称
                  </label>
                  <input
                    type="text"
                    defaultValue="智能传感器-001"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    采样间隔 (秒)
                  </label>
                  <input
                    type="number"
                    defaultValue="60"
                    min="1"
                    max="3600"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    WiFi网络
                  </label>
                  <select className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
                    <option>IoT-Network-5G</option>
                    <option>IoT-Network-2.4G</option>
                    <option>Guest-Network</option>
                  </select>
                </div>
              </div>
            </ConfigCard>

            {/* 传感器配置 */}
            <ConfigCard
              title="传感器配置"
              description="配置各种传感器的参数和阈值"
              onSave={() => console.log('保存传感器配置')}
            >
              <div className="space-y-6">
                {/* 温度传感器 */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-900">温度传感器</h4>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">高温阈值 (°C)</label>
                      <input
                        type="number"
                        defaultValue="30"
                        className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">低温阈值 (°C)</label>
                      <input
                        type="number"
                        defaultValue="10"
                        className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* 湿度传感器 */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-900">湿度传感器</h4>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">高湿阈值 (%)</label>
                      <input
                        type="number"
                        defaultValue="80"
                        className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">低湿阈值 (%)</label>
                      <input
                        type="number"
                        defaultValue="30"
                        className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* 压力传感器 */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-900">压力传感器</h4>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">高压阈值 (hPa)</label>
                      <input
                        type="number"
                        defaultValue="1020"
                        className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">低压阈值 (hPa)</label>
                      <input
                        type="number"
                        defaultValue="1000"
                        className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* 光照传感器 */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-gray-900">光照传感器</h4>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked className="sr-only peer" />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">高光阈值 (lux)</label>
                      <input
                        type="number"
                        defaultValue="1000"
                        className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">低光阈值 (lux)</label>
                      <input
                        type="number"
                        defaultValue="100"
                        className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </ConfigCard>

            {/* 告警配置 */}
            <ConfigCard
              title="告警配置"
              description="设置告警规则和通知方式"
              onSave={() => console.log('保存告警配置')}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">邮件通知</h4>
                    <p className="text-xs text-gray-600">发送告警邮件到指定邮箱</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    通知邮箱
                  </label>
                  <input
                    type="email"
                    defaultValue="admin@example.com"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    告警间隔 (分钟)
                  </label>
                  <input
                    type="number"
                    defaultValue="5"
                    min="1"
                    max="60"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>
            </ConfigCard>
          </div>

          {/* 右侧内容 */}
          <div className="space-y-8">
            {/* 设备控制 */}
            <ControlPanel />

            {/* 固件更新 */}
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">固件更新</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">当前版本</p>
                    <p className="text-xs text-gray-600">v2.1.3</p>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
                    最新版本
                  </span>
                </div>
                <button className="w-full inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
                  <Upload className="h-4 w-4 mr-2" />
                  检查更新
                </button>
              </div>
            </div>

            {/* 系统日志 */}
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">系统日志</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-gray-900">设备启动成功</p>
                    <p className="text-xs text-gray-500">2024-01-15 14:30:25</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-gray-900">WiFi连接成功</p>
                    <p className="text-xs text-gray-500">2024-01-15 14:30:30</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 text-sm">
                  <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-gray-900">温度超出阈值</p>
                    <p className="text-xs text-gray-500">2024-01-15 14:25:15</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-gray-900">配置更新成功</p>
                    <p className="text-xs text-gray-500">2024-01-15 14:20:10</p>
                  </div>
                </div>
              </div>
              <button className="mt-4 w-full text-sm text-blue-600 hover:text-blue-500">
                查看完整日志
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
