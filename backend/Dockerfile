# ===== 构建阶段 =====
FROM node:20-bullseye-slim AS builder
WORKDIR /app

RUN apt-get update -y \
 && apt-get install -y --no-install-recommends \
    tzdata openssl libssl1.1 ca-certificates curl \
 && rm -rf /var/lib/apt/lists/*

# 设置容器默认时区（可被环境变量 TZ 覆盖）
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# 安装 pnpm
RUN npm install -g pnpm

COPY package*.json ./
COPY prisma ./prisma
RUN pnpm install
RUN pnpm prisma generate --schema=prisma/schema.prisma
COPY . .
RUN pnpm run build

# ===== 运行阶段 =====
FROM node:20-bullseye-slim
WORKDIR /app

RUN apt-get update -y \
 && apt-get install -y --no-install-recommends \
    tzdata openssl libssl1.1 ca-certificates curl \
 && rm -rf /var/lib/apt/lists/*

# 设置容器默认时区（可被环境变量 TZ 覆盖）
ENV TZ=Asia/Shanghai
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# 安装 pnpm
RUN npm install -g pnpm

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

EXPOSE 8000
CMD ["node", "dist/index.js"]
