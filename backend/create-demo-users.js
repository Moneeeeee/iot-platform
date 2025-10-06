const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createDemoUsers() {
  try {
    console.log('Creating demo users...');

    // 创建管理员用户
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
      where: { username: 'admin' },
      update: {},
      create: {
        username: 'admin',
        email: 'admin@iot-platform.com',
        passwordHash: adminPassword,
        role: 'ADMIN',
        isActive: true,
        language: 'ZH_CN',
        permissions: ['user:create', 'user:read', 'user:update', 'user:delete', 'device:create', 'device:read', 'device:update', 'device:delete'],
      },
    });

    // 创建操作员用户
    const operatorPassword = await bcrypt.hash('operator123', 10);
    const operator = await prisma.user.upsert({
      where: { username: 'operator' },
      update: {},
      create: {
        username: 'operator',
        email: 'operator@iot-platform.com',
        passwordHash: operatorPassword,
        role: 'OPERATOR',
        isActive: true,
        language: 'ZH_CN',
        permissions: ['device:read', 'device:update'],
      },
    });

    // 创建查看者用户
    const viewerPassword = await bcrypt.hash('viewer123', 10);
    const viewer = await prisma.user.upsert({
      where: { username: 'viewer' },
      update: {},
      create: {
        username: 'viewer',
        email: 'viewer@iot-platform.com',
        passwordHash: viewerPassword,
        role: 'VIEWER',
        isActive: true,
        language: 'ZH_CN',
        permissions: ['device:read'],
      },
    });

    console.log('Demo users created successfully:');
    console.log('- Admin: admin / admin123');
    console.log('- Operator: operator / operator123');
    console.log('- Viewer: viewer / viewer123');

  } catch (error) {
    console.error('Error creating demo users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createDemoUsers();
