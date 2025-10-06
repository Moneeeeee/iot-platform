/**
 * 公开主页
 * 从原有的page.tsx迁移过来
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { 
  ArrowRight, 
  Shield, 
  Zap, 
  Globe, 
  BarChart3, 
  Smartphone,
  Cloud,
  Lock
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'IoT设备管理平台 - 专业的物联网解决方案',
  description: '提供完整的IoT设备管理、实时监控、数据分析和智能控制功能，支持MQTT、UDP、WebSocket等多种通信协议。',
  keywords: 'IoT,物联网,设备管理,MQTT,实时监控,数据分析',
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
    <div className="group relative overflow-hidden rounded-lg border bg-white p-6 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center space-x-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600 transition-colors group-hover:bg-blue-600 group-hover:text-white">
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
 * 统计数据组件
 */
function StatCard({ 
  number, 
  label, 
  description 
}: { 
  number: string; 
  label: string; 
  description: string; 
}) {
  return (
    <div className="text-center">
      <div className="text-3xl font-bold text-blue-600">{number}</div>
      <div className="text-sm font-medium text-gray-900">{label}</div>
      <div className="text-xs text-gray-500">{description}</div>
    </div>
  );
}

export default function PublicHomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* 导航栏 */}
      <nav className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-gray-900">IoT Platform</h1>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link 
                  href="/about" 
                  className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  关于我们
                </Link>
                <Link 
                  href="/default/console" 
                  className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  设备总览
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

      {/* 英雄区域 */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              专业的IoT设备管理平台
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
              提供完整的物联网设备管理、实时监控、数据分析和智能控制功能，
              支持多种通信协议，助力企业数字化转型。
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                href="/default/console"
                className="rounded-md bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                查看设备
                <ArrowRight className="ml-2 inline h-4 w-4" />
              </Link>
              <Link
                href="/about"
                className="text-sm font-semibold leading-6 text-gray-900 hover:text-gray-700"
              >
                了解更多 <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 统计数据 */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard 
              number="1000+" 
              label="设备支持" 
              description="支持多种IoT设备类型" 
            />
            <StatCard 
              number="99.9%" 
              label="系统可用性" 
              description="高可用性保障" 
            />
            <StatCard 
              number="24/7" 
              label="实时监控" 
              description="全天候设备监控" 
            />
            <StatCard 
              number="5ms" 
              label="响应时间" 
              description="极低延迟通信" 
            />
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
              为您的IoT设备提供全方位的管理解决方案
            </p>
          </div>
          
          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={Globe}
              title="多协议支持"
              description="支持MQTT、UDP、TCP、HTTP/HTTPS、WebSocket等多种通信协议"
            />
            <FeatureCard
              icon={BarChart3}
              title="实时数据分析"
              description="提供实时数据监控、图表展示和智能分析功能"
            />
            <FeatureCard
              icon={Shield}
              title="安全可靠"
              description="企业级安全防护，支持用户认证和权限管理"
            />
            <FeatureCard
              icon={Zap}
              title="高性能"
              description="支持大规模设备接入，提供毫秒级响应速度"
            />
            <FeatureCard
              icon={Smartphone}
              title="移动端支持"
              description="响应式设计，支持手机、平板等移动设备访问"
            />
            <FeatureCard
              icon={Cloud}
              title="云端部署"
              description="支持云端部署，提供弹性扩展和自动备份"
            />
          </div>
        </div>
      </section>

      {/* 产品展示 */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              产品系列
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              覆盖各种IoT应用场景的完整产品线
            </p>
          </div>
          
          <div className="mt-16 grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* 智能传感器 */}
            <div className="group relative overflow-hidden rounded-lg border bg-white p-8 shadow-sm transition-all hover:shadow-lg">
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
                  <BarChart3 className="h-8 w-8" />
                </div>
                <h3 className="mt-4 text-xl font-semibold text-gray-900">智能传感器</h3>
                <p className="mt-2 text-gray-600">
                  温度、湿度、压力、光照等多种传感器设备，提供精确的环境监测数据
                </p>
                <div className="mt-6">
                  <Link
                    href="/default/iot/smart-sensor/profile"
                    className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
                  >
                    了解更多
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>

            {/* 智能网关 */}
            <div className="group relative overflow-hidden rounded-lg border bg-white p-8 shadow-sm transition-all hover:shadow-lg">
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <Globe className="h-8 w-8" />
                </div>
                <h3 className="mt-4 text-xl font-semibold text-gray-900">智能网关</h3>
                <p className="mt-2 text-gray-600">
                  支持多种通信协议的智能网关，实现设备间的互联互通和数据转发
                </p>
                <div className="mt-6">
                  <Link
                    href="/default/iot/smart-gateway/profile"
                    className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
                  >
                    了解更多
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>

            {/* 智能控制器 */}
            <div className="group relative overflow-hidden rounded-lg border bg-white p-8 shadow-sm transition-all hover:shadow-lg">
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                  <Zap className="h-8 w-8" />
                </div>
                <h3 className="mt-4 text-xl font-semibold text-gray-900">智能控制器</h3>
                <p className="mt-2 text-gray-600">
                  支持远程控制和自动化操作的智能控制器，实现设备的智能化管理
                </p>
                <div className="mt-6">
                  <Link
                    href="/default/iot/smart-controller/profile"
                    className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
                  >
                    了解更多
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
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
              开始您的IoT之旅
            </h2>
            <p className="mt-4 text-lg text-blue-100">
              立即体验专业的IoT设备管理平台，提升您的业务效率
            </p>
            <div className="mt-8">
              <Link
                href="/login"
                className="inline-flex items-center rounded-md bg-white px-6 py-3 text-base font-medium text-blue-600 shadow-sm hover:bg-blue-50"
              >
                立即开始
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
                <li><Link href="/default/iot/smart-sensor/profile" className="text-sm text-gray-400 hover:text-white">智能传感器</Link></li>
                <li><Link href="/default/iot/smart-gateway/profile" className="text-sm text-gray-400 hover:text-white">智能网关</Link></li>
                <li><Link href="/default/iot/smart-controller/profile" className="text-sm text-gray-400 hover:text-white">智能控制器</Link></li>
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
