/**
 * 智能传感器数据大盘页面
 * 展示智能传感器的实时数据和历史数据图表
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { 
  ArrowLeft,
  BarChart3, 
  Thermometer,
  Droplets,
  Gauge,
  Sun,
  Wifi,
  Battery,
  Clock,
  RefreshCw,
  Download,
  Settings,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

export const metadata: Metadata = {
  title: '智能传感器数据大盘 - IoT设备管理平台',
  description: '实时监控智能传感器的温度、湿度、压力、光照等环境数据，提供直观的数据可视化展示。',
  keywords: '智能传感器,数据大盘,实时监控,环境数据,数据可视化',
};

/**
 * 数据卡片组件
 */
function DataCard({ 
  title, 
  value, 
  unit, 
  icon: Icon,
  trend,
  status,
  lastUpdate
}: { 
  title: string; 
  value: string | number; 
  unit: string; 
  icon: any;
  trend?: 'up' | 'down' | 'stable';
  status?: 'normal' | 'warning' | 'error';
  lastUpdate?: string;
}) {
  const statusColors = {
    normal: 'text-green-600',
    warning: 'text-yellow-600',
    error: 'text-red-600'
  };

  const trendIcons = {
    up: <TrendingUp className="h-4 w-4 text-green-500" />,
    down: <TrendingDown className="h-4 w-4 text-red-500" />,
    stable: <div className="h-4 w-4 rounded-full bg-gray-400" />
  };

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900">{title}</h3>
            <div className="flex items-center space-x-2">
              <span className={`text-2xl font-bold ${statusColors[status || 'normal']}`}>
                {value}
              </span>
              <span className="text-sm text-gray-500">{unit}</span>
            </div>
          </div>
        </div>
        {trend && (
          <div className="flex items-center space-x-1">
            {trendIcons[trend]}
          </div>
        )}
      </div>
      {lastUpdate && (
        <div className="mt-4 flex items-center text-xs text-gray-500">
          <Clock className="h-3 w-3 mr-1" />
          最后更新: {lastUpdate}
        </div>
      )}
    </div>
  );
}

/**
 * 图表容器组件
 */
function ChartContainer({ 
  title, 
  children 
}: { 
  title: string; 
  children: React.ReactNode; 
}) {
  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className="flex items-center space-x-2">
          <button className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50">
            <RefreshCw className="h-3 w-3 mr-1" />
            刷新
          </button>
          <button className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50">
            <Download className="h-3 w-3 mr-1" />
            导出
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}

/**
 * 设备状态组件
 */
function DeviceStatus({ 
  deviceId, 
  status, 
  lastSeen, 
  batteryLevel 
}: { 
  deviceId: string; 
  status: 'online' | 'offline' | 'warning'; 
  lastSeen: string; 
  batteryLevel: number; 
}) {
  const statusConfig = {
    online: { color: 'text-green-600', bg: 'bg-green-100', text: '在线' },
    offline: { color: 'text-red-600', bg: 'bg-red-100', text: '离线' },
    warning: { color: 'text-yellow-600', bg: 'bg-yellow-100', text: '警告' }
  };

  const config = statusConfig[status];

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">设备状态</h3>
          <p className="text-sm text-gray-600">设备ID: {deviceId}</p>
        </div>
        <div className="text-right">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.bg} ${config.color}`}>
            {config.text}
          </span>
          <p className="text-xs text-gray-500 mt-1">最后在线: {lastSeen}</p>
        </div>
      </div>
      <div className="mt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">电池电量</span>
          <span className="font-medium">{batteryLevel}%</span>
        </div>
        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full ${batteryLevel > 20 ? 'bg-green-500' : 'bg-red-500'}`}
            style={{ width: `${batteryLevel}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}

export default function SmartSensorDashboardPage() {
  // 模拟实时数据
  const realtimeData = [
    {
      title: '温度',
      value: '23.5',
      unit: '°C',
      icon: Thermometer,
      trend: 'up' as const,
      status: 'normal' as const,
      lastUpdate: '2秒前'
    },
    {
      title: '湿度',
      value: '65.2',
      unit: '%RH',
      icon: Droplets,
      trend: 'stable' as const,
      status: 'normal' as const,
      lastUpdate: '2秒前'
    },
    {
      title: '压力',
      value: '1013.2',
      unit: 'hPa',
      icon: Gauge,
      trend: 'down' as const,
      status: 'normal' as const,
      lastUpdate: '2秒前'
    },
    {
      title: '光照',
      value: '850',
      unit: 'lux',
      icon: Sun,
      trend: 'up' as const,
      status: 'normal' as const,
      lastUpdate: '2秒前'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 导航栏 */}
      <nav className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <Link href="/iot/smart-sensor/profile" className="flex items-center space-x-2">
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
                  href="/iot/smart-sensor/manager" 
                  className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  管理平台
                </Link>
                <button className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700">
                  <Settings className="h-4 w-4 mr-2" />
                  设置
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
              <h1 className="text-2xl font-bold text-gray-900">智能传感器数据大盘</h1>
              <p className="mt-1 text-sm text-gray-600">实时监控环境数据，支持历史数据查询和分析</p>
            </div>
            <div className="flex items-center space-x-3">
              <button className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
                <RefreshCw className="h-4 w-4 mr-2" />
                刷新数据
              </button>
              <button className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700">
                <Download className="h-4 w-4 mr-2" />
                导出数据
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* 设备状态 */}
        <div className="mb-8">
          <DeviceStatus
            deviceId="SENSOR-001"
            status="online"
            lastSeen="2秒前"
            batteryLevel={85}
          />
        </div>

        {/* 实时数据 */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">实时数据</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {realtimeData.map((data, index) => (
              <DataCard
                key={index}
                title={data.title}
                value={data.value}
                unit={data.unit}
                icon={data.icon}
                trend={data.trend}
                status={data.status}
                lastUpdate={data.lastUpdate}
              />
            ))}
          </div>
        </div>

        {/* 数据图表 */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* 温度趋势图 */}
          <ChartContainer title="温度趋势">
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">温度趋势图表</p>
                <p className="text-xs text-gray-400 mt-1">集成图表库后显示</p>
              </div>
            </div>
          </ChartContainer>

          {/* 湿度趋势图 */}
          <ChartContainer title="湿度趋势">
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">湿度趋势图表</p>
                <p className="text-xs text-gray-400 mt-1">集成图表库后显示</p>
              </div>
            </div>
          </ChartContainer>

          {/* 压力趋势图 */}
          <ChartContainer title="压力趋势">
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">压力趋势图表</p>
                <p className="text-xs text-gray-400 mt-1">集成图表库后显示</p>
              </div>
            </div>
          </ChartContainer>

          {/* 光照趋势图 */}
          <ChartContainer title="光照趋势">
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">光照趋势图表</p>
                <p className="text-xs text-gray-400 mt-1">集成图表库后显示</p>
              </div>
            </div>
          </ChartContainer>
        </div>

        {/* 告警信息 */}
        <div className="mt-8">
          <ChartContainer title="告警信息">
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-800">温度异常</p>
                  <p className="text-xs text-yellow-600">当前温度超出正常范围</p>
                </div>
                <span className="text-xs text-yellow-600">5分钟前</span>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800">设备正常</p>
                  <p className="text-xs text-green-600">所有传感器工作正常</p>
                </div>
                <span className="text-xs text-green-600">10分钟前</span>
              </div>
            </div>
          </ChartContainer>
        </div>
      </div>
    </div>
  );
}
