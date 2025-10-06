# 目录清理总结

## 🧹 清理完成的目录

### 1. **删除的空目录**
```
src/routes/     → 文件已移至 src/api/
src/utils/      → 文件已移至 src/common/utils/
src/models/     → 文件已移至 src/common/types/
src/middleware/ → 文件已移至 src/core/middleware/
src/services/   → 文件已移至 src/core/
```

### 2. **合并的重复目录**
```
devices/        → 内容已合并到 backend/src/plugins/devices/
```

## 📁 保留的目录

### 1. **`uploads/` 目录 - 保留** ✅
**用途**：
- 文件上传存储（用户头像、设备图片、文档）
- 固件管理（OTA升级包、固件备份）
- 导出文件（数据导出、报告生成）
- 临时文件存储

**目录结构**：
```
uploads/
├── images/          # 图片文件
├── documents/       # 文档文件
├── firmware/        # 固件文件
└── exports/         # 导出文件
```

**代码引用**：
```typescript
// 在 app.ts 和 core/server.ts 中
this.app.use('/uploads', express.static('uploads'));
```

### 2. **`tests/` 目录 - 保留** ✅
**用途**：
- 单元测试文件
- 集成测试文件

**当前内容**：
- `auth.test.ts`
- `health.test.ts`

## 🔄 设备配置系统统一

### 问题
之前存在两套设备配置系统：
1. `devices/` 目录（根目录）
2. `backend/src/plugins/devices/` 目录（插件系统）

### 解决方案
- **合并到插件系统**：将 `devices/powersafe/config.json` 移动到 `backend/src/plugins/devices/powersafe/`
- **删除重复目录**：删除根目录的 `devices/` 文件夹
- **统一管理**：所有设备配置现在都在插件系统中管理

### 新的设备配置结构
```
backend/src/plugins/devices/
├── powersafe/
│   ├── index.ts           # 设备插件实现
│   ├── config.json        # 设备配置（从 devices/ 移动过来）
│   ├── routes/            # 设备特定路由
│   ├── services/          # 设备特定服务
│   └── config/            # 设备特定配置
├── smart-controller/
├── smart-gateway/
├── smart-sensor/
└── generic/
```

## 📋 最终目录结构

```
/opt/iot-platform/
├── backend/               # 后端代码
│   ├── src/
│   │   ├── api/          # API路由
│   │   ├── common/       # 公共工具和类型
│   │   ├── core/         # 核心框架
│   │   ├── plugins/      # 插件系统（包含设备配置）
│   │   ├── config-center/ # 配置中心
│   │   └── tests/        # 测试文件
├── frontend/             # 前端代码
├── uploads/              # 文件上传存储
├── docs/                 # 文档
├── docker/               # Docker配置
└── scripts/              # 脚本文件
```

## ✅ 清理效果

1. **消除重复** - 删除了重复的设备配置系统
2. **结构清晰** - 所有功能都有明确的位置
3. **易于维护** - 统一的代码结构和依赖管理
4. **功能完整** - 保留了所有必要的功能目录

现在项目结构更加清晰和规范！🎉
