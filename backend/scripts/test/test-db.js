/**
 * 数据库连接和功能测试脚本
 * 用于验证PostgreSQL连接和Prisma ORM功能
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDatabase() {
  try {
    // 测试基本连接
    await prisma.$connect();
    console.log('✅ 数据库连接成功');

    // 测试查询设备表
    console.log('🔍 查询设备表...');
    const devices = await prisma.device.findMany({
      take: 5,
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        createdAt: true
      }
    });
    console.log('✅ 设备查询成功，找到', devices.length, '个设备');
    console.log('设备列表:', devices);

    // 测试查询用户表
    console.log('🔍 查询用户表...');
    const users = await prisma.user.findMany({
      take: 5,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true
      }
    });
    console.log('✅ 用户查询成功，找到', users.length, '个用户');
    console.log('用户列表:', users);

    // 测试创建测试设备
    if (users.length > 0) {
      console.log('🔍 创建测试设备...');
      const testDevice = await prisma.device.create({
        data: {
          slug: 'test-device-' + Date.now(),
          name: '测试设备',
          type: 'SMART_SENSOR',
          status: 'ONLINE',
          config: {
            test: true,
            created_at: new Date().toISOString()
          },
          capabilities: ['temperature', 'humidity'],
          userId: users[0].id // 使用第一个用户的ID
        }
      });
      console.log('✅ 测试设备创建成功:', testDevice.id);

      // 清理测试设备
      await prisma.device.delete({
        where: { id: testDevice.id }
      });
      console.log('✅ 测试设备清理成功');
    }

  } catch (error) {
    console.error('❌ 数据库测试失败:', error);
  } finally {
    console.log('🔌 数据库连接已关闭');
    await prisma.$disconnect();
  }
}

testDatabase();
