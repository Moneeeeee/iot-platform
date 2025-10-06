/**
 * PowerSafe管理平台页面
 * 提供PowerSafe设备的完整管理功能
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { 
  ArrowLeft,
  Shield,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Power,
  PowerOff,
  Settings,
  Eye,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Wifi,
  WifiOff,
  Battery,
  Zap,
  BarChart3,
  Users,
  MapPin,
  Calendar,
  Tag
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'PowerSafe管理平台 - IoT设备管理平台',
  description: 'PowerSafe智能电源安全设备的完整管理平台，提供设备配置、监控管理、用户权限、数据分析等功能。',
  keywords: 'PowerSafe,管理平台,设备管理,电源监控,用户管理,IoT管理',
};

/**
 * 设备卡片组件
 */
function DeviceCard({ 
  device
}: { 
  device: any; 
}) {
  const statusConfig = {
    online: { color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle, text: '在线' },
    offline: { color: 'text-gray-600', bg: 'bg-gray-100', icon: XCircle, text: '离线' },
    warning: { color: 'text-yellow-600', bg: 'bg-yellow-100', icon: AlertTriangle, text: '预警' },
    error: { color: 'text-red-600', bg: 'bg-red-100', icon: XCircle, text: '故障' }
  };

  const config = statusConfig[device.status];
  const StatusIcon = config.icon;

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{device.name}</h3>
            <p className="text-sm text-gray-600">ID: {device.id}</p>
            <div className="flex items-center space-x-2 mt-2">
              <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
                <StatusIcon className="h-3 w-3" />
                <span>{config.text}</span>
              </div>
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <MapPin className="h-3 w-3" />
                <span>{device.location}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button
            className={`p-2 rounded-lg transition-colors ${
              device.powered ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={device.powered ? '关闭设备' : '开启设备'}
          >
            {device.powered ? <Power className="h-4 w-4" /> : <PowerOff className="h-4 w-4" />}
          </button>
          <button
            className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
            title="编辑设备"
          >
            <Edit className="h-4 w-4" />
          </button>
          <div className="relative">
            <button className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{device.voltage}V</p>
          <p className="text-xs text-gray-500">电压</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{device.current}A</p>
          <p className="text-xs text-gray-500">电流</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{device.power}kW</p>
          <p className="text-xs text-gray-500">功率</p>
        </div>
      </div>
      
      <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center space-x-1">
          <Clock className="h-3 w-3" />
          <span>最后更新: {device.lastUpdate}</span>
        </div>
        <div className="flex items-center space-x-1">
          {device.wifi ? <Wifi className="h-3 w-3 text-green-500" /> : <WifiOff className="h-3 w-3 text-gray-400" />}
          <span>{device.wifi ? 'WiFi' : '离线'}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * 统计卡片组件
 */
function StatCard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  color = 'blue' 
}: { 
  title: string; 
  value: string | number; 
  change?: string; 
  icon: any; 
  color?: 'blue' | 'green' | 'red' | 'yellow'; 
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
    yellow: 'bg-yellow-100 text-yellow-600'
  };

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change && <p className="text-sm text-gray-500">{change}</p>}
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

export default function PowerSafeManagerPage() {
  // 模拟设备数据
  const devices = [
    {
      id: 'PS-001',
      name: '数据中心主电源',
      status: 'online',
      location: '数据中心A区',
      voltage: 220.5,
      current: 15.8,
      power: 3.48,
      lastUpdate: '2分钟前',
      wifi: true,
      powered: true
    },
    {
      id: 'PS-002',
      name: '生产车间电源',
      status: 'warning',
      location: '生产车间B区',
      voltage: 218.2,
      current: 22.1,
      power: 4.82,
      lastUpdate: '1分钟前',
      wifi: true,
      powered: true
    },
    {
      id: 'PS-003',
      name: '办公区域电源',
      status: 'offline',
      location: '办公楼3层',
      voltage: 0,
      current: 0,
      power: 0,
      lastUpdate: '15分钟前',
      wifi: false,
      powered: false
    },
    {
      id: 'PS-004',
      name: '备用电源系统',
      status: 'online',
      location: '配电室',
      voltage: 221.1,
      current: 8.5,
      power: 1.88,
      lastUpdate: '30秒前',
      wifi: true,
      powered: true
    }
  ];


  return (
    <div className="min-h-screen bg-gray-50">
      {/* 导航栏 */}
      <nav className="border-b bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <Link href="/iot" className="flex items-center space-x-2">
                <ArrowLeft className="h-5 w-5 text-gray-500" />
                <span className="text-xl font-bold text-gray-900">IoT Platform</span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                href="/iot/powersafe/profile" 
                className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                设备详情
              </Link>
              <Link 
                href="/iot/powersafe/dashboard" 
                className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                数据大屏
              </Link>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600">管理平台</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* 页面标题和操作栏 */}
      <div className="bg-white border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-white">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">PowerSafe管理平台</h1>
                <p className="text-gray-600">智能电源安全设备管理</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                <Upload className="h-4 w-4 mr-2" />
                导入设备
              </button>
              <button className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                <Download className="h-4 w-4 mr-2" />
                导出数据
              </button>
              <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                添加设备
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* 统计概览 */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatCard
            title="总设备数"
            value={devices.length}
            change="+1 本月"
            icon={Shield}
            color="blue"
          />
          <StatCard
            title="在线设备"
            value={devices.filter(d => d.status === 'online').length}
            change="95% 在线率"
            icon={CheckCircle}
            color="green"
          />
          <StatCard
            title="预警设备"
            value={devices.filter(d => d.status === 'warning').length}
            change="需要关注"
            icon={AlertTriangle}
            color="yellow"
          />
          <StatCard
            title="故障设备"
            value={devices.filter(d => d.status === 'error').length}
            change="0 故障"
            icon={XCircle}
            color="red"
          />
        </div>

        {/* 搜索和筛选 */}
        <div className="bg-white rounded-lg border shadow-sm p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索设备名称、ID或位置..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex space-x-3">
              <select className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                <option>全部状态</option>
                <option>在线</option>
                <option>离线</option>
                <option>预警</option>
                <option>故障</option>
              </select>
              <select className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500">
                <option>全部位置</option>
                <option>数据中心</option>
                <option>生产车间</option>
                <option>办公区域</option>
                <option>配电室</option>
              </select>
              <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                <Filter className="h-4 w-4 mr-2" />
                筛选
              </button>
              <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                <RefreshCw className="h-4 w-4 mr-2" />
                刷新
              </button>
            </div>
          </div>
        </div>

        {/* 设备列表 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {devices.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
            />
          ))}
        </div>

        {/* 快速操作面板 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-lg border bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">快速操作</h3>
            <div className="grid grid-cols-2 gap-4">
              <button className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                  <Power className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900">批量开启</p>
                  <p className="text-xs text-gray-500">开启所有设备</p>
                </div>
              </button>
              
              <button className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100 text-red-600">
                  <PowerOff className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900">批量关闭</p>
                  <p className="text-xs text-gray-500">关闭所有设备</p>
                </div>
              </button>
              
              <button className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600">
                  <Settings className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900">批量配置</p>
                  <p className="text-xs text-gray-500">统一配置参数</p>
                </div>
              </button>
              
              <button className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900">数据分析</p>
                  <p className="text-xs text-gray-500">查看详细报告</p>
                </div>
              </button>
            </div>
          </div>
          
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">系统状态</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">系统运行时间</span>
                <span className="text-sm font-medium text-gray-900">15天 8小时</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">数据同步状态</span>
                <div className="flex items-center space-x-1">
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-600">正常</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">存储使用率</span>
                <span className="text-sm font-medium text-gray-900">68%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">网络延迟</span>
                <span className="text-sm font-medium text-gray-900">12ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">最后备份</span>
                <span className="text-sm font-medium text-gray-900">2小时前</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
