import {
  createApp,
  close,
  createHttpRequest,
  createSocketIOClient,
} from '@midwayjs/mock';
import { Framework, Application } from '@midwayjs/koa';

const SOCKET_PORT = 39001;

describe('test/socket/group.socket.test.ts', () => {
  let app: Application;
  let token: string;
  let gid: string;

  beforeAll(async () => {
    app = await createApp<Framework>(process.cwd());
    const name = `sock_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await createHttpRequest(app)
      .post('/user/register')
      .send({ name, password: 'pass123456' });
    const login = await createHttpRequest(app)
      .post('/user/login')
      .send({ email: name, password: 'pass123456' });
    token = login.body.data.token;
    const robots = await createHttpRequest(app)
      .post('/robot/list')
      .set('Authorization', `Bearer ${token}`);
    const robotIds = robots.body.data.list.map(r => r.id);
    const group = await createHttpRequest(app)
      .post('/group/create')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'socket-room', robotIds });
    gid = group.body.data.id;
  });

  afterAll(async () => {
    await close(app);
  });

  it('should reject connection with invalid token', async () => {
    const { io } = require('socket.io-client');
    const socket = io(`http://127.0.0.1:${SOCKET_PORT}/group`, {
      auth: { token: 'bad-token' },
      transports: ['websocket'],
      reconnection: false,
    });
    const disconnected = await Promise.race([
      new Promise<boolean>(resolve =>
        socket.on('disconnect', () => resolve(true))
      ),
      new Promise<boolean>(resolve => setTimeout(() => resolve(false), 2000)),
    ]);
    socket.close();
    expect(disconnected).toBe(true);
  });

  // 创建者连接时由服务端自动加入其所在群组房间：无需手动 join 即可收到实时消息，
  // 同时验证 handleGroupChat 广播与机器人回复机制
  it('should auto-join creator room and receive human + robot messages without explicit join', async () => {
    const client = await createSocketIOClient({
      port: SOCKET_PORT,
      namespace: '/group',
      auth: { token },
    });

    const received: any[] = [];
    const want = new Promise<void>(resolve => {
      client.on('message', m => {
        received.push(m);
        if (received.some(x => x.senderType === 2)) {
          resolve();
        }
      });
    });
    // 不发送 join：依赖连接时自动加入房间
    client.send('chat', {
      gid,
      message: '有 bug 怎么排查，顺便给我讲个冷笑话',
    });
    await Promise.race([
      want,
      new Promise<void>(resolve => setTimeout(() => resolve(), 8000)),
    ]);

    expect(received.length).toBeGreaterThanOrEqual(2);
    // 人类消息已广播
    expect(
      received.some(
        m => m.senderType === 1 && m.message.includes('bug 怎么排查')
      )
    ).toBe(true);
    // 至少一个机器人回复（确保回复机制）
    expect(received.some(m => m.senderType === 2)).toBe(true);

    client.close();
  });

  // 被邀请者离线时直入群组（无需确认），之后建立连接时自动加入房间：
  // 创建者发言，被邀请者无需手动 join 即可收到实时消息
  it('should auto-join invited offline user room so they receive real-time messages', async () => {
    // 被邀请用户 B：注册登录（此时尚未连接）
    const nameB = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await createHttpRequest(app)
      .post('/user/register')
      .send({ name: nameB, password: 'pass123456' });
    const loginB = await createHttpRequest(app)
      .post('/user/login')
      .send({ email: nameB, password: 'pass123456' });
    const tokenB = loginB.body.data.token;

    // 创建者 A 邀请 B（B 离线）：B 直接成为成员，无需确认
    const invite = await createHttpRequest(app)
      .post('/group/invite')
      .set('Authorization', `Bearer ${token}`)
      .send({ id: gid, name: nameB });
    expect(invite.body.code).toBe(200);

    // B 上线：连接时服务端应按其群组成员身份自动加入房间
    const clientB = await createSocketIOClient({
      port: SOCKET_PORT,
      namespace: '/group',
      auth: { token: tokenB },
    });

    // A（创建者）发言，B 无需 join 也能收到实时消息
    const clientA = await createSocketIOClient({
      port: SOCKET_PORT,
      namespace: '/group',
      auth: { token },
    });
    const msgBody = `invite-push-${Date.now()}`;
    let gotMsg = false;
    clientB.on('message', m => {
      if (m.message === msgBody) {
        gotMsg = true;
      }
    });
    clientA.send('chat', { gid, message: msgBody });
    await new Promise<void>(resolve => setTimeout(resolve, 5000));

    expect(gotMsg).toBe(true);
    clientA.close();
    clientB.close();
  });
});
