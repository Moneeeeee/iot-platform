/**
 * 关于我们页面
 * 展示公司信息、团队介绍和发展历程
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { 
  ArrowLeft,
  Users, 
  Target, 
  Award, 
  Globe,
  Heart,
  Lightbulb,
  Shield
} from 'lucide-react';

export const metadata: Metadata = {
  title: '关于我们 - IoT设备管理平台',
  description: '了解我们的团队、使命和愿景，致力于为全球企业提供专业的物联网解决方案。',
  keywords: '关于我们,团队介绍,公司使命,物联网解决方案',
};

/**
 * 团队成员卡片
 */
function TeamMemberCard({ 
  name, 
  role, 
  description, 
  avatar 
}: { 
  name: string; 
  role: string; 
  description: string; 
  avatar: string; 
}) {
  return (
    <div className="text-center">
      <div className="mx-auto h-24 w-24 overflow-hidden rounded-full bg-gray-200">
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600 text-white text-2xl font-bold">
          {name.charAt(0)}
        </div>
      </div>
      <h3 className="mt-4 text-lg font-semibold text-gray-900">{name}</h3>
      <p className="text-sm text-blue-600">{role}</p>
      <p className="mt-2 text-sm text-gray-600">{description}</p>
    </div>
  );
}

/**
 * 价值观卡片
 */
function ValueCard({ 
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

export default function AboutPage() {
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
                  href="/iot" 
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

      {/* 页面标题 */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              关于我们
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              致力于为全球企业提供专业的物联网解决方案
            </p>
          </div>
        </div>
      </section>

      {/* 公司介绍 */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-gray-900">
                我们的故事
              </h2>
              <p className="mt-6 text-lg text-gray-600">
                IoT Platform成立于2020年，是一家专注于物联网设备管理平台开发的高科技公司。
                我们致力于为企业提供完整、安全、高效的IoT解决方案，帮助客户实现数字化转型。
              </p>
              <p className="mt-4 text-lg text-gray-600">
                经过多年的技术积累和产品迭代，我们已经为超过1000家企业提供了专业的IoT服务，
                涵盖制造业、智慧城市、农业、医疗等多个领域。
              </p>
              <div className="mt-8">
                <Link
                  href="/iot"
                  className="inline-flex items-center rounded-md bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
                >
                  查看我们的产品
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-w-16 aspect-h-9 rounded-lg bg-gray-200">
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600 text-white">
                  <div className="text-center">
                    <Globe className="mx-auto h-16 w-16" />
                    <p className="mt-4 text-lg font-semibold">全球服务</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 使命愿景 */}
      <section className="py-20 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              使命与愿景
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              我们的核心价值观驱动着我们的每一个决策和行动
            </p>
          </div>
          
          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <ValueCard
              icon={Target}
              title="使命"
              description="让物联网技术更简单、更安全、更高效，为全球企业创造价值"
            />
            <ValueCard
              icon={Lightbulb}
              title="愿景"
              description="成为全球领先的物联网平台服务提供商，推动产业数字化转型"
            />
            <ValueCard
              icon={Heart}
              title="价值观"
              description="以客户为中心，追求卓越，持续创新，诚信合作"
            />
            <ValueCard
              icon={Shield}
              title="承诺"
              description="提供安全可靠的产品和服务，保护客户数据安全"
            />
          </div>
        </div>
      </section>

      {/* 团队介绍 */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              我们的团队
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              由经验丰富的技术专家和行业专家组成的专业团队
            </p>
          </div>
          
          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <TeamMemberCard
              name="张明"
              role="首席执行官"
              description="拥有15年物联网行业经验，曾任职于知名科技公司"
            />
            <TeamMemberCard
              name="李华"
              role="技术总监"
              description="资深架构师，专注于分布式系统和云计算技术"
            />
            <TeamMemberCard
              name="王芳"
              role="产品总监"
              description="产品设计专家，深度理解用户需求和市场趋势"
            />
            <TeamMemberCard
              name="刘强"
              role="运营总监"
              description="运营管理专家，负责公司整体运营和客户服务"
            />
          </div>
        </div>
      </section>

      {/* 发展历程 */}
      <section className="py-20 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              发展历程
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              从初创公司到行业领先者的成长轨迹
            </p>
          </div>
          
          <div className="mt-16">
            <div className="flow-root">
              <ul className="-mb-8">
                <li>
                  <div className="relative pb-8">
                    <div className="relative flex space-x-3">
                      <div>
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white">
                          <Award className="h-4 w-4" />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div>
                          <div className="text-sm">
                            <span className="font-medium text-gray-900">2020年</span>
                          </div>
                          <p className="mt-1 text-sm text-gray-600">
                            公司成立，专注于IoT设备管理平台研发
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
                <li>
                  <div className="relative pb-8">
                    <div className="relative flex space-x-3">
                      <div>
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white">
                          <Users className="h-4 w-4" />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div>
                          <div className="text-sm">
                            <span className="font-medium text-gray-900">2021年</span>
                          </div>
                          <p className="mt-1 text-sm text-gray-600">
                            完成首轮融资，团队扩展到50人
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
                <li>
                  <div className="relative pb-8">
                    <div className="relative flex space-x-3">
                      <div>
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white">
                          <Globe className="h-4 w-4" />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div>
                          <div className="text-sm">
                            <span className="font-medium text-gray-900">2022年</span>
                          </div>
                          <p className="mt-1 text-sm text-gray-600">
                            产品正式上线，服务客户超过100家
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
                <li>
                  <div className="relative">
                    <div className="relative flex space-x-3">
                      <div>
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white">
                          <Award className="h-4 w-4" />
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div>
                          <div className="text-sm">
                            <span className="font-medium text-gray-900">2024年</span>
                          </div>
                          <p className="mt-1 text-sm text-gray-600">
                            获得行业认可，服务客户超过1000家
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 联系我们 */}
      <section className="bg-blue-600 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              加入我们
            </h2>
            <p className="mt-4 text-lg text-blue-100">
              如果您对我们的产品感兴趣，或者想要加入我们的团队，欢迎联系我们
            </p>
            <div className="mt-8">
              <Link
                href="/contact"
                className="inline-flex items-center rounded-md bg-white px-6 py-3 text-base font-medium text-blue-600 shadow-sm hover:bg-blue-50"
              >
                联系我们
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
              <h4 className="text-sm font-semibold text-white">公司</h4>
              <ul className="mt-2 space-y-2">
                <li><Link href="/about" className="text-sm text-gray-400 hover:text-white">关于我们</Link></li>
                <li><Link href="/careers" className="text-sm text-gray-400 hover:text-white">招聘信息</Link></li>
                <li><Link href="/news" className="text-sm text-gray-400 hover:text-white">新闻动态</Link></li>
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