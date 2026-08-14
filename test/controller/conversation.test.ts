import { createApp, close, createHttpRequest } from '@midwayjs/mock';
import { Framework, Application } from '@midwayjs/koa';

describe('test/controller/conversation.test.ts', () => {
  let app: Application;
  let userA;
  let userB;
  let cid: string;

  beforeAll(async () => {
    app = await createApp<Framework>(process.cwd());
    const mk = async () => {
      const name = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const registerRes = await createHttpRequest(app)
        .post('/user/register')
        .send({ name, password: 'pass123456' });
      expect(registerRes.body.code).toBe(200);
      const loginRes = await createHttpRequest(app)
        .post('/user/login')
        .send({ email: name, password: 'pass123456' });
      return loginRes.body.data;
    };
    userA = await mk();
    userB = await mk();
  });

  afterAll(async () => {
    await close(app);
  });

  it('should create conversation with first message sent', async () => {
    const res = await createHttpRequest(app)
      .post('/conversation/create')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ message: 'hello world' });
    expect(res.body.code).toBe(200);
    expect(res.body.data.conversation.id).toBeDefined();
    expect(res.body.data.conversation.name).toBe('hello worl'); // 标题截取前10字符
    expect(res.body.data.userMessage.message).toBe('hello world');
    expect(res.body.data.reply).toBeDefined();
    cid = res.body.data.conversation.id;
  });

  it('should send message and get AI reply', async () => {
    const res = await createHttpRequest(app)
      .post('/conversation/send')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ id: cid, message: 'tell me a joke' });
    expect(res.body.code).toBe(200);
    expect(res.body.data.userMessage.message).toBe('tell me a joke');
    expect(res.body.data.reply).toBeDefined();
    expect(res.body.data.reply.status).toBe(0);
  });

  it('should list messages of conversation', async () => {
    const res = await createHttpRequest(app)
      .post('/conversation/message-list')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ id: cid });
    expect(res.body.code).toBe(200);
    // create 已落库首条消息+AI回复，这里 ≥3 条：首条消息、首条回复、后续消息、后续回复
    expect(res.body.data.total).toBeGreaterThanOrEqual(4);
  });

  it('should forbid userB sending message in userA conversation (ACL)', async () => {
    const res = await createHttpRequest(app)
      .post('/conversation/send')
      .set('Authorization', `Bearer ${userB.token}`)
      .send({ id: cid, message: 'hack attempt' });
    expect(res.body.code).toBe(2001); // ConversationNotExist
  });

  it('should forbid userB listing userA messages (ACL)', async () => {
    const res = await createHttpRequest(app)
      .post('/conversation/message-list')
      .set('Authorization', `Bearer ${userB.token}`)
      .send({ id: cid });
    expect(res.body.code).toBe(2001);
  });
});
