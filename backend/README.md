# Backend 服务

> 📚 **详细文档**: 请查看 [docs/backend/README.md](../docs/backend/README.md)

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 数据库迁移
npm run migrate
```

## 📁 目录结构

```
backend/
├── src/                    # 源代码
├── scripts/                # 脚本文件
│   ├── test/              # 测试脚本
│   ├── debug/             # 调试脚本
│   └── demo/              # 演示脚本
├── prisma/                # 数据库模式
├── dist/                  # 编译输出
└── package.json           # 项目配置
```

## 🔧 常用命令

```bash
# 开发
npm run dev                # 开发模式
npm run build              # 构建项目
npm start                  # 生产模式

# 数据库
npm run migrate            # 数据库迁移
npm run generate           # 生成Prisma客户端
npm run db:studio          # 打开数据库管理界面

# 测试和调试
npm run test               # 运行测试
npm run test:db            # 数据库测试
npm run demo:users         # 创建演示用户

# 调试
npm run start:simple       # 简单启动
npm run start:debug        # 调试模式
npm run start:db           # 数据库测试服务器
```

---

**完整文档**: [docs/backend/README.md](../docs/backend/README.md)
