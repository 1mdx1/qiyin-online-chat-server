import { Provide } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository, In } from 'typeorm';
import { Message } from '../entity/message.entity';
import { User, UserType } from '../entity/user.entity';

export interface MessageDto {
  id: string;
  gid: string | null;
  cid: string | null;
  uid: string;
  senderName: string;
  senderType: UserType;
  status: number;
  message: string;
  createdAt: Date;
}

@Provide()
export class MessageService {
  @InjectEntityModel(User)
  private readonly userModel: Repository<User>;

  async toDto(msg: Message): Promise<MessageDto> {
    const sender = await this.userModel.findOne({ where: { id: msg.uid } });
    return {
      id: msg.id,
      gid: msg.gid || null,
      cid: msg.cid || null,
      uid: msg.uid,
      senderName: sender ? sender.name : '已注销用户',
      senderType: sender ? sender.type : UserType.Human,
      status: msg.status,
      message: msg.message,
      createdAt: msg.createdAt,
    };
  }

  async toDtoList(msgs: Message[]): Promise<MessageDto[]> {
    if (!msgs || msgs.length === 0) {
      return [];
    }
    const uids = Array.from(new Set(msgs.map(m => m.uid)));
    const users = await this.userModel.find({ where: { id: In(uids) } });
    const userMap = new Map<string, User>();
    for (const u of users) {
      userMap.set(u.id, u);
    }
    return msgs.map(m => {
      const sender = userMap.get(m.uid);
      return {
        id: m.id,
        gid: m.gid || null,
        cid: m.cid || null,
        uid: m.uid,
        senderName: sender ? sender.name : '已注销用户',
        senderType: sender ? sender.type : UserType.Human,
        status: m.status,
        message: m.message,
        createdAt: m.createdAt,
      };
    });
  }
}
