/**
 * 认证测试
 */

import request from 'supertest';
import { Application } from '../index';

describe('Authentication', () => {
  let app: Application;

  beforeAll(async () => {
    app = new Application();
    await app.start();
  });

  afterAll(async () => {
    await app.shutdown();
  });

  describe('POST /api/auth/login', () => {
    it('should return 400 for missing credentials', async () => {
      const response = await request(app.getApp())
        .post('/api/auth/login')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 400 for invalid credentials', async () => {
      const response = await request(app.getApp())
        .post('/api/auth/login')
        .send({
          username: 'invalid',
          password: 'invalid'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/auth/register', () => {
    it('should return 400 for missing required fields', async () => {
      const response = await request(app.getApp())
        .post('/api/auth/register')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app.getApp())
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'invalid-email',
          password: 'password123'
        })
        .expect(400);

      expect(response.body).toHaveProperty('success', false);
    });
  });
});
