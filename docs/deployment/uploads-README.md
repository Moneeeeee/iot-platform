# 文件上传和静态资源管理

## 📁 目录结构

```
uploads/
├── README.md           # 本说明文件
├── .gitkeep           # 保持目录在Git中
├── images/            # 图片文件
│   ├── avatars/          # 用户头像
│   ├── devices/          # 设备图片
│   ├── thumbnails/       # 缩略图
│   └── temp/             # 临时图片
├── documents/         # 文档文件
│   ├── manuals/          # 设备手册
│   ├── certificates/     # 证书文件
│   └── reports/          # 报告文件
├── firmware/          # 固件文件
│   ├── ota/              # OTA升级包
│   └── backup/           # 固件备份
└── exports/           # 导出文件
    ├── data/              # 数据导出
    ├── logs/              # 日志导出
    └── reports/           # 报告导出
```

## 🎯 使用场景

### 1. 用户上传
- **头像图片**: 用户个人资料头像
- **设备图片**: 设备外观照片
- **文档**: 设备手册、证书等

### 2. 系统生成
- **缩略图**: 自动生成的图片缩略图
- **导出文件**: 数据导出、报告生成
- **临时文件**: 处理过程中的临时文件

### 3. 固件管理
- **OTA包**: 设备固件升级包
- **备份**: 固件版本备份

## 🔧 配置说明

### 文件大小限制
```json
{
  "upload": {
    "maxFileSize": "10MB",
    "allowedTypes": [
      "image/jpeg",
      "image/png", 
      "image/gif",
      "application/pdf",
      "application/zip"
    ]
  }
}
```

### 安全设置
- 文件类型验证
- 文件大小限制
- 病毒扫描（可选）
- 访问权限控制

## 🚀 API接口

### 文件上传
```bash
POST /api/upload
Content-Type: multipart/form-data

# 响应
{
  "success": true,
  "data": {
    "filename": "device_001.jpg",
    "url": "/uploads/images/devices/device_001.jpg",
    "size": 1024000,
    "type": "image/jpeg"
  }
}
```

### 文件访问
```bash
GET /uploads/images/devices/device_001.jpg
```

## 📋 最佳实践

### 1. 文件命名
- 使用有意义的文件名
- 避免特殊字符
- 添加时间戳防冲突

### 2. 目录权限
```bash
# 设置正确的权限
chmod 755 uploads/
chmod 644 uploads/images/*
```

### 3. 定期清理
- 清理临时文件
- 删除过期文件
- 压缩历史文件

## 🔍 监控和维护

### 磁盘使用监控
```bash
# 查看uploads目录大小
du -sh uploads/

# 查看各子目录大小
du -sh uploads/*
```

### 文件统计
```bash
# 统计文件数量
find uploads/ -type f | wc -l

# 按类型统计
find uploads/ -name "*.jpg" | wc -l
find uploads/ -name "*.pdf" | wc -l
```

## 🚨 注意事项

1. **备份**: 定期备份重要文件
2. **权限**: 确保正确的文件权限
3. **清理**: 定期清理临时和过期文件
4. **监控**: 监控磁盘使用情况
5. **安全**: 验证上传文件的安全性
