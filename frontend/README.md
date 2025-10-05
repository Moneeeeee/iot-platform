# IoT设备管理平台 - 前端

这是一个基于Next.js 14的现代化IoT设备管理平台前端应用，采用TypeScript和Tailwind CSS构建。

## 🚀 技术栈

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **状态管理**: React Query (TanStack Query)
- **UI组件**: Radix UI + 自定义组件
- **认证**: JWT + Context API
- **实时通信**: Socket.IO
- **国际化**: 自定义i18n解决方案
- **主题**: next-themes

## 📁 项目结构

```
src/
├── app/                    # Next.js App Router页面
│   ├── page.tsx           # 首页
│   ├── about/             # 关于我们
│   ├── iot/               # 设备相关页面
│   │   ├── page.tsx       # 设备总览
│   │   └── smart-sensor/  # 智能传感器
│   │       ├── profile/   # 设备介绍
│   │       ├── dashboard/ # 数据大盘
│   │       └── manager/   # 管理平台
│   ├── login/             # 登录页面
│   ├── register/          # 注册页面
│   └── dashboard/         # 管理后台
├── components/            # 组件库
│   ├── ui/               # 基础UI组件
│   ├── layout/           # 布局组件
│   ├── device/           # 设备相关组件
│   ├── dashboard/        # 仪表板组件
│   └── auth/             # 认证组件
├── lib/                  # 工具库
│   ├── api.ts            # API客户端
│   ├── auth-context.tsx  # 认证上下文
│   ├── socket-context.tsx # WebSocket上下文
│   ├── providers.tsx     # 全局Provider
│   ├── utils.ts          # 工具函数
│   └── i18n/             # 国际化配置
├── hooks/                # 自定义Hooks
├── services/             # 服务层
├── types/                # TypeScript类型定义
└── locales/              # 语言包
    ├── zh-CN.ts          # 中文简体
    ├── zh-TW.ts          # 中文繁体
    └── en.ts             # 英文
```

## ✨ 主要功能

### 🌐 公开页面
- **首页**: 公司介绍、产品展示、特性说明
- **关于我们**: 公司信息、团队介绍、发展历程
- **设备总览**: 所有设备类型的展示和介绍

### 🔐 认证系统
- **登录/注册**: 完整的用户认证流程
- **JWT认证**: 安全的token管理
- **角色权限**: 管理员、操作员、查看者三种角色
- **会话管理**: 自动token刷新和过期处理

### 📱 设备管理
- **设备介绍页**: 详细的产品规格和特性
- **数据大盘**: 实时数据监控和图表展示
- **管理平台**: 设备配置、参数设置、远程控制

### 🎨 用户体验
- **响应式设计**: 支持桌面、平板、手机
- **国际化**: 支持中文简体、繁体、英文
- **主题切换**: 明暗主题支持
- **实时通信**: WebSocket实时数据更新

## 🛠️ 开发指南

### 环境要求
- Node.js 18+
- npm 或 yarn

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
npm run dev
```

### 构建生产版本
```bash
npm run build
```

### 启动生产服务器
```bash
npm start
```

## 🔧 配置

### 环境变量
复制 `.env.example` 到 `.env.local` 并配置：

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001/api
NEXT_PUBLIC_MQTT_WS_URL=ws://localhost:8083/mqtt
```

### 国际化配置
在 `src/lib/i18n/index.ts` 中配置支持的语言：

```typescript
export const i18nConfig: I18nConfig = {
  language: 'zh-CN',
  fallbackLanguage: 'zh-CN',
  supportedLanguages: ['zh-CN', 'zh-TW', 'en']
};
```

## 📦 核心组件

### UI组件库
- **Button**: 按钮组件，支持多种变体
- **Input**: 输入框组件
- **Card**: 卡片容器组件
- **Toast**: 通知组件
- **LanguageSwitcher**: 语言切换组件

### 业务组件
- **DeviceStatusCard**: 设备状态卡片
- **DataCard**: 数据展示卡片
- **ChartContainer**: 图表容器
- **AlertCard**: 告警信息卡片

### Hooks
- **useAuth**: 认证状态管理
- **useSocket**: WebSocket连接管理
- **useI18n**: 国际化支持
- **useToast**: 通知管理

## 🌍 国际化

支持三种语言：
- 🇨🇳 简体中文 (zh-CN)
- 🇹🇼 繁体中文 (zh-TW)
- 🇺🇸 英文 (en)

### 使用示例
```typescript
import { useI18n } from '@/hooks/use-i18n';

function MyComponent() {
  const { t, language, setLanguage } = useI18n();
  
  return (
    <div>
      <h1>{t('common.title')}</h1>
      <button onClick={() => setLanguage('en')}>
        {t('common.switchToEnglish')}
      </button>
    </div>
  );
}
```

## 🔌 API集成

### API客户端
使用封装的API客户端进行HTTP请求：

```typescript
import { apiClient } from '@/lib/api';

// GET请求
const devices = await apiClient.get('/devices');

// POST请求
const newDevice = await apiClient.post('/devices', deviceData);

// 带认证的请求
apiClient.setAuthToken(token);
```

### WebSocket连接
实时数据通过WebSocket获取：

```typescript
import { useSocket } from '@/hooks/useSocket';

function RealTimeData() {
  const { socket, isConnected } = useSocket();
  
  useEffect(() => {
    if (socket) {
      socket.on('deviceData', (data) => {
        console.log('收到设备数据:', data);
      });
    }
  }, [socket]);
}
```

## 🎯 路由结构

```
/                           # 首页
/about                      # 关于我们
/iot                        # 设备总览
/iot/[deviceSlug]/profile   # 设备介绍
/iot/[deviceSlug]/dashboard # 数据大盘
/iot/[deviceSlug]/manager   # 管理平台
/login                      # 登录
/register                   # 注册
/dashboard                  # 管理后台
```

## 🚀 部署

### Docker部署
```bash
# 构建镜像
docker build -t iot-platform-frontend .

# 运行容器
docker run -p 3000:3000 iot-platform-frontend
```

### 静态导出
```bash
npm run build
npm run export
```

## 📝 开发规范

### 代码风格
- 使用TypeScript严格模式
- 遵循ESLint规则
- 组件使用函数式组件和Hooks
- 使用Tailwind CSS进行样式管理

### 文件命名
- 组件文件使用PascalCase
- 工具文件使用camelCase
- 页面文件使用kebab-case

### 提交规范
- feat: 新功能
- fix: 修复bug
- docs: 文档更新
- style: 代码格式调整
- refactor: 代码重构
- test: 测试相关
- chore: 构建过程或辅助工具的变动

## 🤝 贡献指南

1. Fork项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开Pull Request

## 📄 许可证

本项目采用MIT许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🆘 支持

如果您遇到任何问题或有任何建议，请：

1. 查看 [Issues](https://github.com/your-repo/issues)
2. 创建新的Issue
3. 联系技术支持团队

---

**IoT设备管理平台** - 专业的物联网解决方案 🚀