# TimescaleDB 优化的 PostgreSQL 镜像
# 基于官方 TimescaleDB 镜像，支持降级到标准 PostgreSQL

ARG USE_TIMESCALE=true
FROM timescale/timescaledb:latest-pg15 AS timescale
FROM postgres:15-alpine AS postgres

# 根据构建参数选择基础镜像
FROM ${USE_TIMESCALE:+timescale}${USE_TIMESCALE:-postgres}

# 安装额外扩展
RUN set -ex \
    && apk add --no-cache \
        postgresql-contrib \
        pg_cron

# 复制初始化脚本
COPY ./init-scripts /docker-entrypoint-initdb.d/

# 设置环境变量
ENV POSTGRES_INITDB_ARGS="-E UTF8 --locale=C"
ENV TIMESCALEDB_TELEMETRY=off

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD pg_isready -U ${POSTGRES_USER:-postgres} || exit 1

EXPOSE 5432

