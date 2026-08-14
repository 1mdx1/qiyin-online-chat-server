import { createApp, close, createHttpRequest } from '@midwayjs/mock';
import { Framework, Application } from '@midwayjs/koa';

describe('test/controller/group.test.ts', () => {
  let app: Application;
  let userA;
  let userB;
  let robots: any[];
  let robotIds: string[];
  let gid: string;

  beforeAll(async () => {
    app = await createApp<Framework>(process.cwd());
    const mk = async () => {
      const name = `grp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await createHttpRequest(app)
        .post('/user/register')
        .send({ name, password: 'pass123456' });
      const loginRes = await createHttpRequest(app)
        .post('/user/login')
        .send({ email: name, password: 'pass123456' });
      return loginRes.body.data;
    };
    userA = await mk();
    userB = await mk();
    const robotRes = await createHttpRequest(app)
      .post('/robot/list')
      .set('Authorization', `Bearer ${userA.token}`);
    robots = robotRes.body.data.list;
    robotIds = robots.map(r => r.id);
  });

  afterAll(async () => {
    await close(app);
  });

  it('should list preset robot roles', async () => {
    expect(robots.length).toBeGreaterThanOrEqual(3);
    const names = robots.map(r => r.name);
    expect(names).toContain('客服机器人');
    expect(names).toContain('技术机器人');
    expect(names).toContain('幽默机器人');
  });

  it('should create group with robots', async () => {
    const res = await createHttpRequest(app)
      .post('/group/create')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ name: 'tech-room', robotIds });
    expect(res.body.code).toBe(200);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.creatorName).toBe(userA.user.name);
    expect(res.body.data.members.some(m => m.id === userA.user.uid)).toBe(true);
    gid = res.body.data.id;
  });

  it('should reject creating group with invalid robot', async () => {
    const res = await createHttpRequest(app)
      .post('/group/create')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ name: 'bad', robotIds: ['not-a-uuid'] });
    expect(res.body.code).toBe(3004); // RobotNotExist
  });

  it('should list groups of user', async () => {
    const res = await createHttpRequest(app)
      .post('/group/list')
      .set('Authorization', `Bearer ${userA.token}`);
    expect(res.body.code).toBe(200);
    expect(res.body.data.list.some(g => g.id === gid)).toBe(true);
  });

  it('should get group detail with members', async () => {
    const res = await createHttpRequest(app)
      .post('/group/detail')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ id: gid });
    expect(res.body.code).toBe(200);
    expect(res.body.data.creatorName).toBe(userA.user.name);
    expect(res.body.data.members.length).toBe(robotIds.length + 1);
  });

  it('should add human member by creator', async () => {
    const res = await createHttpRequest(app)
      .post('/group/add-member')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ id: gid, memberIds: [userB.user.uid] });
    expect(res.body.code).toBe(200);
    const detail = await createHttpRequest(app)
      .post('/group/detail')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ id: gid });
    expect(detail.body.data.members.some(m => m.id === userB.user.uid)).toBe(
      true
    );
  });

  it('should let member userB see the group and its messages', async () => {
    const res = await createHttpRequest(app)
      .post('/group/detail')
      .set('Authorization', `Bearer ${userB.token}`)
      .send({ id: gid });
    expect(res.body.code).toBe(200);
  });

  it('should forbid non-owner removing members', async () => {
    const res = await createHttpRequest(app)
      .post('/group/remove-member')
      .set('Authorization', `Bearer ${userB.token}`)
      .send({ id: gid, memberIds: [userB.user.uid] });
    expect(res.body.code).toBe(3003); // GroupNoPermission
  });

  it('should forbid userC viewing group (not member, ACL)', async () => {
    const name = `grp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await createHttpRequest(app)
      .post('/user/register')
      .send({ name, password: 'pass123456' });
    const loginRes = await createHttpRequest(app)
      .post('/user/login')
      .send({ email: name, password: 'pass123456' });
    const res = await createHttpRequest(app)
      .post('/group/detail')
      .set('Authorization', `Bearer ${loginRes.body.data.token}`)
      .send({ id: gid });
    expect(res.body.code).toBe(3002); // GroupNotMember
  });

  it('should remove member by owner', async () => {
    const res = await createHttpRequest(app)
      .post('/group/remove-member')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ id: gid, memberIds: [userB.user.uid] });
    expect(res.body.code).toBe(200);
    const detail = await createHttpRequest(app)
      .post('/group/detail')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ id: gid });
    expect(detail.body.data.members.some(m => m.id === userB.user.uid)).toBe(
      false
    );
  });

  it('should update group name by owner', async () => {
    const res = await createHttpRequest(app)
      .post('/group/update-name')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ id: gid, name: 'renamed-room' });
    expect(res.body.code).toBe(200);
  });

  it('should invite a human user by account name (direct join, no confirm)', async () => {
    const name = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await createHttpRequest(app)
      .post('/user/register')
      .send({ name, password: 'pass123456' });
    const loginRes = await createHttpRequest(app)
      .post('/user/login')
      .send({ email: name, password: 'pass123456' });
    const token = loginRes.body.data.token;

    const inviteRes = await createHttpRequest(app)
      .post('/group/invite')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ id: gid, name });
    expect(inviteRes.body.code).toBe(200);

    // 已加入成员列表
    const detail = await createHttpRequest(app)
      .post('/group/detail')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ id: gid });
    expect(detail.body.data.members.some(m => m.name === name)).toBe(true);
    // 被邀请者可看到该群组并读取历史消息
    const listRes = await createHttpRequest(app)
      .post('/group/list')
      .set('Authorization', `Bearer ${token}`);
    expect(listRes.body.data.list.some(g => g.id === gid)).toBe(true);
    const msgRes = await createHttpRequest(app)
      .post('/group/message-list')
      .set('Authorization', `Bearer ${token}`)
      .send({ id: gid });
    expect(msgRes.body.code).toBe(200);
  });

  it('should forbid invited user modifying or deleting the group', async () => {
    const name = `inv2_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await createHttpRequest(app)
      .post('/user/register')
      .send({ name, password: 'pass123456' });
    const loginRes = await createHttpRequest(app)
      .post('/user/login')
      .send({ email: name, password: 'pass123456' });
    const token = loginRes.body.data.token;
    await createHttpRequest(app)
      .post('/group/invite')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ id: gid, name });

    const ownerOnly = [
      ['/group/update-name', { id: gid, name: 'hacked' }],
      ['/group/update-strategy', { id: gid, strategy: 'all' }],
      ['/group/delete', { id: gid }],
      ['/group/add-member', { id: gid, memberIds: [userA.user.uid] }],
      ['/group/remove-member', { id: gid, memberIds: [userA.user.uid] }],
      ['/group/invite', { id: gid, name: userA.user.name }],
    ];
    for (const [url, body] of ownerOnly) {
      const res = await createHttpRequest(app)
        .post(url)
        .set('Authorization', `Bearer ${token}`)
        .send(body);
      expect(res.body.code).toBe(3003); // GroupNoPermission
    }
    // 群组仍存在，未被误删
    const listRes = await createHttpRequest(app)
      .post('/group/list')
      .set('Authorization', `Bearer ${userA.token}`);
    expect(listRes.body.data.list.some(g => g.id === gid)).toBe(true);
  });

  it('should get group message list (empty initially)', async () => {
    const res = await createHttpRequest(app)
      .post('/group/message-list')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({ id: gid });
    expect(res.body.code).toBe(200);
    expect(res.body.data.total).toBe(0);
  });
});
