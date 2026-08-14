import { Provide, Inject, Logger, sleep } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository, In } from 'typeorm';
import type { ILogger } from '@midwayjs/logger';
import { RedisService } from '@midwayjs/redis';
import { ErrorCode, CustomError } from '../common/error';
import { RedisKey } from '../common/redisKey';
import { Group, GroupReplyStrategy } from '../entity/group.entity';
import { Message, MessageStatus } from '../entity/message.entity';
import { User, UserType } from '../entity/user.entity';
import { AiService } from './ai.service';
import { RobotService } from './robot.service';
import { MessageService } from './message.service';
import { GroupSocketRelay } from './groupSocketRelay';

/** 群组消息广播回调，由上层（socket）注入 */
export type GroupMessageEmit = (msg: unknown) => void;

@Provide()
export class GroupService {
  @InjectEntityModel(Group)
  private readonly groupModel: Repository<Group>;

  @InjectEntityModel(Message)
  private readonly messageModel: Repository<Message>;

  @InjectEntityModel(User)
  private readonly userModel: Repository<User>;

  @Inject()
  private readonly redisService: RedisService;

  @Inject()
  private readonly aiService: AiService;

  @Inject()
  private readonly robotService: RobotService;

  @Inject()
  private readonly messageService: MessageService;

  @Inject()
  private readonly groupSocketRelay: GroupSocketRelay;

  @Logger()
  private readonly logger: ILogger;

  async getGroup(id: string): Promise<Group> {
    const group = await this.groupModel.findOne({ where: { id } });
    if (!group) {
      throw new CustomError(ErrorCode.GroupNotExist);
    }
    return group;
  }

  isMember(group: Group, uid: string): boolean {
    return group.uid === uid || (group.members || []).includes(uid);
  }

  assertMember(group: Group, uid: string): void {
    if (!this.isMember(group, uid)) {
      throw new CustomError(ErrorCode.GroupNotMember);
    }
  }

  assertOwner(group: Group, uid: string): void {
    if (group.uid !== uid) {
      throw new CustomError(ErrorCode.GroupNoPermission);
    }
  }

  async createGroup(
    uid: string,
    name: string,
    robotIds: string[]
  ): Promise<Group> {
    const robots = await this.robotService.getRobotsByIds(robotIds);
    if (robots.length !== robotIds.length) {
      throw new CustomError(ErrorCode.RobotNotExist);
    }
    const group = new Group();
    group.name = name;
    group.uid = uid;
    group.members = [uid, ...robots.map(r => r.id)];
    group.strategy = GroupReplyStrategy.Content;
    group.maxRobotReplies = 3;
    return this.groupModel.save(group);
  }

  async listGroups(uid: string) {
    const groups = await this.groupModel
      .createQueryBuilder('g')
      .where('g.uid = :uid', { uid })
      .orWhere(':uid = ANY(g.members)', { uid })
      .orderBy('g.updatedAt', 'DESC')
      .getMany();
    return groups.map(g => ({
      id: g.id,
      name: g.name,
      uid: g.uid,
      strategy: g.strategy,
      maxRobotReplies: g.maxRobotReplies,
      memberCount: (g.members || []).length,
      createdAt: g.createdAt,
      updatedAt: g.updatedAt,
    }));
  }

  /** 当前用户所在群组 id 列表（用于长连接建立时自动加入房间） */
  async listMemberGroupIds(uid: string): Promise<string[]> {
    const groups = await this.groupModel
      .createQueryBuilder('g')
      .select('g.id')
      .where('g.uid = :uid', { uid })
      .orWhere(':uid = ANY(g.members)', { uid })
      .getMany();
    return groups.map(g => g.id);
  }

  async getGroupDetail(id: string, uid: string) {
    const group = await this.getGroup(id);
    this.assertMember(group, uid);
    const memberIds = [group.uid, ...(group.members || [])];
    const members = await this.userModel.find({
      where: { id: In([...new Set(memberIds)]) },
    });
    const creator = await this.userModel.findOne({ where: { id: group.uid } });
    return {
      id: group.id,
      name: group.name,
      uid: group.uid,
      creatorName: creator ? creator.name : '',
      strategy: group.strategy,
      maxRobotReplies: group.maxRobotReplies,
      members: members.map(u => ({
        id: u.id,
        name: u.name,
        type: u.type,
        personality: u.personality,
      })),
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    };
  }

  async updateName(uid: string, id: string, name: string): Promise<void> {
    const group = await this.getGroup(id);
    this.assertOwner(group, uid);
    group.name = name;
    await this.groupModel.save(group);
  }

  /** 更新机器人回复策略（仅创建者） */
  async updateStrategy(
    uid: string,
    id: string,
    strategy: GroupReplyStrategy,
    maxRobotReplies?: number
  ): Promise<Group> {
    const group = await this.getGroup(id);
    this.assertOwner(group, uid);
    group.strategy = strategy;
    if (maxRobotReplies !== undefined) {
      group.maxRobotReplies = maxRobotReplies;
    }
    return this.groupModel.save(group);
  }

  async deleteGroup(uid: string, id: string): Promise<void> {
    const group = await this.getGroup(id);
    this.assertOwner(group, uid);
    await Promise.all([
      this.messageModel.delete({ gid: id }),
      this.groupModel.delete({ id }),
    ]);
  }

  async addMembers(
    uid: string,
    id: string,
    memberIds: string[]
  ): Promise<void> {
    const group = await this.getGroup(id);
    this.assertOwner(group, uid);
    const users = await this.userModel.find({ where: { id: In(memberIds) } });
    if (users.length !== memberIds.length) {
      throw new CustomError(ErrorCode.MemberNotExist);
    }
    const memberSet = new Set<string>(group.members || []);
    memberSet.add(group.uid);
    for (const mid of memberIds) {
      memberSet.add(mid);
    }
    group.members = Array.from(memberSet);
    await this.groupModel.save(group);
  }

  async removeMembers(
    uid: string,
    id: string,
    memberIds: string[]
  ): Promise<void> {
    const group = await this.getGroup(id);
    this.assertOwner(group, uid);
    if (memberIds.includes(group.uid)) {
      throw new CustomError(ErrorCode.GroupNoPermission);
    }
    const memberSet = new Set<string>(group.members || []);
    for (const mid of memberIds) {
      memberSet.delete(mid);
    }
    group.members = Array.from(memberSet);
    await this.groupModel.save(group);
  }

  /** 邀请人类用户加入群组：按账号名精确匹配（仅创建者） */
  async inviteUser(uid: string, id: string, name: string): Promise<void> {
    const group = await this.getGroup(id);
    this.assertOwner(group, uid);
    const nameTrim = name.trim();
    if (!nameTrim) {
      throw new CustomError(ErrorCode.ParamsValidateFailed);
    }
    const user = await this.userModel.findOne({ where: { name: nameTrim } });
    if (!user || user.type !== UserType.Human) {
      throw new CustomError(ErrorCode.MemberNotExist);
    }
    if (user.id === group.uid || (group.members || []).includes(user.id)) {
      return;
    }
    group.members = [...(group.members || []), user.id];
    await this.groupModel.save(group);
    // 被邀请者无需确认即加入群组：将其在线长连接加入房间并通知其刷新群列表；
    // 若对方当前不在线，其建立连接时会自动加入其所在群组房间（listMemberGroupIds）
    await this.groupSocketRelay.notifyInvited(user.id, group.id, group.name);
  }

  async saveMessage(
    gid: string,
    senderUid: string,
    content: string,
    status: MessageStatus = MessageStatus.Normal
  ): Promise<Message> {
    const msg = new Message();
    msg.gid = gid;
    msg.uid = senderUid;
    msg.message = content;
    msg.status = status;
    return this.messageModel.save(msg);
  }

  async messageList(gid: string, uid: string, page = 1, pageSize = 50) {
    const group = await this.getGroup(gid);
    this.assertMember(group, uid);
    const take = Math.min(Math.max(pageSize, 1), 200);
    const skip = (Math.max(page, 1) - 1) * take;
    const [list, total] = await this.messageModel.findAndCount({
      where: { gid },
      order: { createdAt: 'ASC' },
      skip,
      take,
    });
    return {
      list: await this.messageService.toDtoList(list),
      total,
      page: Math.max(page, 1),
      pageSize: take,
    };
  }

  /**
   * 处理一条群组人类消息：
   * 1. 校验成员身份并保存消息
   * 2. 广播给群组房间
   * 3. 按策略触发机器人回复
   */
  async handleGroupChat(
    gid: string,
    senderUid: string,
    content: string,
    emit: GroupMessageEmit
  ): Promise<void> {
    const group = await this.getGroup(gid);
    this.assertMember(group, senderUid);
    const humanMsg = await this.saveMessage(gid, senderUid, content);
    emit(await this.messageService.toDto(humanMsg));
    await this.triggerRobotReplies(group, humanMsg, emit);
  }

  /**
   * 机器人回复编排：
   * - 防循环机制一（主）：机器人只对人类消息触发，机器人消息不会再次触发机器人；
   * - 防循环机制二（兜底）：Redis 记录机器人连续回复次数，超过 maxRobotReplies 即停止；
   * - 确保回复机制：策略选出 0 个机器人时随机兜底；AI 调用失败时输出保底回复。
   */
  async triggerRobotReplies(
    group: Group,
    humanMsg: Message,
    emit: GroupMessageEmit
  ): Promise<void> {
    // 人类消息打断机器人连续回复计数
    const counterKey = `${RedisKey.GroupRobotReplies}:${group.id}`;
    await this.redisService.del(counterKey);

    const robots = await this.robotService.getRobotsByIds(group.members || []);
    if (robots.length === 0) {
      return;
    }

    let selected: User[];
    switch (group.strategy) {
      case GroupReplyStrategy.All:
        selected = robots;
        break;
      case GroupReplyStrategy.Random:
        selected = [this.robotService.randomRobot(robots)];
        break;
      case GroupReplyStrategy.Content:
      default: {
        const matched = this.robotService.matchRobots(robots, humanMsg.message);
        selected =
          matched.length > 0
            ? matched
            : [this.robotService.randomRobot(robots)];
        break;
      }
    }
    // 确保至少一个机器人回复
    if (selected.length === 0) {
      selected = [this.robotService.randomRobot(robots)];
    }

    const maxReplies = group.maxRobotReplies > 0 ? group.maxRobotReplies : 3;
    const replied = new Set<string>();
    for (const robot of selected) {
      if (replied.has(robot.id)) {
        continue;
      }
      replied.add(robot.id);
      // 防循环兜底：限制机器人连续回复条数
      const count = await this.redisService.incr(counterKey);
      await this.redisService.expire(counterKey, 60);
      if (count > maxReplies) {
        break;
      }
      // 模拟机器人思考/打字间隔
      await sleep(400 + Math.random() * 800);
      let content: string;
      try {
        const matchedKeyword = this.matchRobotKeyword(robot, humanMsg.message);
        content = await this.aiService.chat({
          message: humanMsg.message,
          robot: this.robotService.buildRobotInfo(robot, matchedKeyword),
        });
      } catch (err) {
        this.logger.error(
          `[group:${group.id}] 机器人${robot.name}回复失败：${err.message}`
        );
        content = this.robotService.fallbackReply(robot);
      }
      const robotMsg = await this.saveMessage(group.id, robot.id, content);
      emit(await this.messageService.toDto(robotMsg));
    }
  }

  private matchRobotKeyword(robot: User, message: string): string {
    return this.robotService.matchKeyword(robot, message);
  }
}
