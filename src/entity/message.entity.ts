import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum MessageStatus {
  /** 正常 */
  Normal = 0,
  /** AI 回复失败（重试后仍失败，用于标记回复位置） */
  AiError = 1,
}

@Entity({ name: 'message' })
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ comment: '组id', nullable: true })
  gid: string;

  @Column({ comment: '会话id', nullable: true })
  cid: string;

  @Column({ comment: '发送者用户id（人类或机器人）' })
  uid: string;

  @Column({ type: 'smallint', default: MessageStatus.Normal, comment: '消息状态' })
  status: MessageStatus;

  @Column()
  message: string;

  @UpdateDateColumn()
  updatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
