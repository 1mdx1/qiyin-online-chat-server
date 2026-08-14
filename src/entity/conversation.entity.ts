import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'conversation' })
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ comment: '对话标题' })
  name: string;

  @Column({ comment: '用户id' })
  uid: string;

  @Column('text', { array: true, comment: '用户标签' })
  tags: string[];

  @UpdateDateColumn({ select: false })
  updatedAt: Date;

  @CreateDateColumn({ select: false })
  createdAt: Date;
}
