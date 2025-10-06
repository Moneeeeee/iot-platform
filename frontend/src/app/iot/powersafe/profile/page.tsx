/**
 * PowerSafe设备简介页面
 * 展示PowerSafe智能电源安全设备的详细信息
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { 
  ArrowLeft,
  Shield,
  Zap,
  Battery,
  AlertTriangle,
  CheckCircle,
  Clock,
  Wifi,
  Cpu,
  BarChart3,
  Settings,
  Monitor,
  ArrowRight,
  Play,
  Download,
  Star
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'PowerSafe智能电源安全设备 - IoT设备管理平台',
  description: 'PowerSafe是一款专业的智能电源安全监控设备，提供实时电源状态监测、异常预警、远程控制等功能，保障用电安全。',
  keywords: 'PowerSafe,智能电源,电源安全,用电监控,电源管理,IoT设备',
};

/**
 * 特性卡片组件
 */
function FeatureCard({ 
  icon: Icon, 
  title, 
  description, 
  highlight = false 
}: { 
  icon: any; 
  title: string; 
  description: string; 
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-6 transition-all hover:shadow-lg ${highlight ? 'bg-blue-50 border-blue-200' : 'bg-white'}`}>
      <div className="flex items-center space-x-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${highlight ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
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
  unit, 
  description 
}: { 
  title: string; 
  value: string; 
  unit?: string; 
  description: string; 
}) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="text-center">
        <div className="text-2xl font-bold text-gray-900">
          {value}
          {unit && <span className="text-sm font-normal text-gray-500 ml-1">{unit}</span>}
        </div>
        <div className="text-sm font-medium text-gray-900 mt-1">{title}</div>
        <div className="text-xs text-gray-500 mt-1">{description}</div>
      </div>
    </div>
  );
}

export default function PowerSafeProfilePage() {
  const features = [
    {
      icon: Shield,
      title: '实时安全监控',
      description: '24/7不间断监控电源状态，实时检测电压、电流、功率等关键参数',
      highlight: true
    },
    {
      icon: AlertTriangle,
      title: '智能异常预警',
      description: '基于AI算法的异常检测，提前预警潜在的安全隐患',
      highlight: true
    },
    {
      icon: Zap,
      title: '远程电源控制',
      description: '支持远程开关控制，紧急情况下可快速切断电源',
      highlight: true
    },
    {
      icon: Battery,
      title: 'UPS电源管理',
      description: '集成UPS电源监控，确保关键设备不间断供电',
      highlight: false
    },
    {
      icon: BarChart3,
      title: '能耗分析',
      description: '详细的用电数据分析和能耗报告，优化用电效率',
      highlight: false
    },
    {
      icon: Settings,
      title: '智能配置',
      description: '支持多种配置模式，适应不同应用场景需求',
      highlight: false
    }
  ];

  const specifications = [
    { title: '工作电压', value: '220V', unit: 'AC', description: '标准市电电压' },
    { title: '最大电流', value: '63', unit: 'A', description: '单相最大承载电流' },
    { title: '功率范围', value: '0-13.86', unit: 'kW', description: '监控功率范围' },
    { title: '精度等级', value: '0.5', unit: '级', description: '测量精度等级' },
    { title: '响应时间', value: '<100', unit: 'ms', description: '异常响应时间' },
    { title: '工作温度', value: '-20~60', unit: '°C', description: '工作环境温度' },
    { title: '防护等级', value: 'IP65', unit: '', description: '防尘防水等级' },
    { title: '通信接口', value: 'WiFi/4G', unit: '', description: '无线通信方式' }
  ];

  const applications = [
    {
      title: '数据中心',
      description: '保障服务器和网络设备的安全供电，防止因电源问题导致的数据丢失',
      icon: Monitor
    },
    {
      title: '工业控制',
      description: '监控生产线设备的电源状态，确保生产安全和设备稳定运行',
      icon: Settings
    },
    {
      title: '智能建筑',
      description: '楼宇电源系统监控，实现智能用电管理和节能优化',
      icon: Zap
    },
    {
      title: '医疗设备',
      description: '保障医疗设备的稳定供电，确保患者安全和设备可靠性',
      icon: Shield
    }
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
                  href="/iot/powersafe/dashboard" 
                  className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  数据大屏
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
        </div>
      </nav>

      {/* 页面标题 */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-blue-600 text-white">
                <Shield className="h-8 w-8" />
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                PowerSafe
              </h1>
            </div>
            <p className="mt-4 text-xl text-gray-600">
              智能电源安全监控设备
            </p>
            <p className="mt-2 text-lg text-gray-500">
              专业的电源安全解决方案，保障您的用电安全
            </p>
          </div>
        </div>
      </section>

      {/* 产品概述 */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                产品概述
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                PowerSafe是一款专业的智能电源安全监控设备，集成了先进的传感器技术和AI算法，
                能够实时监控电源状态，及时发现异常情况，并提供智能预警和远程控制功能。
              </p>
              <p className="mt-4 text-gray-600">
                该设备适用于数据中心、工业控制、智能建筑、医疗设备等多种场景，
                为用户提供全方位的电源安全保障。
              </p>
              <div className="mt-8 flex space-x-4">
                <Link
                  href="/iot/powersafe/dashboard"
                  className="inline-flex items-center rounded-md bg-blue-600 px-6 py-3 text-base font-medium text-white shadow-sm hover:bg-blue-500"
                >
                  <Play className="mr-2 h-4 w-4" />
                  查看数据大屏
                </Link>
                <Link
                  href="/iot/powersafe/manager"
                  className="inline-flex items-center rounded-md border border-gray-300 bg-white px-6 py-3 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  进入管理平台
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-lg bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center">
                <div className="text-center">
                  <Shield className="h-24 w-24 text-blue-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900">PowerSafe</h3>
                  <p className="text-gray-600">智能电源安全设备</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 核心特性 */}
      <section className="py-20 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              核心特性
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              PowerSafe提供全面的电源安全监控和管理功能
            </p>
          </div>
          
          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <FeatureCard
                key={index}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                highlight={feature.highlight}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 技术规格 */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              技术规格
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              详细的技术参数和性能指标
            </p>
          </div>
          
          <div className="mt-16 grid grid-cols-2 gap-6 sm:grid-cols-4 lg:grid-cols-8">
            {specifications.map((spec, index) => (
              <SpecCard
                key={index}
                title={spec.title}
                value={spec.value}
                unit={spec.unit}
                description={spec.description}
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
              适用于多种行业和应用场景
            </p>
          </div>
          
          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {applications.map((app, index) => (
              <div key={index} className="rounded-lg border bg-white p-6 shadow-sm">
                <div className="flex items-center space-x-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                    <app.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{app.title}</h3>
                    <p className="text-sm text-gray-600">{app.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 优势对比 */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              产品优势
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              相比传统电源监控方案的优势
            </p>
          </div>
          
          <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="rounded-lg border bg-white p-8 shadow-sm">
              <div className="flex items-center space-x-4 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-green-600">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">智能化监控</h3>
              </div>
              <ul className="space-y-3">
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  AI算法异常检测
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  实时数据采集
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  智能预警系统
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  远程控制功能
                </li>
              </ul>
            </div>

            <div className="rounded-lg border bg-white p-8 shadow-sm">
              <div className="flex items-center space-x-4 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                  <Clock className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">高可靠性</h3>
              </div>
              <ul className="space-y-3">
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  24/7不间断监控
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  毫秒级响应时间
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  多重安全保护
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  自动故障恢复
                </li>
              </ul>
            </div>

            <div className="rounded-lg border bg-white p-8 shadow-sm">
              <div className="flex items-center space-x-4 mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                  <Wifi className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">易于部署</h3>
              </div>
              <ul className="space-y-3">
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  即插即用设计
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  无线通信支持
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  云端管理平台
                </li>
                <li className="flex items-center text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  移动端应用
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA区域 */}
      <section className="bg-blue-600 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              开始使用PowerSafe
            </h2>
            <p className="mt-4 text-lg text-blue-100">
              体验专业的电源安全监控解决方案
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/iot/powersafe/dashboard"
                className="inline-flex items-center rounded-md bg-white px-6 py-3 text-base font-medium text-blue-600 shadow-sm hover:bg-blue-50"
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                查看数据大屏
              </Link>
              <Link
                href="/iot/powersafe/manager"
                className="inline-flex items-center rounded-md border border-white px-6 py-3 text-base font-medium text-white hover:bg-blue-700"
              >
                <Settings className="mr-2 h-4 w-4" />
                进入管理平台
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
