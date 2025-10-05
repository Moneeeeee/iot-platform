/**
 * 智能传感器设备介绍页面
 * 展示智能传感器的详细信息、技术规格和应用场景
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
  Shield,
  Battery,
  Clock,
  CheckCircle,
  ArrowRight,
  Play,
  Download,
  ExternalLink
} from 'lucide-react';

export const metadata: Metadata = {
  title: '智能传感器 - IoT设备管理平台',
  description: '了解智能传感器的技术规格、功能特性和应用场景，支持温度、湿度、压力、光照等多种环境监测。',
  keywords: '智能传感器,温度传感器,湿度传感器,压力传感器,光照传感器,IoT传感器',
};

/**
 * 特性卡片组件
 */
function FeatureCard({ 
  icon: Icon, 
  title, 
  description 
}: { 
  icon: any; 
  title: string; 
  description: string; 
}) {
  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="flex items-center space-x-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * 规格参数组件
 */
function SpecCard({ 
  title, 
  value, 
  unit 
}: { 
  title: string; 
  value: string; 
  unit?: string; 
}) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <div className="text-center">
        <div className="text-2xl font-bold text-blue-600">
          {value}{unit && <span className="text-sm text-gray-500 ml-1">{unit}</span>}
        </div>
        <div className="text-sm font-medium text-gray-900 mt-1">{title}</div>
      </div>
    </div>
  );
}

export default function SmartSensorProfilePage() {
  const sensorTypes = [
    { name: '温度传感器', icon: Thermometer, description: '测量环境温度，精度±0.1°C' },
    { name: '湿度传感器', icon: Droplets, description: '测量相对湿度，精度±2%RH' },
    { name: '压力传感器', icon: Gauge, description: '测量大气压力，精度±1hPa' },
    { name: '光照传感器', icon: Sun, description: '测量光照强度，范围0-100,000lux' }
  ];

  const features = [
    {
      icon: Wifi,
      title: '无线通信',
      description: '支持WiFi、蓝牙、LoRa等多种无线通信方式'
    },
    {
      icon: Battery,
      title: '低功耗设计',
      description: '超低功耗设计，电池续航可达2年以上'
    },
    {
      icon: Shield,
      title: '数据加密',
      description: '采用AES-256加密算法，确保数据传输安全'
    },
    {
      icon: Clock,
      title: '实时监测',
      description: '支持1秒到1小时的采样间隔设置'
    }
  ];

  const applications = [
    '智能家居环境监测',
    '农业大棚温湿度控制',
    '工业设备状态监控',
    '仓储环境管理',
    '实验室环境监测',
    '办公楼空气质量监测'
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* 导航栏 */}
      <nav className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <Link href="/iot" className="flex items-center space-x-2">
                <ArrowLeft className="h-5 w-5 text-gray-500" />
                <span className="text-xl font-bold text-gray-900">IoT Platform</span>
              </Link>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link 
                  href="/iot" 
                  className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  设备总览
                </Link>
                <Link 
                  href="/iot/smart-sensor/dashboard" 
                  className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  数据大盘
                </Link>
                <Link 
                  href="/iot/smart-sensor/manager" 
                  className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium"
                >
                  管理平台
                </Link>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* 页面标题 */}
      <section className="bg-gradient-to-br from-green-50 to-emerald-100 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-green-600">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                  智能传感器
                </span>
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                智能传感器系列
              </h1>
              <p className="mt-4 text-lg text-gray-600">
                高精度、低功耗的智能传感器设备，支持温度、湿度、压力、光照等多种环境参数监测，
                为您的IoT应用提供可靠的数据采集解决方案。
              </p>
              <div className="mt-8 flex space-x-4">
                <Link
                  href="/iot/smart-sensor/dashboard"
                  className="inline-flex items-center rounded-md bg-green-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-green-500"
                >
                  查看数据大盘
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link
                  href="/iot/smart-sensor/manager"
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50"
                >
                  管理平台
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-w-16 aspect-h-9 rounded-lg bg-gray-200">
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-green-400 to-green-600 text-white">
                  <div className="text-center">
                    <BarChart3 className="mx-auto h-24 w-24" />
                    <p className="mt-4 text-xl font-semibold">智能传感器</p>
                    <p className="text-sm opacity-90">多参数环境监测</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 传感器类型 */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              传感器类型
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              支持多种环境参数监测，满足不同应用场景需求
            </p>
          </div>
          
          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {sensorTypes.map((sensor, index) => (
              <div key={index} className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
                  <sensor.icon className="h-8 w-8" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">{sensor.name}</h3>
                <p className="mt-2 text-sm text-gray-600">{sensor.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 技术规格 */}
      <section className="py-20 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              技术规格
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              高性能、高精度的技术参数
            </p>
          </div>
          
          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <SpecCard title="工作温度" value="-40" unit="°C ~ +85°C" />
            <SpecCard title="工作湿度" value="0" unit="% ~ 100% RH" />
            <SpecCard title="供电电压" value="2.7" unit="V ~ 3.6V" />
            <SpecCard title="功耗" value="< 1" unit="mW" />
            <SpecCard title="通信距离" value="100" unit="m" />
            <SpecCard title="数据精度" value="16" unit="bit" />
            <SpecCard title="采样频率" value="1" unit="Hz ~ 3600Hz" />
            <SpecCard title="存储容量" value="4" unit="MB" />
          </div>
        </div>
      </section>

      {/* 核心特性 */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              核心特性
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              先进的技术特性，确保设备稳定可靠运行
            </p>
          </div>
          
          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <FeatureCard
                key={index}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 应用场景 */}
      <section className="py-20 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              应用场景
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              广泛应用于各种环境监测场景
            </p>
          </div>
          
          <div className="mt-16">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {applications.map((application, index) => (
                <div key={index} className="flex items-center space-x-3 rounded-lg border bg-white p-4 shadow-sm">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-900">{application}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 资源下载 */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              资源下载
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              获取技术文档、SDK和开发工具
            </p>
          </div>
          
          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <div className="flex items-center space-x-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                  <Download className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">技术文档</h3>
                  <p className="text-sm text-gray-600">详细的技术规格和使用说明</p>
                </div>
              </div>
              <div className="mt-4">
                <button className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500">
                  下载文档
                  <ExternalLink className="ml-1 h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <div className="flex items-center space-x-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-green-600">
                  <Play className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">SDK开发包</h3>
                  <p className="text-sm text-gray-600">支持多种编程语言的SDK</p>
                </div>
              </div>
              <div className="mt-4">
                <button className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500">
                  下载SDK
                  <ExternalLink className="ml-1 h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="rounded-lg border bg-white p-6 shadow-sm">
              <div className="flex items-center space-x-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">示例代码</h3>
                  <p className="text-sm text-gray-600">快速上手的示例代码</p>
                </div>
              </div>
              <div className="mt-4">
                <button className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500">
                  查看示例
                  <ExternalLink className="ml-1 h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA区域 */}
      <section className="bg-green-600 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              开始使用智能传感器
            </h2>
            <p className="mt-4 text-lg text-green-100">
              立即体验智能传感器的强大功能，为您的IoT应用提供可靠的数据支持
            </p>
            <div className="mt-8 flex items-center justify-center space-x-4">
              <Link
                href="/iot/smart-sensor/dashboard"
                className="inline-flex items-center rounded-md bg-white px-6 py-3 text-base font-medium text-green-600 shadow-sm hover:bg-green-50"
              >
                查看数据大盘
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="/iot/smart-sensor/manager"
                className="inline-flex items-center rounded-md border border-white px-6 py-3 text-base font-medium text-white hover:bg-green-700"
              >
                管理平台
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
