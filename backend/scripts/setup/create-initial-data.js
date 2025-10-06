/**
 * 创建初始数据：默认租户 + 管理员用户
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 开始创建初始数据...\n');

  // 1. 创建默认租户
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      slug: 'default',
      name: '默认租户',
      plan: 'ENTERPRISE',
      status: 'ACTIVE',
      limits: {
        maxDevices: 10000,
        maxUsers: 100,
        maxTemplates: 50,
        maxFirmwares: 20,
      },
      config: {
        timezone: 'Asia/Shanghai',
        language: 'zh-CN',
      },
    },
  });

  console.log('✅ 默认租户已创建:', {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
  });

  // 2. 创建管理员用户
  const passwordHash = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: {
      tenantId_username: {
        tenantId: tenant.id,
        username: 'admin',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      username: 'admin',
      email: 'admin@iot-platform.com',
      passwordHash,
      role: 'ADMIN',
      permissions: ['*'],
      language: 'ZH_CN',
      isActive: true,
    },
  });

  console.log('✅ 管理员用户已创建:', {
    id: admin.id,
    username: admin.username,
    email: admin.email,
    role: admin.role,
  });

  // 3. 创建默认设备模板
  const template = await prisma.deviceTemplate.upsert({
    where: {
      tenantId_name_version: {
        tenantId: tenant.id,
        name: 'Generic IoT Device',
        version: '1.0.0',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Generic IoT Device',
      type: 'generic',
      version: '1.0.0',
      description: '通用 IoT 设备模板',
      attributes: {
        serialNumber: { type: 'string', required: true },
        manufacturer: { type: 'string' },
        model: { type: 'string' },
      },
      telemetryMetrics: [
        {
          name: 'temperature',
          type: 'number',
          unit: '°C',
          range: [-40, 125],
        },
        {
          name: 'humidity',
          type: 'number',
          unit: '%',
          range: [0, 100],
        },
      ],
      events: [
        {
          name: 'alert',
          level: 'warning',
          fields: {
            code: { type: 'string' },
            message: { type: 'string' },
          },
        },
      ],
      commands: [
        {
          name: 'reboot',
          params: {},
          timeout: 30,
          ackPolicy: 'required',
        },
      ],
    },
  });

  console.log('✅ 默认设备模板已创建:', {
    id: template.id,
    name: template.name,
    type: template.type,
  });

  // 4. 创建默认保留策略
  const retentionPolicy = await prisma.retentionPolicy.upsert({
    where: {
      tenantId_name: {
        tenantId: tenant.id,
        name: 'Default Telemetry Policy',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Default Telemetry Policy',
      dataType: 'TELEMETRY',
      tiers: {
        hot: {
          duration: '30d',
          resolution: 'raw',
          compression: false,
        },
        warm: {
          duration: '180d',
          resolution: '5m',
          compression: true,
        },
        cold: {
          duration: '3y',
          resolution: '1h',
          compression: true,
        },
      },
      scope: {},
      isActive: true,
    },
  });

  console.log('✅ 默认保留策略已创建:', {
    id: retentionPolicy.id,
    name: retentionPolicy.name,
    dataType: retentionPolicy.dataType,
  });

  console.log('\n✨ 初始数据创建完成！\n');
  console.log('📝 登录信息:');
  console.log('   用户名: admin');
  console.log('   密码: admin123');
  console.log('   邮箱: admin@iot-platform.com');
  console.log('\n⚠️  请立即修改默认密码！\n');
}

main()
  .catch((error) => {
    console.error('❌ 创建初始数据失败:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

