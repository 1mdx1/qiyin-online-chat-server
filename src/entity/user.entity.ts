import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserType {
  Human = 1,
  Robot = 2,
}

@Entity({ name: 'user' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'enum', enum: UserType, default: UserType.Human })
  type: UserType;

  @Column()
  password: string;

  @Column({
    type: 'varchar',
    nullable: true,
    comment: '机器人性格/回复倾向，仅机器人使用',
  })
  personality: string;

  @UpdateDateColumn()
  updatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
