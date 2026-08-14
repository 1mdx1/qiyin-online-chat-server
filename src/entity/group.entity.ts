import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum GroupReplyStrategy {
  /** 按消息内容关键词匹配，优先回复匹配到的机器人，无匹配则随机一个机器人 */
  Content = 'content',
  /** 随机一个机器人回复 */
  Random = 'random',
  /** 群内所有机器人均回复 */
  All = 'all',
}

@Entity({ name: 'group' })
export class Group {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ comment: '群组名称' })
  name: string;

  @Column({ comment: '创建者用户id' })
  uid: string;

  @Column('text', { array: true, comment: '成员列表（含人类与机器人）' })
  members: string[];

  @Column({
    type: 'varchar',
    default: GroupReplyStrategy.Content,
    comment: '机器人回复策略',
  })
  strategy: GroupReplyStrategy;

  @Column({
    type: 'smallint',
    default: 3,
    comment: '机器人连续回复上限（防循环）',
  })
  maxRobotReplies: number;

  @UpdateDateColumn()
  updatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
