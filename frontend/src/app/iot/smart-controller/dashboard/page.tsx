/**
 * 智能控制器数据仪表板页面
 * 显示实时数据、图表和监控信息
 */

"use client";

import Link from 'next/link';
import { 
  ArrowLeft,
  BarChart3, 
  TrendingUp,
  Activity,
  Zap,
  Cpu,
  Thermometer,
  Wifi,
  Battery,
  Clock,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

/**
 * 数据卡片组件
 */
function DataCard({ 
  title, 
  value, 
  unit, 
  icon: Icon, 
  trend, 
  color = "blue" 
}: { 
  title: string; 
  value: string | number; 
  unit?: string; 
  icon: any; 
  trend?: { value: number; isPositive: boolean };
  color?: string;
}) {
  const colorClasses = {
    blue: "bg-blue-500",
    green: "bg-green-500", 
    yellow: "bg-yellow-500",
    red: "bg-red-500",
    purple: "bg-purple-500"
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">
            {value}
            {unit && <span className="text-lg font-normal text-gray-500 ml-1">{unit}</span>}
          </p>
          {trend && (
            <div className={`flex items-center mt-1 text-sm ${
              trend.isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              <TrendingUp className={`h-4 w-4 mr-1 ${
                trend.isPositive ? '' : 'rotate-180'
              }`} />
              {Math.abs(trend.value)}%
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color as keyof typeof colorClasses]}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
}

/**
 * 图表容器组件
 */
function ChartContainer({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      {children}
    </div>
  );
}

/**
 * 智能控制器仪表板页面
 */
export default function SmartControllerDashboardPage() {
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
              <h1 className="text-xl font-semibold text-gray-900">智能控制器仪表板</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-sm text-gray-600">实时数据</span>
              </div>
              <span className="text-sm text-gray-500">最后更新: 刚刚</span>
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 关键指标 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <DataCard
            title="总输出功率"
            value="2.4"
            unit="kW"
            icon={Zap}
            trend={{ value: 5.2, isPositive: true }}
            color="yellow"
          />
          <DataCard
            title="CPU使用率"
            value="15"
            unit="%"
            icon={Cpu}
            trend={{ value: 2.1, isPositive: false }}
            color="blue"
          />
          <DataCard
            title="设备温度"
            value="42"
            unit="°C"
            icon={Thermometer}
            trend={{ value: 1.5, isPositive: true }}
            color="red"
          />
          <DataCard
            title="运行时间"
            value="15"
            unit="天"
            icon={Clock}
            color="green"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：主要图表 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 功率输出趋势 */}
            <ChartContainer title="功率输出趋势 (最近24小时)">
              <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">功率输出图表</p>
                  <p className="text-sm text-gray-400">显示各通道的功率输出变化</p>
                </div>
              </div>
            </ChartContainer>

            {/* 通道状态 */}
            <ChartContainer title="控制通道状态">
              <div className="space-y-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((channel) => (
                  <div key={channel} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="font-medium text-gray-900">通道 {channel}</span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm text-gray-600">输出值</p>
                        <p className="font-semibold text-gray-900">
                          {Math.floor(Math.random() * 100)}%
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">功率</p>
                        <p className="font-semibold text-gray-900">
                          {(Math.random() * 500).toFixed(1)}W
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">状态</p>
                        <p className="text-sm text-green-600">运行中</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ChartContainer>
          </div>

          {/* 右侧：状态和告警 */}
          <div className="space-y-6">
            {/* 系统状态 */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">系统状态</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Wifi className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-gray-600">网络连接</span>
                  </div>
                  <span className="text-sm text-green-600">正常</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Battery className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-gray-600">电源状态</span>
                  </div>
                  <span className="text-sm text-green-600">正常</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Cpu className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-gray-600">处理器</span>
                  </div>
                  <span className="text-sm text-green-600">正常</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Thermometer className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm text-gray-600">温度</span>
                  </div>
                  <span className="text-sm text-yellow-600">偏高</span>
                </div>
              </div>
            </div>

            {/* 实时告警 */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">实时告警</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">温度警告</p>
                    <p className="text-xs text-gray-600">设备温度超过40°C</p>
                    <p className="text-xs text-gray-500 mt-1">2分钟前</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">系统正常</p>
                    <p className="text-xs text-gray-600">所有通道运行正常</p>
                    <p className="text-xs text-gray-500 mt-1">5分钟前</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 性能指标 */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">性能指标</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">内存使用</span>
                    <span className="text-gray-900">256MB / 512MB</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{width: '50%'}}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">存储使用</span>
                    <span className="text-gray-900">1.2GB / 8GB</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{width: '15%'}}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">网络带宽</span>
                    <span className="text-gray-900">2.1Mbps / 10Mbps</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-600 h-2 rounded-full" style={{width: '21%'}}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* 快速操作 */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">快速操作</h3>
              <div className="space-y-2">
                <Link 
                  href="/iot/smart-controller/manager"
                  className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  设备管理
                </Link>
                <Link 
                  href="/iot/smart-controller/profile"
                  className="block w-full text-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  设备配置
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
