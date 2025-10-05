/**
 * 健康检查测试
 */

import request from 'supertest';
import { Application } from '../index';

describe('Health Check', () => {
  let app: Application;

  beforeAll(async () => {
    app = new Application();
    await app.start();
  });

  afterAll(async () => {
    await app.shutdown();
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app.getApp())
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('services');
      expect(response.body).toHaveProperty('details');
    });

    it('should include all service statuses', async () => {
      const response = await request(app.getApp())
        .get('/health')
        .expect(200);

      expect(response.body.services).toHaveProperty('database');
      expect(response.body.services).toHaveProperty('redis');
      expect(response.body.services).toHaveProperty('mqtt');
    });
  });
});
