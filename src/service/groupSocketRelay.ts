import { Provide } from '@midwayjs/core';
import type { Socket } from 'socket.io';

/** 群组 socket 房间名前缀（与 group.socket.ts 保持一致） */
export const GROUP_ROOM_PREFIX = 'group:';

type GroupSocket = Socket & { uid?: string };

/**
 * 群聊长连接中转（单例）：
 * 维护 uid -> 在线 socket 的映射，供 HTTP 侧（如群组邀请）将被邀请人的
 * 在线长连接直接加入群组房间并下发通知，无需被邀请方再次手动 join。
 */
@Provide()
export class GroupSocketRelay {
  private readonly uidSockets = new Map<string, Set<GroupSocket>>();

  /** 连接建立并认证成功后注册，用于按 uid 定位在线 socket */
  register(socket: GroupSocket): void {
    const uid = socket.uid;
    if (!uid) {
      return;
    }
    let set = this.uidSockets.get(uid);
    if (!set) {
      set = new Set();
      this.uidSockets.set(uid, set);
    }
    set.add(socket);
  }

  /** 连接断开时反注册 */
  unregister(socket: GroupSocket): void {
    const uid = socket.uid;
    if (!uid) {
      return;
    }
    const set = this.uidSockets.get(uid);
    if (!set) {
      return;
    }
    set.delete(socket);
    if (set.size === 0) {
      this.uidSockets.delete(uid);
    }
  }

  /** 邀请成功：将被邀请人在线的 socket 加入群组房间，并通知其刷新群列表 */
  async notifyInvited(uid: string, gid: string, name: string): Promise<void> {
    const sockets = this.uidSockets.get(uid);
    if (!sockets || sockets.size === 0) {
      return;
    }
    const room = `${GROUP_ROOM_PREFIX}${gid}`;
    for (const socket of sockets) {
      await socket.join(room);
      socket.emit('invited', { gid, name });
    }
  }
}
