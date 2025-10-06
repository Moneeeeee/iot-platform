/**
 * 管理后台首页
 * 展示系统概览、设备状态、用户统计等信息
 */

"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  BarChart3, 
  Users, 
  Cpu, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  Wifi,
  Battery,
  Clock,
  Settings,
  LogOut,
  Bell,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/core/auth/context';
import { useRouter } from 'next/navigation';

/**
 * 统计卡片组件
 */
function StatCard({ 
  title, 
  value, 
  change, 
  changeType,
  icon: Icon,
  color = 'blue'
}: { 
  title: string; 
  value: string | number; 
  change?: string; 
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon: any;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    red: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600'
  };

  const changeIcons = {
    increase: <TrendingUp className="h-4 w-4 text-green-500" />,
    decrease: <TrendingDown className="h-4 w-4 text-red-500" />,
    neutral: <div className="h-4 w-4 rounded-full bg-gray-400" />
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {change && (
              <div className="flex items-center mt-1">
                {changeIcons[changeType || 'neutral']}
                <span className={`text-sm ml-1 ${
                  changeType === 'increase' ? 'text-green-600' : 
                  changeType === 'decrease' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {change}
                </span>
              </div>
            )}
          </div>
          <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 设备状态组件
 */
function DeviceStatusCard() {
  const devices = [
    { name: '智能传感器-001', status: 'online', battery: 85, lastSeen: '2分钟前' },
    { name: '智能网关-001', status: 'online', battery: 92, lastSeen: '1分钟前' },
    { name: '智能控制器-001', status: 'offline', battery: 15, lastSeen: '1小时前' },
    { name: '智能传感器-002', status: 'warning', battery: 25, lastSeen: '5分钟前' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-600 bg-green-100';
      case 'offline': return 'text-red-600 bg-red-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return '在线';
      case 'offline': return '离线';
      case 'warning': return '警告';
      default: return '未知';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Cpu className="h-5 w-5 mr-2" />
          设备状态
        </CardTitle>
        <CardDescription>最近活跃的设备列表</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {devices.map((device, index) => (
            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                  <Cpu className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{device.name}</p>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(device.status)}`}>
                      {getStatusText(device.status)}
                    </span>
                    <span className="text-xs text-gray-500">{device.lastSeen}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  <Battery className="h-3 w-3" />
                  <span>{device.battery}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <Link
            href="/dashboard/devices"
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            查看所有设备 →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 告警信息组件
 */
function AlertCard() {
  const alerts = [
    { type: 'error', message: '智能控制器-001 离线', time: '5分钟前' },
    { type: 'warning', message: '智能传感器-002 电池电量低', time: '10分钟前' },
    { type: 'info', message: '系统更新完成', time: '1小时前' }
  ];

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info': return <Activity className="h-4 w-4 text-blue-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Bell className="h-5 w-5 mr-2" />
          系统告警
        </CardTitle>
        <CardDescription>最近的系统告警和通知</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.map((alert, index) => (
            <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
              {getAlertIcon(alert.type)}
              <div className="flex-1">
                <p className="text-sm text-gray-900">{alert.message}</p>
                <p className="text-xs text-gray-500">{alert.time}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <Link
            href="/dashboard/alerts"
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            查看所有告警 →
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (!user) {
    return null; // 或者显示加载状态
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <nav className="bg-white border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">IoT Platform</h1>
            </div>
            
            {/* 搜索框 */}
            <div className="flex-1 max-w-lg mx-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="搜索设备、用户或配置..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <Bell className="h-4 w-4" />
              </Button>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">欢迎，{user.username}</span>
                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                  user.role === 'ADMIN' ? 'bg-red-100 text-red-800' :
                  user.role === 'OPERATOR' ? 'bg-blue-100 text-blue-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {user.role === 'ADMIN' ? '管理员' :
                   user.role === 'OPERATOR' ? '操作员' : '查看者'}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* 侧边栏导航 */}
      <div className="flex">
        <div className="w-64 bg-white border-r min-h-screen">
          <nav className="p-4 space-y-2">
            <Link
              href="/dashboard"
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md"
            >
              <BarChart3 className="h-4 w-4" />
              <span>仪表板</span>
            </Link>
            <Link
              href="/dashboard/devices"
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md"
            >
              <Cpu className="h-4 w-4" />
              <span>设备管理</span>
            </Link>
            <Link
              href="/dashboard/users"
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md"
            >
              <Users className="h-4 w-4" />
              <span>用户管理</span>
            </Link>
            <Link
              href="/dashboard/alerts"
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md"
            >
              <AlertTriangle className="h-4 w-4" />
              <span>告警管理</span>
            </Link>
            <Link
              href="/dashboard/settings"
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md"
            >
              <Settings className="h-4 w-4" />
              <span>系统设置</span>
            </Link>
          </nav>
        </div>

        {/* 主要内容区域 */}
        <div className="flex-1 p-8">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">仪表板</h2>
            <p className="text-gray-600">系统概览和关键指标</p>
          </div>

          {/* 统计卡片 */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <StatCard
              title="总设备数"
              value="156"
              change="+12"
              changeType="increase"
              icon={Cpu}
              color="blue"
            />
            <StatCard
              title="在线设备"
              value="142"
              change="+8"
              changeType="increase"
              icon={Wifi}
              color="green"
            />
            <StatCard
              title="活跃用户"
              value="23"
              change="+3"
              changeType="increase"
              icon={Users}
              color="purple"
            />
            <StatCard
              title="系统告警"
              value="5"
              change="-2"
              changeType="decrease"
              icon={AlertTriangle}
              color="yellow"
            />
          </div>

          {/* 图表和详细信息 */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <DeviceStatusCard />
            <AlertCard />
          </div>
        </div>
      </div>
    </div>
  );
}
