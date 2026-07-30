import { unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';

// 必须在动态导入 app 之前指定独立数据文件，避免污染开发库
const databaseFile = `./data/test-register-${process.pid}.json`;
process.env.DATABASE_FILE = databaseFile;
const { app } = await import('../src/app.js');

const password = 'Register123';
const body = (username: string, role: string) => ({ username, password, role, displayName: `测试${username}` });

afterAll(async () => {
  await unlink(resolve(databaseFile)).catch(() => undefined);
});

describe('POST /api/v1/auth/register', () => {
  it('普通用户、核销用户、运营用户都可以自助注册并直接获得会话', async () => {
    for (const role of ['customer', 'verifier', 'operator'] as const) {
      const response = await request(app).post('/api/v1/auth/register').send(body(`new_${role}`, role));
      expect(response.status).toBe(201);
      expect(response.body.data.user).toMatchObject({ username: `new_${role}`, role });
      expect(response.body.data.accessToken).toBeTruthy();
      expect(String(response.headers['set-cookie'])).toContain('coupon_refresh');
    }
  });

  it('拒绝注册管理员，且不会创建该账号', async () => {
    const response = await request(app).post('/api/v1/auth/register').send(body('wants_admin', 'admin'));
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('AUTH_ROLE_NOT_REGISTRABLE');

    const login = await request(app).post('/api/v1/auth/login').send({ username: 'wants_admin', password });
    expect(login.status).toBe(401);
  });

  it('账号重复返回 409', async () => {
    const response = await request(app).post('/api/v1/auth/register').send(body('new_customer', 'customer'));
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('AUTH_USERNAME_TAKEN');
  });

  it('拒绝不合规的账号名与弱密码', async () => {
    const badUsername = await request(app).post('/api/v1/auth/register').send({ username: 'ab', password, role: 'customer' });
    expect(badUsername.status).toBe(400);

    const weakPassword = await request(app).post('/api/v1/auth/register').send({ username: 'weak_pwd_user', password: 'onlyletters', role: 'customer' });
    expect(weakPassword.status).toBe(400);
    expect(weakPassword.body.error.message).toContain('字母和数字');
  });

  it('注册后的账号可以用自己的密码登录', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({ username: 'new_operator', password });
    expect(login.status).toBe(200);
    expect(login.body.data.user.role).toBe('operator');
  });
});
