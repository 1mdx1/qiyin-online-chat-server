import { Inject, Logger } from '@midwayjs/core';
import {
  WSController,
  OnWSConnection,
  OnWSDisConnection,
  OnWSMessage,
} from '@midwayjs/core';
import type { Context } from '@midwayjs/socketio';
import { JwtService } from '@midwayjs/jwt';
import type { ILogger } from '@midwayjs/logger';
import { ErrorCode, CustomError, ErrorMessage } from '../common/error';
import {
  GROUP_ROOM_PREFIX,
  GroupSocketRelay,
} from '../service/groupSocketRelay';
import { GroupService } from '../service/group.service';

type SocketContext = Context & { uid?: string };

@WSController('/group')
export class GroupSocketController {
  @Inject()
  ctx: Context;

  @Inject()
  jwtService: JwtService;

  @Inject()
  groupService: GroupService;

  @Inject()
  groupSocketRelay: GroupSocketRelay;

  @Logger()
  logger: ILogger;

  /** 连接认证：从 handshake 中解析 token 并校验 */
  @OnWSConnection()
  async onConnection() {
    const socket = this.ctx as SocketContext;
    const token =
      socket.handshake?.auth?.token ||
      socket.handshake?.headers?.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) {
      socket.disconnect(true);
      throw new CustomError(ErrorCode.UnauthorizedError);
    }
    try {
      const jwt = await this.jwtService.verify(token);
      socket.uid = jwt['uid'];
    } catch (err) {
      this.logger.warn(`[socket] 连接认证失败: ${err.message}`);
      socket.disconnect(true);
      throw new CustomError(ErrorCode.UnauthorizedError);
    }
    // 注册长连接，供群组邀请等 HTTP 侧联动
    this.groupSocketRelay.register(socket);
    // 自动加入当前用户所在的所有群组房间：被邀请者无需确认即加入群组，
    // 其长连接在此一并进入房间，之后无需再次手动 join 也能收到实时消息
    try {
      const gids = await this.groupService.listMemberGroupIds(socket.uid);
      await Promise.all(gids.map(gid => socket.join(this.room(gid))));
    } catch (err) {
      this.logger.warn(`[socket] 自动加入群组房间失败: ${err.message}`);
    }
  }

  @OnWSDisConnection()
  async onDisConnection() {
    const socket = this.ctx as SocketContext;
    this.groupSocketRelay.unregister(socket);
  }

  /** 加入群组房间，用于接收该群组消息 */
  @OnWSMessage('join')
  async onJoin(data: { gid: string }) {
    const socket = this.ctx as SocketContext;
    if (!socket.uid) {
      socket.emit('error', this.error(ErrorCode.UnauthorizedError));
      return;
    }
    if (!data?.gid) {
      socket.emit('error', this.error(ErrorCode.ParamsValidateFailed));
      return;
    }
    let group;
    try {
      group = await this.groupService.getGroup(data.gid);
    } catch (err) {
      socket.emit('error', this.error(ErrorCode.GroupNotExist));
      return;
    }
    if (!this.groupService.isMember(group, socket.uid)) {
      socket.emit('error', this.error(ErrorCode.GroupNotMember));
      return;
    }
    await socket.join(this.room(data.gid));
    socket.emit('joined', { gid: data.gid });
  }

  @OnWSMessage('leave')
  async onLeave(data: { gid: string }) {
    const socket = this.ctx as SocketContext;
    if (data?.gid) {
      await socket.leave(this.room(data.gid));
    }
  }

  /**
   * 发送群组消息：
   * 1. 校验成员身份
   * 2. 保存人类消息并广播到群组房间
   * 3. 触发机器人回复并逐条广播
   */
  @OnWSMessage('chat')
  async onChat(data: { gid: string; message: string }) {
    const socket = this.ctx as SocketContext;
    if (!socket.uid) {
      socket.emit('error', this.error(ErrorCode.UnauthorizedError));
      return;
    }
    if (!data?.gid || !data?.message?.trim()) {
      socket.emit('error', this.error(ErrorCode.ParamsValidateFailed));
      return;
    }
    const room = this.room(data.gid);
    const emit = (msg: unknown) => {
      socket.nsp.to(room).emit('message', msg);
    };
    try {
      await this.groupService.handleGroupChat(
        data.gid,
        socket.uid,
        data.message.trim(),
        emit
      );
    } catch (err) {
      if (err instanceof CustomError) {
        socket.emit('error', this.error(err.code));
      } else {
        this.logger.error(`[socket] 群组消息发送失败: ${err.message}`);
        socket.emit('error', this.error(ErrorCode.Unknown));
      }
    }
  }

  private room(gid: string): string {
    return `${GROUP_ROOM_PREFIX}${gid}`;
  }

  private error(code: ErrorCode) {
    return { code, message: ErrorMessage[code] };
  }
}
