/**
 * 智能控制器管理平台页面
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
  Upload,
  Zap,
  Shield,
  Cpu
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
 * 智能控制器管理页面
 */
export default function SmartControllerManagerPage() {
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
              <h1 className="text-xl font-semibold text-gray-900">智能控制器管理</h1>
            </div>
            <div className="flex items-center space-x-4">
              <StatusIndicator status="online" label="设备状态" />
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
          {/* 左侧：设备状态和控制 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 设备概览 */}
            <ConfigCard title="设备概览" description="智能控制器基本信息和状态">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">设备ID</p>
                      <p className="text-lg font-semibold text-gray-900">CTRL-001</p>
                    </div>
                    <Cpu className="h-8 w-8 text-blue-500" />
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">运行时间</p>
                      <p className="text-lg font-semibold text-gray-900">15天</p>
                    </div>
                    <Clock className="h-8 w-8 text-green-500" />
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">控制通道</p>
                      <p className="text-lg font-semibold text-gray-900">8/8</p>
                    </div>
                    <Zap className="h-8 w-8 text-yellow-500" />
                  </div>
                </div>
              </div>
            </ConfigCard>

            {/* 控制配置 */}
            <ConfigCard title="控制配置" description="配置控制器的输出通道和参数">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      输出模式
                    </label>
                    <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option>PWM模式</option>
                      <option>数字模式</option>
                      <option>模拟模式</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      频率设置 (Hz)
                    </label>
                    <input 
                      type="number" 
                      defaultValue="1000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    安全模式
                  </label>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input type="radio" name="safety" value="normal" defaultChecked className="mr-2" />
                      正常模式
                    </label>
                    <label className="flex items-center">
                      <input type="radio" name="safety" value="safe" className="mr-2" />
                      安全模式
                    </label>
                    <label className="flex items-center">
                      <input type="radio" name="safety" value="emergency" className="mr-2" />
                      紧急停止
                    </label>
                  </div>
                </div>
              </div>
            </ConfigCard>

            {/* 通道配置 */}
            <ConfigCard title="通道配置" description="配置8个控制通道的参数">
              <div className="space-y-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((channel) => (
                  <div key={channel} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">通道 {channel}</h4>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">状态:</span>
                        <span className="text-sm text-green-600">启用</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">输出值</label>
                        <input 
                          type="range" 
                          min="0" 
                          max="100" 
                          defaultValue="50"
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>0%</span>
                          <span>50%</span>
                          <span>100%</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">类型</label>
                        <select className="w-full px-2 py-1 text-sm border border-gray-300 rounded">
                          <option>PWM</option>
                          <option>数字</option>
                          <option>模拟</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">标签</label>
                        <input 
                          type="text" 
                          placeholder={`通道${channel}`}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ConfigCard>
          </div>

          {/* 右侧：快速操作和状态 */}
          <div className="space-y-6">
            {/* 快速操作 */}
            <ConfigCard title="快速操作" description="常用控制操作">
              <div className="space-y-3">
                <button className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700">
                  <Power className="h-4 w-4 mr-2" />
                  全部启动
                </button>
                <button className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700">
                  <Power className="h-4 w-4 mr-2" />
                  全部停止
                </button>
                <button className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                  <Shield className="h-4 w-4 mr-2" />
                  安全模式
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
            <ConfigCard title="系统状态" description="控制器系统信息">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">CPU使用率</span>
                  <span className="text-sm font-medium text-gray-900">15%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{width: '15%'}}></div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">内存使用</span>
                  <span className="text-sm font-medium text-gray-900">256MB / 512MB</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{width: '50%'}}></div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">温度</span>
                  <span className="text-sm font-medium text-gray-900">42°C</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-yellow-600 h-2 rounded-full" style={{width: '60%'}}></div>
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
                    <Zap className="h-4 w-4 text-blue-500" />
                    <span className="text-sm text-gray-600">MQTT连接</span>
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
            <ConfigCard title="最近活动" description="设备操作记录">
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">通道1输出值调整为75%</p>
                    <p className="text-xs text-gray-500">2分钟前</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">安全模式已启用</p>
                    <p className="text-xs text-gray-500">5分钟前</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">温度警告：超过40°C</p>
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
