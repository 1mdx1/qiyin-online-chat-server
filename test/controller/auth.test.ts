import { createApp, close, createHttpRequest } from '@midwayjs/mock';
import { Framework, Application } from '@midwayjs/koa';

describe('test/controller/auth.test.ts', () => {
  let app: Application;

  beforeAll(async () => {
    app = await createApp<Framework>(process.cwd());
  });

  afterAll(async () => {
    await close(app);
  });

  it('should register and login', async () => {
    const name = `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const password = 'pass123456';

    const registerRes = await createHttpRequest(app)
      .post('/user/register')
      .send({ name, password });
    expect(registerRes.status).toBe(200);
    expect(registerRes.body.code).toBe(200);

    const loginRes = await createHttpRequest(app)
      .post('/user/login')
      .send({ email: name, password });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.token).toBeDefined();
    expect(loginRes.body.data.user.name).toBe(name);
  });

  it('should reject duplicate register', async () => {
    const name = `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const password = 'pass123456';
    await createHttpRequest(app)
      .post('/user/register')
      .send({ name, password });
    const res = await createHttpRequest(app)
      .post('/user/register')
      .send({ name, password });
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(1001); // UserAlreadyExist
  });

  it('should reject wrong password', async () => {
    const name = `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await createHttpRequest(app)
      .post('/user/register')
      .send({ name, password: 'pass123456' });
    const res = await createHttpRequest(app)
      .post('/user/login')
      .send({ email: name, password: 'wrong-pass' });
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(1003); // PasswordError
  });

  it('should reject request without token', async () => {
    const res = await createHttpRequest(app).post('/group/list');
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(301); // UnauthorizedError
  });
});
