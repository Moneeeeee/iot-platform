# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# 设置 npm 配置，减少内存和并发
ENV NPM_CONFIG_LOGLEVEL=error
ENV NPM_CONFIG_PROGRESS=false

# Copy package files
COPY package*.json ./

# Install dependencies (use npm install since no package-lock.json)
RUN npm install --quiet --no-audit --no-fund --production=false

# Copy source code
COPY . .

# Build TypeScript with memory limit
RUN NODE_OPTIONS="--max-old-space-size=512" npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy built files and dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

# Expose port
EXPOSE 8001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \  
  CMD node -e "require('http').get('http://localhost:8001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start server
CMD ["node", "dist/server.js"]
