# 使用官方Node.js运行时作为基础镜像
FROM node:20-alpine

# 设置工作目录
WORKDIR /app

# 安装系统依赖
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    postgresql-client

# 复制package.json和package-lock.json
COPY package*.json ./

# 安装所有依赖
RUN npm install && npm cache clean --force

# 复制源代码
COPY . .

# 生成Prisma Client
RUN npm run generate

# 创建非root用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# 创建必要的目录并设置权限
RUN mkdir -p /app/logs /app/uploads && \
    chown -R nodejs:nodejs /app

# 切换到非root用户
USER nodejs

# 暴露端口
EXPOSE 8000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# 启动应用
CMD ["npm", "start"]
