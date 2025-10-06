# Frontend 应用

> 📚 **详细文档**: 请查看 [docs/frontend/README.md](../docs/frontend/README.md)

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 📁 目录结构

```
frontend/
├── src/                    # 源代码
│   ├── app/               # Next.js App Router
│   ├── components/        # React组件
│   ├── hooks/             # 自定义Hooks
│   ├── lib/               # 工具库
│   ├── locales/           # 国际化文件
│   ├── services/          # API服务
│   └── types/             # TypeScript类型
├── public/                # 静态资源
├── scripts/               # 脚本文件
├── package.json           # 项目配置
├── tsconfig.json          # TypeScript配置
├── next.config.ts         # Next.js配置
├── postcss.config.mjs     # PostCSS配置
├── eslint.config.mjs      # ESLint配置
└── Dockerfile             # Docker配置
```

## 🔧 常用命令

```bash
# 开发
npm run dev                # 开发模式
npm run build              # 构建项目
npm start                  # 生产模式

# 代码质量
npm run lint               # 代码检查
npm run lint:fix           # 自动修复
npm run type-check         # 类型检查

# 测试
npm run test               # 运行测试
npm run test:watch         # 监听模式测试
npm run test:coverage      # 测试覆盖率
```

## 🌐 技术栈

- **Next.js 14**: React全栈框架
- **TypeScript**: 类型安全
- **Tailwind CSS**: 样式框架
- **Shadcn/ui**: UI组件库
- **i18next**: 国际化支持

## 📱 主要功能

- 设备管理界面
- 实时数据监控
- 用户认证系统
- 多语言支持
- 响应式设计

---

**完整文档**: [docs/frontend/README.md](../docs/frontend/README.md)
