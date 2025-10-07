#!/usr/bin/env bash
set -euo pipefail

# ==== 根目录文件 ====
touch .gitignore .env.example README.md LICENSE package.json pnpm-workspace.yaml turbo.json docker-compose.yml .dockerignore

# ==== 全局脚本 ====
mkdir -p scripts
touch scripts/init-db.sh scripts/seed.sh scripts/create-tenant.sh scripts/create-device-type.sh \
      scripts/migrate.sh scripts/lint.sh scripts/build.sh scripts/start.sh scripts/stop.sh \
      scripts/publish-config.sh scripts/register-extension.sh scripts/toggle-profile.sh
chmod +x scripts/*.sh || true

# === 新增 scripts/extensions.sh （统一启停扩展） ===
cat > scripts/extensions.sh <<'EOF'
#!/usr/bin/env bash
set -e
# 用于启用或禁用 tenant/device 扩展模块
# Usage:
#   ./scripts/extensions.sh enable tenant tenantA
#   ./scripts/extensions.sh disable device deviceTypeX
MODE=$1
SCOPE=$2
NAME=$3
TARGET="backend/src/extensions/${SCOPE}s/${NAME}.extension.ts"
if [[ "$MODE" == "enable" && -f "$TARGET" ]]; then
  echo "✅ Enabling $SCOPE extension: $NAME"
  touch "$TARGET.enabled"
elif [[ "$MODE" == "disable" && -f "$TARGET" ]]; then
  echo "🚫 Disabling $SCOPE extension: $NAME"
  rm -f "$TARGET.enabled"
else
  echo "⚠️  Invalid usage or extension not found"
fi
EOF
chmod +x scripts/extensions.sh

# ==== Nginx ====
mkdir -p nginx nginx/ssl
touch nginx/nginx.conf

# ==== Docs（全部说明文档都在此）====
mkdir -p docs/docs/architecture docs/docs/api docs/docs/backend docs/docs/frontend docs/docs/deployment \
         docs/docs/troubleshooting docs/static
touch docs/docusaurus.config.ts docs/sidebars.ts \
      docs/docs/architecture/overview.md \
      docs/docs/api/http.md docs/docs/api/mqtt.md docs/docs/api/websocket.md \
      docs/docs/backend/modules.md docs/docs/backend/config-center.md docs/docs/backend/plugins.md \
      docs/docs/backend/adapters.md docs/docs/backend/extensions.md docs/docs/backend/rule-engine.md \
      docs/docs/backend/specs.md docs/docs/frontend/themes.md docs/docs/frontend/routing.md \
      docs/docs/deployment/docker.md docs/docs/deployment/nginx.md docs/docs/deployment/env.md \
      docs/docs/troubleshooting/common-issues.md docs/docs/architecture/tenancy.md
touch docs/Dockerfile

# === 删除胶囊化 packages 结构 ===
rm -rf packages/tenants packages/devices

# === 新增统一配置目录（租户/设备配置） ===
mkdir -p configs/tenants/default configs/devices/default
touch configs/tenants/default/config.json \
      configs/tenants/default/theme.json \
      configs/tenants/default/features.json \
      configs/devices/default/spec.schema.json \
      configs/devices/default/mapping.json \
      configs/devices/default/rules.json \
      configs/devices/default/panels.json \
      configs/README.md

# === 新增 extensions 扩展逻辑目录（仅存差异代码） ===
mkdir -p backend/src/extensions/tenants backend/src/extensions/devices
touch backend/src/extensions/README.md \
      backend/src/extensions/tenants/tenantA.extension.ts \
      backend/src/extensions/devices/deviceTypeX.extension.ts

# ==== Backend（底层/抽象/应用，模块化单体，可未来拆分）====
mkdir -p backend
touch backend/Dockerfile backend/package.json backend/tsconfig.json

# Prisma & SQL（Prisma 仅元数据，Timescale 用原生SQL）
mkdir -p backend/prisma backend/sql
touch backend/prisma/schema.prisma \
      backend/sql/001_timescale_init.sql \
      backend/sql/002_rls_policies.sql \
      backend/sql/003_continuous_aggregates.sql

# 源码层次：infrastructure（底层） → core（抽象层） → modules（应用层）
mkdir -p backend/src

# 入口
touch backend/src/index.ts backend/src/server.ts backend/src/env.ts

# 底层：基础设施
mkdir -p backend/src/infrastructure/db backend/src/infrastructure/cache backend/src/infrastructure/security \
         backend/src/infrastructure/adapters/base backend/src/infrastructure/adapters/impl backend/src/infrastructure/logging
touch backend/src/infrastructure/db/prisma.ts \
      backend/src/infrastructure/db/pg.ts \
      backend/src/infrastructure/cache/redis.ts \
      backend/src/infrastructure/security/jwt.ts \
      backend/src/infrastructure/adapters/base/adapter-base.ts \
      backend/src/infrastructure/adapters/impl/mqtt.adapter.ts \
      backend/src/infrastructure/adapters/impl/http.adapter.ts \
      backend/src/infrastructure/adapters/impl/udp.adapter.ts \
      backend/src/infrastructure/adapters/impl/ble.adapter.ts \
      backend/src/infrastructure/logging/logger.ts

# 抽象层：统一协议适配、插件加载、配置中心、事件总线、中间件、规则引擎、设备规范
mkdir -p backend/src/core/adapters backend/src/core/plugin-loader backend/src/core/config-center \
         backend/src/core/event-bus backend/src/core/middlewares backend/src/core/utils \
         backend/src/core/extensions backend/src/core/registry backend/src/core/rule-engine \
         backend/src/core/specs backend/src/core/specs/examples
touch backend/src/core/adapters/http.ts \
      backend/src/core/adapters/mqtt.ts \
      backend/src/core/adapters/ws.ts \
      backend/src/core/plugin-loader/loader.ts \
      backend/src/core/plugin-loader/validators.ts \
      backend/src/core/config-center/schemas.ts \
      backend/src/core/config-center/loader.ts \
      backend/src/core/event-bus/redis-bus.ts \
      backend/src/core/middlewares/tenant-resolver.ts \
      backend/src/core/middlewares/auth-jwt.ts \
      backend/src/core/middlewares/idempotency.ts \
      backend/src/core/utils/types.ts \
      backend/src/core/extensions/registry.ts \
      backend/src/core/extensions/loader.ts \
      backend/src/core/registry/adapter-registry.ts \
      backend/src/core/registry/tenant-registry.ts \
      backend/src/core/registry/device-registry.ts \
      backend/src/core/adapters/factory.ts \
      backend/src/core/rule-engine/engine.ts \
      backend/src/core/rule-engine/actions.ts \
      backend/src/core/rule-engine/README.md \
      backend/src/core/specs/loader.ts \
      backend/src/core/specs/validators.ts \
      backend/src/core/specs/examples/thermo.mapping.json \
      backend/src/core/specs/examples/thermo.rules.json

# 应用层：领域模块（auth/tenants/devices/shadow/ota/data等）
mkdir -p backend/src/modules/auth backend/src/modules/tenants backend/src/modules/devices \
         backend/src/modules/shadow backend/src/modules/ota backend/src/modules/data \
         backend/src/modules/tenant-config
touch backend/src/modules/auth/service.ts \
      backend/src/modules/tenants/service.ts \
      backend/src/modules/devices/service.ts \
      backend/src/modules/shadow/service.ts \
      backend/src/modules/ota/service.ts \
      backend/src/modules/data/telemetry.repo.ts \
      backend/src/modules/data/queries.sql \
      backend/src/modules/tenant-config/service.ts

# 路由层
mkdir -p backend/src/routes
touch backend/src/routes/auth.routes.ts \
      backend/src/routes/tenants.routes.ts \
      backend/src/routes/devices.routes.ts \
      backend/src/routes/telemetry.routes.ts

# 类型声明
mkdir -p backend/src/types
touch backend/src/types/global.d.ts

# 新增配置中心和适配器加载入口（方便运行时注入）
mkdir -p backend/src/bootstrap
touch backend/src/bootstrap/config-loader.ts backend/src/bootstrap/adapter-loader.ts

# ==== Frontend（Next.js App Router + 胶囊挂载点）====
mkdir -p frontend frontend/public
touch frontend/Dockerfile frontend/package.json frontend/tsconfig.json frontend/next.config.ts \
      frontend/postcss.config.mjs frontend/tailwind.config.ts

mkdir -p frontend/src

# 中间件（解析租户，注入cookie/头部）
touch frontend/src/middleware.ts

# App Router 基础骨架
mkdir -p frontend/src/app/\(public\)/login frontend/src/app/\(dashboard\)/dashboard frontend/src/app/\(dashboard\)/devices
touch frontend/src/app/\(public\)/login/page.tsx \
      frontend/src/app/\(dashboard\)/layout.tsx \
      frontend/src/app/\(dashboard\)/dashboard/page.tsx \
      frontend/src/app/\(dashboard\)/devices/page.tsx

# 前端核心：协议客户端、hooks、providers、types
mkdir -p frontend/src/core frontend/src/hooks frontend/src/providers frontend/src/types
touch frontend/src/core/api.ts frontend/src/core/mqtt-client.ts frontend/src/core/ws-client.ts \
      frontend/src/hooks/useTenant.ts \
      frontend/src/providers/QueryProvider.tsx \
      frontend/src/types/index.ts

# 组件与图表
mkdir -p frontend/src/components/ui frontend/src/components/charts frontend/src/components/device
touch frontend/src/components/ui/Button.tsx \
      frontend/src/components/charts/Timeseries.tsx \
      frontend/src/components/device/DeviceCard.tsx

# 前端不再使用胶囊挂载点，改为配置驱动

# 默认主题与一个示例租户主题的占位（前端可以软链接或动态导入 packages 内容）
mkdir -p frontend/src/themes/default frontend/src/themes/tenantA
touch frontend/src/themes/default/theme.tsx frontend/src/themes/tenantA/theme.tsx

# ==== CI / DevContainer（可选）====
mkdir -p .github/workflows .devcontainer
touch .github/workflows/ci.yml .devcontainer/devcontainer.json

# === Tests（P0） ===
mkdir -p tests/smoke tests/integration tests/fixtures tests/unit
touch tests/smoke/backend-start.test.ts \
      tests/smoke/frontend-start.test.ts \
      tests/smoke/mqtt-ws-connect.test.ts \
      tests/integration/telemetry-ingest.query-agg.test.ts \
      tests/fixtures/sample-telemetry.json \
      tests/unit/rule-engine.test.ts \
      tests/unit/adapter-factory.test.ts \
      tests/jest.config.cjs

# === .env.example（P0：详细化说明占位） ===
mkdir -p docs/docs/deployment
touch docs/docs/deployment/env-variables.md
# 你已有 .env.example 文件，补一份说明清单：
# (此命令不会覆盖已有 .env.example，仅确保说明文档存在)

# === API 文档（P1：构建期生成 OpenAPI JSON，非运行时Swagger） ===
mkdir -p backend/src/docs backend/openapi
touch backend/src/docs/openapi.gen.ts \
      backend/openapi/openapi.json \
      docs/docs/api/openapi.md

# === 监控与日志（P1：可选） ===
mkdir -p monitoring/prometheus monitoring/grafana/provisioning/{dashboards,datasources}
touch monitoring/prometheus/prometheus.yml \
      monitoring/grafana/provisioning/datasources/datasource.yml \
      monitoring/grafana/provisioning/dashboards/iot-overview.json \
      monitoring/README.md

# === Docker-compose 监控增量（占位，不强制启用） ===
mkdir -p docker/overrides
touch docker/overrides/docker-compose.monitoring.yml docker/overrides/docker-compose.timescale.yml

echo "✅ IoT Platform scaffold created successfully!"
echo "📁 Project directory: $(pwd)"
echo "🚀 Next steps:"
echo "   1. Run: ./scripts/init-db.sh"
echo "   2. Run: ./scripts/seed.sh"
echo "   3. Run: ./scripts/start.sh"
