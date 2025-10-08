/**
 * 端到端测试主文件
 * 
 * 运行完整的端到端测试套件
 */

import { E2ETestSuite, TestEnvironment } from './test-framework';
import { start } from '@/server';

describe('E2E Tests', () => {
  let server: any;
  let testEnv: TestEnvironment;

  beforeAll(async () => {
    // 启动测试服务器
    server = await start();
    
    // 设置测试环境
    testEnv = new TestEnvironment();
    await testEnv.setup();
  }, 30000);

  afterAll(async () => {
    // 清理测试环境
    await testEnv.teardown();
    
    // 关闭服务器
    if (server) {
      await server.close();
    }
  }, 30000);

  describe('Bootstrap E2E Flow', () => {
    let e2eSuite: E2ETestSuite;

    beforeAll(() => {
      e2eSuite = new E2ETestSuite(server);
    });

    it('should complete full bootstrap flow', async () => {
      await e2eSuite.runFullTestSuite();
    }, 60000);
  });
});
