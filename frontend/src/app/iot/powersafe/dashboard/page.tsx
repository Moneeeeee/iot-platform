/**
 * PowerSafe数据大屏页面
 * 展示PowerSafe设备的实时监控数据和统计信息
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { 
  ArrowLeft,
  Shield,
  Zap,
  Battery,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  Wifi,
  WifiOff,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  Settings,
  RefreshCw,
  Download,
  Eye,
  EyeOff
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'PowerSafe数据大屏 - IoT设备管理平台',
  description: 'PowerSafe智能电源安全设备的实时数据监控大屏，展示电源状态、能耗分析、异常预警等关键信息。',
  keywords: 'PowerSafe,数据大屏,电源监控,实时数据,能耗分析,IoT监控',
};

/**
 * 数据卡片组件
 */
function DataCard({ 
  title, 
  value, 
  unit, 
  trend, 
  trendValue, 
  icon: Icon, 
  color = 'blue',
  status = 'normal'
}: { 
  title: string; 
  value: string | number; 
  unit?: string; 
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  icon: any; 
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
  status?: 'normal' | 'warning' | 'error';
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    purple: 'bg-purple-100 text-purple-600'
  };

  const statusClasses = {
    normal: 'border-gray-200',
    warning: 'border-yellow-300 bg-yellow-50',
    error: 'border-red-300 bg-red-50'
  };

  const trendIcons = {
    up: <TrendingUp className="h-4 w-4 text-green-500" />,
    down: <TrendingDown className="h-4 w-4 text-red-500" />,
    stable: <Activity className="h-4 w-4 text-gray-500" />
  };

  return (
    <div className={`rounded-lg border p-6 shadow-sm ${statusClasses[status]}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <div className="flex items-baseline space-x-2">
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              {unit && <p className="text-sm text-gray-500">{unit}</p>}
            </div>
          </div>
        </div>
        {trend && (
          <div className="flex items-center space-x-1">
            {trendIcons[trend]}
            {trendValue && <span className="text-sm text-gray-600">{trendValue}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 状态指示器组件
 */
function StatusIndicator({ 
  status, 
  label, 
  count 
}: { 
  status: 'online' | 'offline' | 'warning' | 'error'; 
  label: string; 
  count: number; 
}) {
  const statusConfig = {
    online: { color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle },
    offline: { color: 'text-gray-600', bg: 'bg-gray-100', icon: XCircle },
    warning: { color: 'text-yellow-600', bg: 'bg-yellow-100', icon: AlertTriangle },
    error: { color: 'text-red-600', bg: 'bg-red-100', icon: XCircle }
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className="flex items-center space-x-3">
      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${config.bg}`}>
        <Icon className={`h-4 w-4 ${config.color}`} />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-lg font-bold text-gray-900">{count}</p>
      </div>
    </div>
  );
}

/**
 * 实时数据图表组件
 */
function RealTimeChart({ 
  title, 
  data, 
  unit 
}: { 
  title: string; 
  data: Array<{ time: string; value: number }>; 
  unit: string; 
}) {
  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">实时更新</span>
          <RefreshCw className="h-4 w-4 text-gray-400 animate-spin" />
        </div>
      </div>
      
      <div className="h-64 flex items-end space-x-1">
        {data.map((point, index) => {
          const height = ((point.value - minValue) / (maxValue - minValue)) * 100;
          return (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div 
                className="w-full bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-600"
                style={{ height: `${Math.max(height, 5)}%` }}
                title={`${point.time}: ${point.value}${unit}`}
              />
              {index % 5 === 0 && (
                <span className="text-xs text-gray-500 mt-2 transform -rotate-45">
                  {point.time}
                </span>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 flex justify-between text-sm text-gray-500">
        <span>最小值: {minValue}{unit}</span>
        <span>最大值: {maxValue}{unit}</span>
      </div>
    </div>
  );
}

export default function PowerSafeDashboardPage() {
  // 模拟实时数据
  const realTimeData = Array.from({ length: 24 }, (_, i) => ({
    time: `${i.toString().padStart(2, '0')}:00`,
    value: Math.random() * 100 + 200 // 200-300V 电压范围
  }));

  const currentData = Array.from({ length: 12 }, (_, i) => ({
    time: `${i.toString().padStart(2, '0')}:00`,
    value: Math.random() * 20 + 10 // 10-30A 电流范围
  }));

  const powerData = Array.from({ length: 18 }, (_, i) => ({
    time: `${i.toString().padStart(2, '0')}:00`,
    value: Math.random() * 5000 + 2000 // 2-7kW 功率范围
  }));

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
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600">实时数据</span>
              </div>
              <Link 
                href="/iot/powersafe/profile" 
                className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                设备详情
              </Link>
              <Link 
                href="/iot/powersafe/manager" 
                className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium"
              >
                管理平台
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* 页面标题 */}
      <div className="bg-white border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600 text-white">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">PowerSafe数据大屏</h1>
                <p className="text-gray-600">实时电源安全监控数据</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                <Download className="h-4 w-4 mr-2" />
                导出数据
              </button>
              <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                <Settings className="h-4 w-4 mr-2" />
                设置
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* 关键指标卡片 */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <DataCard
            title="当前电压"
            value="220.5"
            unit="V"
            trend="stable"
            trendValue="±0.2%"
            icon={Zap}
            color="blue"
            status="normal"
          />
          <DataCard
            title="当前电流"
            value="15.8"
            unit="A"
            trend="up"
            trendValue="+2.1%"
            icon={Activity}
            color="green"
            status="normal"
          />
          <DataCard
            title="实时功率"
            value="3.48"
            unit="kW"
            trend="up"
            trendValue="+1.5%"
            icon={BarChart3}
            color="purple"
            status="normal"
          />
          <DataCard
            title="设备状态"
            value="正常"
            unit=""
            trend="stable"
            icon={Shield}
            color="green"
            status="normal"
          />
        </div>

        {/* 设备状态概览 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 rounded-lg border bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">设备状态概览</h3>
            <div className="grid grid-cols-2 gap-6">
              <StatusIndicator status="online" label="在线设备" count={12} />
              <StatusIndicator status="offline" label="离线设备" count={1} />
              <StatusIndicator status="warning" label="预警设备" count={2} />
              <StatusIndicator status="error" label="故障设备" count={0} />
            </div>
          </div>
          
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">今日统计</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">总用电量</span>
                <span className="font-semibold text-gray-900">85.6 kWh</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">峰值功率</span>
                <span className="font-semibold text-gray-900">4.2 kW</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">异常次数</span>
                <span className="font-semibold text-red-600">3</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">平均效率</span>
                <span className="font-semibold text-green-600">96.8%</span>
              </div>
            </div>
          </div>
        </div>

        {/* 实时数据图表 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <RealTimeChart
            title="电压趋势 (24小时)"
            data={realTimeData}
            unit="V"
          />
          <RealTimeChart
            title="电流趋势 (12小时)"
            data={currentData}
            unit="A"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <RealTimeChart
            title="功率趋势 (18小时)"
            data={powerData}
            unit="W"
          />
          
          {/* 异常预警 */}
          <div className="lg:col-span-2 rounded-lg border bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">异常预警</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">电压波动预警</p>
                  <p className="text-sm text-gray-600">设备 #PS-001 电压超出正常范围</p>
                  <p className="text-xs text-gray-500">2分钟前</p>
                </div>
                <button className="text-sm text-blue-600 hover:text-blue-500">处理</button>
              </div>
              
              <div className="flex items-center space-x-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">设备离线</p>
                  <p className="text-sm text-gray-600">设备 #PS-003 连接中断</p>
                  <p className="text-xs text-gray-500">5分钟前</p>
                </div>
                <button className="text-sm text-blue-600 hover:text-blue-500">处理</button>
              </div>
              
              <div className="flex items-center space-x-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">系统正常</p>
                  <p className="text-sm text-gray-600">所有设备运行正常</p>
                  <p className="text-xs text-gray-500">10分钟前</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 能耗分析 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">能耗分析</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">今日用电</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '75%' }}></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">75%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">本周用电</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '60%' }}></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">60%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">本月用电</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-600 h-2 rounded-full" style={{ width: '45%' }}></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900">45%</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">设备分布</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="h-3 w-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">数据中心</span>
                </div>
                <span className="text-sm font-medium text-gray-900">8台</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">生产车间</span>
                </div>
                <span className="text-sm font-medium text-gray-900">4台</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="h-3 w-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">办公区域</span>
                </div>
                <span className="text-sm font-medium text-gray-900">2台</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="h-3 w-3 bg-purple-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">其他区域</span>
                </div>
                <span className="text-sm font-medium text-gray-900">1台</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
