/**
 * 设备总览页面
 * 展示所有可用的IoT设备类型和产品信息
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { 
  ArrowLeft,
  BarChart3, 
  Globe, 
  Zap,
  Shield,
  ArrowRight,
  CheckCircle,
  Clock,
  Wifi,
  Cpu
} from 'lucide-react';

export const metadata: Metadata = {
  title: '设备总览 - IoT设备管理平台',
  description: '查看我们支持的所有IoT设备类型，包括智能传感器、智能网关、智能控制器和PowerSafe电源安全设备等产品。',
  keywords: '设备总览,IoT设备,智能传感器,智能网关,智能控制器,PowerSafe电源安全',
};

/**
 * 设备类型卡片
 */
function DeviceTypeCard({ 
  deviceType,
  title, 
  description, 
  icon: Icon,
  features,
  status,
  slug
}: { 
  deviceType: string;
  title: string; 
  description: string; 
  icon: any;
  features: string[];
  status: 'available' | 'coming-soon' | 'beta';
  slug: string;
}) {
  const statusConfig = {
    available: { color: 'text-green-600', bg: 'bg-green-100', text: '可用' },
    'coming-soon': { color: 'text-yellow-600', bg: 'bg-yellow-100', text: '即将推出' },
    beta: { color: 'text-blue-600', bg: 'bg-blue-100', text: '测试版' }
  };

  const config = statusConfig[status];

  return (
    <div className="group relative overflow-hidden rounded-lg border bg-white p-8 shadow-sm transition-all hover:shadow-lg">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-blue-100 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
            <Icon className="h-8 w-8" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.bg} ${config.color}`}>
                {config.text}
              </span>
            </div>
            <p className="mt-2 text-gray-600">{description}</p>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h4 className="text-sm font-medium text-gray-900 mb-3">主要特性</h4>
        <ul className="space-y-2">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center text-sm text-gray-600">
              <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <div className="flex space-x-4">
          <Link
            href={`/iot/${slug}/profile`}
            className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
          >
            查看详情
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
          {status === 'available' && (
            <Link
              href={`/iot/${slug}/dashboard`}
              className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-500"
            >
              数据大盘
            </Link>
          )}
        </div>
        {status === 'available' && (
          <Link
            href={`/iot/${slug}/manager`}
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
          >
            管理平台
          </Link>
        )}
      </div>
    </div>
  );
}

/**
 * 统计数据卡片
 */
function StatCard({ 
  number, 
  label, 
  description,
  icon: Icon
}: { 
  number: string; 
  label: string; 
  description: string;
  icon: any;
}) {
  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="flex items-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
          <Icon className="h-6 w-6" />
        </div>
        <div className="ml-4">
          <div className="text-2xl font-bold text-gray-900">{number}</div>
          <div className="text-sm font-medium text-gray-900">{label}</div>
          <div className="text-xs text-gray-500">{description}</div>
        </div>
      </div>
    </div>
  );
}

export default function IoTDevicesPage() {
  const devices = [
    {
      deviceType: 'smart-sensor',
      title: '智能传感器',
      description: '提供温度、湿度、压力、光照等多种环境监测传感器，支持实时数据采集和远程监控。',
      icon: BarChart3,
      features: [
        '支持多种传感器类型',
        '实时数据采集',
        '低功耗设计',
        '无线通信',
        '数据加密传输'
      ],
      status: 'available' as const,
      slug: 'smart-sensor'
    },
    {
      deviceType: 'smart-gateway',
      title: '智能网关',
      description: '支持多种通信协议的智能网关设备，实现设备间的互联互通和数据转发功能。',
      icon: Globe,
      features: [
        '多协议支持',
        '边缘计算能力',
        '数据预处理',
        '设备管理',
        '安全认证'
      ],
      status: 'available' as const,
      slug: 'smart-gateway'
    },
    {
      deviceType: 'smart-controller',
      title: '智能控制器',
      description: '支持远程控制和自动化操作的智能控制器，实现设备的智能化管理和控制。',
      icon: Zap,
      features: [
        '远程控制',
        '自动化操作',
        '定时任务',
        '场景联动',
        '安全保护'
      ],
      status: 'available' as const,
      slug: 'smart-controller'
    },
    {
      deviceType: 'powersafe',
      title: 'PowerSafe电源安全',
      description: '专业的智能电源安全监控设备，提供实时电源状态监测、异常预警、远程控制等功能。',
      icon: Shield,
      features: [
        '实时安全监控',
        '智能异常预警',
        '远程电源控制',
        'UPS电源管理',
        '能耗分析'
      ],
      status: 'available' as const,
      slug: 'powersafe'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* 导航栏 */}
      <nav className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-2">
                <ArrowLeft className="h-5 w-5 text-gray-500" />
                <span className="text-xl font-bold text-gray-900">IoT Platform</span>
              </Link>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link 
                  href="/" 
                  className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  首页
                </Link>
                <Link 
                  href="/about" 
                  className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  关于我们
                </Link>
                <Link 
                  href="/login" 
                  className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium"
                >
                  登录管理
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* 页面标题 */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              IoT设备总览
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              探索我们支持的各种IoT设备类型，找到最适合您需求的解决方案
            </p>
          </div>
        </div>
      </section>

      {/* 统计数据 */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard 
              number="4+" 
              label="设备类型" 
              description="支持多种IoT设备"
              icon={Cpu}
            />
            <StatCard 
              number="1000+" 
              label="活跃设备" 
              description="在线设备数量"
              icon={Wifi}
            />
            <StatCard 
              number="99.9%" 
              label="可用性" 
              description="系统稳定性"
              icon={Shield}
            />
            <StatCard 
              number="24/7" 
              label="监控服务" 
              description="全天候监控"
              icon={Clock}
            />
          </div>
        </div>
      </section>

      {/* 设备类型列表 */}
      <section className="py-20 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              设备类型
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              我们提供多种类型的IoT设备，满足不同应用场景的需求
            </p>
          </div>
          
          <div className="mt-16 space-y-8">
            {devices.map((device) => (
              <DeviceTypeCard
                key={device.deviceType}
                deviceType={device.deviceType}
                title={device.title}
                description={device.description}
                icon={device.icon}
                features={device.features}
                status={device.status}
                slug={device.slug}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 技术特性 */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              技术特性
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              我们的IoT平台提供先进的技术特性和安全保障
            </p>
          </div>
          
          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <div className="flex items-center space-x-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-green-600">
                  <Wifi className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">多协议支持</h3>
                  <p className="text-sm text-gray-600">支持MQTT、UDP、TCP、HTTP/HTTPS、WebSocket等协议</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <div className="flex items-center space-x-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                  <Shield className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">安全可靠</h3>
                  <p className="text-sm text-gray-600">企业级安全防护，数据加密传输，权限管理</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <div className="flex items-center space-x-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">实时监控</h3>
                  <p className="text-sm text-gray-600">实时数据采集、分析和可视化展示</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <div className="flex items-center space-x-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-100 text-yellow-600">
                  <Zap className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">高性能</h3>
                  <p className="text-sm text-gray-600">支持大规模设备接入，毫秒级响应</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <div className="flex items-center space-x-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-100 text-red-600">
                  <Globe className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">云端部署</h3>
                  <p className="text-sm text-gray-600">支持云端部署，弹性扩展，自动备份</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <div className="flex items-center space-x-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                  <Cpu className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">边缘计算</h3>
                  <p className="text-sm text-gray-600">支持边缘计算，本地数据处理和决策</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA区域 */}
      <section className="bg-blue-600 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              开始使用IoT设备
            </h2>
            <p className="mt-4 text-lg text-blue-100">
              选择适合您需求的设备类型，开始您的IoT之旅
            </p>
            <div className="mt-8">
              <Link
                href="/login"
                className="inline-flex items-center rounded-md bg-white px-6 py-3 text-base font-medium text-blue-600 shadow-sm hover:bg-blue-50"
              >
                登录管理平台
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 页脚 */}
      <footer className="bg-gray-900">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
            <div>
              <h3 className="text-lg font-semibold text-white">IoT Platform</h3>
              <p className="mt-2 text-sm text-gray-400">
                专业的物联网设备管理平台，为企业提供完整的IoT解决方案。
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">产品</h4>
              <ul className="mt-2 space-y-2">
                <li><Link href="/iot/smart-sensor/profile" className="text-sm text-gray-400 hover:text-white">智能传感器</Link></li>
                <li><Link href="/iot/smart-gateway/profile" className="text-sm text-gray-400 hover:text-white">智能网关</Link></li>
                <li><Link href="/iot/smart-controller/profile" className="text-sm text-gray-400 hover:text-white">智能控制器</Link></li>
                <li><Link href="/iot/powersafe/profile" className="text-sm text-gray-400 hover:text-white">PowerSafe电源安全</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">支持</h4>
              <ul className="mt-2 space-y-2">
                <li><Link href="/about" className="text-sm text-gray-400 hover:text-white">关于我们</Link></li>
                <li><Link href="/docs" className="text-sm text-gray-400 hover:text-white">文档</Link></li>
                <li><Link href="/support" className="text-sm text-gray-400 hover:text-white">技术支持</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">联系</h4>
              <ul className="mt-2 space-y-2">
                <li className="text-sm text-gray-400">邮箱: support@iot-platform.com</li>
                <li className="text-sm text-gray-400">电话: +86 400-123-4567</li>
                <li className="text-sm text-gray-400">地址: 北京市朝阳区</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-gray-800 pt-8">
            <p className="text-sm text-gray-400">
              © 2024 IoT Platform. 保留所有权利。
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}