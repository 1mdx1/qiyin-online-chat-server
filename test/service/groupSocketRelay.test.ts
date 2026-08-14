import {
  GROUP_ROOM_PREFIX,
  GroupSocketRelay,
} from '../../src/service/groupSocketRelay';

function fakeSocket(uid: string) {
  return {
    uid,
    joinedRooms: [] as string[],
    emitted: [] as Array<[string, unknown]>,
    async join(room: string) {
      this.joinedRooms.push(room);
    },
    emit(event: string, payload: unknown) {
      this.emitted.push([event, payload]);
    },
  };
}

describe('test/service/groupSocketRelay.test.ts', () => {
  let relay: GroupSocketRelay;

  beforeEach(() => {
    relay = new GroupSocketRelay();
  });

  it('should register socket by uid', () => {
    const socket = fakeSocket('uid-1');
    relay.register(socket as any);
    // 注册后调用 notifyInvited 应能找到该 socket
    const result = relay.notifyInvited('uid-1', 'gid-1', 'Alice');
    expect(result).resolves.toBeUndefined();
  });

  it('should ignore register without uid', () => {
    relay.register({} as any);
    // 不抛异常即可
    expect(true).toBe(true);
  });

  it('should auto-join online invited socket to group room and push invited event', async () => {
    const socket = fakeSocket('uid-1');
    relay.register(socket as any);

    await relay.notifyInvited('uid-1', 'gid-abc', 'Alice');

    expect(socket.joinedRooms).toEqual([`${GROUP_ROOM_PREFIX}gid-abc`]);
    expect(socket.emitted).toEqual([
      ['invited', { gid: 'gid-abc', name: 'Alice' }],
    ]);
  });

  it('should do nothing when invited user is offline (not registered)', async () => {
    const socket = fakeSocket('uid-1');
    relay.register(socket as any);

    await relay.notifyInvited('uid-999', 'gid-abc', 'Bob');

    expect(socket.joinedRooms).toEqual([]);
    expect(socket.emitted).toEqual([]);
  });

  it('should unregister socket on disconnect', async () => {
    const socket = fakeSocket('uid-1');
    relay.register(socket as any);
    relay.unregister(socket as any);

    await relay.notifyInvited('uid-1', 'gid-abc', 'Alice');

    expect(socket.joinedRooms).toEqual([]);
    expect(socket.emitted).toEqual([]);
  });

  it('should notify all online sockets of the same uid', async () => {
    const socket1 = fakeSocket('uid-1');
    const socket2 = fakeSocket('uid-1');
    relay.register(socket1 as any);
    relay.register(socket2 as any);

    await relay.notifyInvited('uid-1', 'gid-1', 'Alice');

    expect(socket1.emitted).toHaveLength(1);
    expect(socket2.emitted).toHaveLength(1);
    expect(socket1.joinedRooms).toEqual([`${GROUP_ROOM_PREFIX}gid-1`]);
    expect(socket2.joinedRooms).toEqual([`${GROUP_ROOM_PREFIX}gid-1`]);
  });
});
