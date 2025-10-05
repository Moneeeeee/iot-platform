/**
 * 智能网关设备配置页面
 * 显示网关详细信息、网络配置和系统设置
 */

"use client";

import Link from 'next/link';
import { 
  ArrowLeft,
  Settings,
  Info,
  Shield,
  Wifi,
  Router,
  Network,
  Database,
  Clock,
  MapPin,
  Tag,
  Edit,
  Save,
  RefreshCw,
  Download,
  Upload,
  Server
} from 'lucide-react';

/**
 * 信息卡片组件
 */
function InfoCard({ 
  title, 
  children,
  icon: Icon
}: { 
  title: string; 
  children: React.ReactNode;
  icon: any;
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Icon className="h-5 w-5 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}

/**
 * 配置项组件
 */
function ConfigItem({ 
  label, 
  value, 
  type = "text",
  options,
  onChange,
  editable = false
}: { 
  label: string; 
  value: string | number;
  type?: "text" | "number" | "select" | "textarea";
  options?: { value: string; label: string }[];
  onChange?: (value: string) => void;
  editable?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
      <label className="text-sm font-medium text-gray-600">{label}</label>
      <div className="flex items-center space-x-2">
        {editable ? (
          type === "select" ? (
            <select 
              value={value} 
              onChange={(e) => onChange?.(e.target.value)}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : type === "textarea" ? (
            <textarea 
              value={value} 
              onChange={(e) => onChange?.(e.target.value)}
              rows={3}
              className="w-64 px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          ) : (
            <input 
              type={type}
              value={value} 
              onChange={(e) => onChange?.(e.target.value)}
              className="w-32 px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )
        ) : (
          <span className="text-sm text-gray-900">{value}</span>
        )}
        {editable && (
          <button className="p-1 text-gray-400 hover:text-gray-600">
            <Edit className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * 智能网关配置页面
 */
export default function SmartGatewayProfilePage() {
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
              <h1 className="text-xl font-semibold text-gray-900">智能网关配置</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <RefreshCw className="h-4 w-4 mr-1" />
                刷新
              </button>
              <button className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <Save className="h-4 w-4 mr-1" />
                保存配置
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧：基本信息 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 设备基本信息 */}
            <InfoCard title="设备基本信息" icon={Info}>
              <div className="space-y-1">
                <ConfigItem label="网关ID" value="GW-001" />
                <ConfigItem label="网关名称" value="智能网关-001" editable />
                <ConfigItem label="设备类型" value="智能网关" />
                <ConfigItem label="型号" value="SG-5000" />
                <ConfigItem label="序列号" value="SN2024002001" />
                <ConfigItem label="固件版本" value="v3.2.1" />
                <ConfigItem label="硬件版本" value="v2.1" />
                <ConfigItem label="制造商" value="IoT Solutions Inc." />
                <ConfigItem label="生产日期" value="2024-02-01" />
                <ConfigItem label="安装日期" value="2024-02-10" />
              </div>
            </InfoCard>

            {/* 网络配置 */}
            <InfoCard title="网络配置" icon={Wifi}>
              <div className="space-y-1">
                <ConfigItem label="IP地址" value="192.168.1.200" editable />
                <ConfigItem label="子网掩码" value="255.255.255.0" editable />
                <ConfigItem label="网关地址" value="192.168.1.1" editable />
                <ConfigItem label="DNS服务器" value="8.8.8.8" editable />
                <ConfigItem label="MAC地址" value="00:1B:44:11:3A:C8" />
                <ConfigItem label="连接类型" value="以太网" 
                  type="select"
                  options={[
                    { value: "ethernet", label: "以太网" },
                    { value: "wifi", label: "WiFi" },
                    { value: "cellular", label: "蜂窝网络" }
                  ]}
                  editable
                />
                <ConfigItem label="网络速度" value="1000 Mbps" />
                <ConfigItem label="连接状态" value="已连接" />
              </div>
            </InfoCard>

            {/* 协议配置 */}
            <InfoCard title="协议配置" icon={Network}>
              <div className="space-y-1">
                <ConfigItem label="主要协议" value="MQTT" 
                  type="select"
                  options={[
                    { value: "mqtt", label: "MQTT" },
                    { value: "http", label: "HTTP/HTTPS" },
                    { value: "coap", label: "CoAP" },
                    { value: "modbus", label: "Modbus TCP" }
                  ]}
                  editable
                />
                <ConfigItem label="MQTT端口" value="1883" type="number" editable />
                <ConfigItem label="HTTP端口" value="8080" type="number" editable />
                <ConfigItem label="CoAP端口" value="5683" type="number" editable />
                <ConfigItem label="Modbus端口" value="502" type="number" editable />
                <ConfigItem label="SSL/TLS" value="启用" 
                  type="select"
                  options={[
                    { value: "enabled", label: "启用" },
                    { value: "disabled", label: "禁用" }
                  ]}
                  editable
                />
                <ConfigItem label="数据压缩" value="启用" 
                  type="select"
                  options={[
                    { value: "enabled", label: "启用" },
                    { value: "disabled", label: "禁用" }
                  ]}
                  editable
                />
                <ConfigItem label="最大连接数" value="100" type="number" editable />
              </div>
            </InfoCard>

            {/* 数据路由配置 */}
            <InfoCard title="数据路由配置" icon={Router}>
              <div className="space-y-1">
                <ConfigItem label="路由模式" value="智能路由" 
                  type="select"
                  options={[
                    { value: "smart", label: "智能路由" },
                    { value: "manual", label: "手动路由" },
                    { value: "auto", label: "自动路由" }
                  ]}
                  editable
                />
                <ConfigItem label="数据缓存" value="启用" 
                  type="select"
                  options={[
                    { value: "enabled", label: "启用" },
                    { value: "disabled", label: "禁用" }
                  ]}
                  editable
                />
                <ConfigItem label="缓存大小" value="100" unit="MB" type="number" editable />
                <ConfigItem label="数据转发延迟" value="10" unit="ms" type="number" editable />
                <ConfigItem label="重试次数" value="3" type="number" editable />
                <ConfigItem label="超时时间" value="30" unit="秒" type="number" editable />
                <ConfigItem label="负载均衡" value="启用" 
                  type="select"
                  options={[
                    { value: "enabled", label: "启用" },
                    { value: "disabled", label: "禁用" }
                  ]}
                  editable
                />
              </div>
            </InfoCard>

            {/* 系统配置 */}
            <InfoCard title="系统配置" icon={Settings}>
              <div className="space-y-1">
                <ConfigItem label="数据采集间隔" value="1000" unit="ms" type="number" editable />
                <ConfigItem label="数据保存周期" value="30" unit="天" type="number" editable />
                <ConfigItem label="日志级别" value="INFO" 
                  type="select"
                  options={[
                    { value: "DEBUG", label: "DEBUG" },
                    { value: "INFO", label: "INFO" },
                    { value: "WARN", label: "WARN" },
                    { value: "ERROR", label: "ERROR" }
                  ]}
                  editable
                />
                <ConfigItem label="自动重启" value="禁用" 
                  type="select"
                  options={[
                    { value: "enabled", label: "启用" },
                    { value: "disabled", label: "禁用" }
                  ]}
                  editable
                />
                <ConfigItem label="时区" value="Asia/Shanghai" 
                  type="select"
                  options={[
                    { value: "Asia/Shanghai", label: "Asia/Shanghai" },
                    { value: "UTC", label: "UTC" },
                    { value: "America/New_York", label: "America/New_York" }
                  ]}
                  editable
                />
                <ConfigItem label="语言" value="中文" 
                  type="select"
                  options={[
                    { value: "zh", label: "中文" },
                    { value: "en", label: "English" }
                  ]}
                  editable
                />
              </div>
            </InfoCard>
          </div>

          {/* 右侧：状态和操作 */}
          <div className="space-y-6">
            {/* 设备状态 */}
            <InfoCard title="设备状态" icon={Router}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">运行状态</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    运行中
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">CPU使用率</span>
                  <span className="text-sm font-medium text-gray-900">25%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{width: '25%'}}></div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">内存使用</span>
                  <span className="text-sm font-medium text-gray-900">512MB / 1GB</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{width: '50%'}}></div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">网络带宽</span>
                  <span className="text-sm font-medium text-gray-900">15.2Mbps / 100Mbps</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full" style={{width: '15%'}}></div>
                </div>
              </div>
            </InfoCard>

            {/* 连接统计 */}
            <InfoCard title="连接统计" icon={Server}>
              <div className="space-y-1">
                <ConfigItem label="总连接数" value="24" />
                <ConfigItem label="活跃连接" value="22" />
                <ConfigItem label="MQTT连接" value="12" />
                <ConfigItem label="HTTP连接" value="6" />
                <ConfigItem label="Modbus连接" value="4" />
                <ConfigItem label="CoAP连接" value="2" />
                <ConfigItem label="数据吞吐量" value="2.4 MB/s" />
                <ConfigItem label="平均延迟" value="15 ms" />
              </div>
            </InfoCard>

            {/* 位置信息 */}
            <InfoCard title="位置信息" icon={MapPin}>
              <div className="space-y-1">
                <ConfigItem label="安装位置" value="数据中心机房" editable />
                <ConfigItem label="楼层" value="2楼" editable />
                <ConfigItem label="房间号" value="DC-201" editable />
                <ConfigItem label="坐标" value="39.9042, 116.4074" editable />
                <ConfigItem label="备注" value="主网关，负责整个楼层的设备连接" 
                  type="textarea"
                  editable
                />
              </div>
            </InfoCard>

            {/* 标签和分类 */}
            <InfoCard title="标签和分类" icon={Tag}>
              <div className="space-y-1">
                <ConfigItem label="设备标签" value="网关,核心,网络" editable />
                <ConfigItem label="所属部门" value="IT部" editable />
                <ConfigItem label="负责人" value="李四" editable />
                <ConfigItem label="联系方式" value="13900139000" editable />
                <ConfigItem label="维护周期" value="每月" 
                  type="select"
                  options={[
                    { value: "weekly", label: "每周" },
                    { value: "monthly", label: "每月" },
                    { value: "quarterly", label: "每季度" },
                    { value: "yearly", label: "每年" }
                  ]}
                  editable
                />
              </div>
            </InfoCard>

            {/* 安全设置 */}
            <InfoCard title="安全设置" icon={Shield}>
              <div className="space-y-1">
                <ConfigItem label="访问控制" value="启用" 
                  type="select"
                  options={[
                    { value: "enabled", label: "启用" },
                    { value: "disabled", label: "禁用" }
                  ]}
                  editable
                />
                <ConfigItem label="加密通信" value="启用" 
                  type="select"
                  options={[
                    { value: "enabled", label: "启用" },
                    { value: "disabled", label: "禁用" }
                  ]}
                  editable
                />
                <ConfigItem label="远程访问" value="限制" 
                  type="select"
                  options={[
                    { value: "allowed", label: "允许" },
                    { value: "restricted", label: "限制" },
                    { value: "disabled", label: "禁用" }
                  ]}
                  editable
                />
                <ConfigItem label="防火墙" value="启用" 
                  type="select"
                  options={[
                    { value: "enabled", label: "启用" },
                    { value: "disabled", label: "禁用" }
                  ]}
                  editable
                />
                <ConfigItem label="固件签名验证" value="启用" 
                  type="select"
                  options={[
                    { value: "enabled", label: "启用" },
                    { value: "disabled", label: "禁用" }
                  ]}
                  editable
                />
              </div>
            </InfoCard>

            {/* 快速操作 */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">快速操作</h3>
              <div className="space-y-2">
                <Link 
                  href="/iot/smart-gateway/dashboard"
                  className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  查看仪表板
                </Link>
                <Link 
                  href="/iot/smart-gateway/manager"
                  className="block w-full text-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  网关管理
                </Link>
                <button className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">
                  <Download className="h-4 w-4 mr-2" />
                  导出配置
                </button>
                <button className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">
                  <Upload className="h-4 w-4 mr-2" />
                  导入配置
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
