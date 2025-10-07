# ===== 构建阶段 =====
FROM node:20-bullseye-slim AS builder
WORKDIR /app

RUN apt-get update -y \
 && apt-get install -y --no-install-recommends \
    openssl libssl1.1 ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install --ignore-scripts
COPY prisma ./prisma
RUN npx prisma generate --schema=prisma/schema.prisma
COPY . .
RUN npm run build

# ===== 运行阶段 =====
FROM node:20-bullseye-slim
WORKDIR /app

RUN apt-get update -y \
 && apt-get install -y --no-install-recommends \
    openssl libssl1.1 ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

EXPOSE 8000
CMD ["node", "dist/index.js"]
