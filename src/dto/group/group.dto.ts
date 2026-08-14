import { Rule, getSchema } from '@midwayjs/validation';
import * as Joi from 'joi';
import { ApiProperty, getSchemaPath, ApiExtraModel } from '@midwayjs/swagger';
import { SuccessWrapper } from '../common.dto';

/** 群组创建返回（群组基础信息） */
export class GroupDto {
  @Rule(Joi.string().required())
  @ApiProperty({ required: true })
  id: string;

  @Rule(Joi.string().required())
  @ApiProperty({ required: true })
  name: string;

  @Rule(Joi.string().required())
  @ApiProperty({ required: true })
  uid: string;

  @Rule(Joi.array().items(Joi.string()).required())
  @ApiProperty({ required: true, type: 'array', items: { type: 'string' } })
  members: string[];

  @Rule(Joi.string().required())
  @ApiProperty({
    required: true,
    description: '机器人回复策略：content/random/all',
  })
  strategy: string;

  @Rule(Joi.number().required())
  @ApiProperty({ required: true, description: '机器人连续回复上限' })
  maxRobotReplies: number;

  @Rule(Joi.date().allow(null).required())
  @ApiProperty({
    type: 'string',
    format: 'date-time',
    nullable: true,
    required: false,
  })
  createdAt: Date | null;

  @Rule(Joi.date().allow(null).required())
  @ApiProperty({
    type: 'string',
    format: 'date-time',
    nullable: true,
    required: false,
  })
  updatedAt: Date | null;
}

/** 群组列表项 */
export class GroupListItemDto {
  @Rule(Joi.string().required())
  @ApiProperty({ required: true })
  id: string;

  @Rule(Joi.string().required())
  @ApiProperty({ required: true })
  name: string;

  @Rule(Joi.string().required())
  @ApiProperty({ required: true })
  uid: string;

  @Rule(Joi.string().required())
  @ApiProperty({
    required: true,
    description: '机器人回复策略：content/random/all',
  })
  strategy: string;

  @Rule(Joi.number().required())
  @ApiProperty({ required: true })
  maxRobotReplies: number;

  @Rule(Joi.number().required())
  @ApiProperty({ required: true, description: '成员数量' })
  memberCount: number;

  @Rule(Joi.date().allow(null).required())
  @ApiProperty({
    type: 'string',
    format: 'date-time',
    nullable: true,
    required: false,
  })
  createdAt: Date | null;

  @Rule(Joi.date().allow(null).required())
  @ApiProperty({
    type: 'string',
    format: 'date-time',
    nullable: true,
    required: false,
  })
  updatedAt: Date | null;
}

@ApiExtraModel(GroupListItemDto)
export class GroupListDto {
  @Rule(() => Joi.array().items(getSchema(GroupListItemDto)).required())
  @ApiProperty({
    required: true,
    type: 'array',
    items: { $ref: getSchemaPath(GroupListItemDto) },
  })
  list: GroupListItemDto[];
}

export class GroupListResDto extends SuccessWrapper<GroupListDto>(
  GroupListDto
) {}

/** 群组成员信息 */
export class GroupMemberDto {
  @Rule(Joi.string().required())
  @ApiProperty({ required: true })
  id: string;

  @Rule(Joi.string().required())
  @ApiProperty({ required: true })
  name: string;

  @Rule(Joi.number().required())
  @ApiProperty({ required: true, description: '1=人类 2=机器人' })
  type: number;

  @Rule(Joi.string().allow('', null).required())
  @ApiProperty({ type: 'string', nullable: true, required: false })
  personality: string | null;
}

/** 群组详情 */
@ApiExtraModel(GroupMemberDto)
export class GroupDetailDto {
  @Rule(Joi.string().required())
  @ApiProperty({ required: true })
  id: string;

  @Rule(Joi.string().required())
  @ApiProperty({ required: true })
  name: string;

  @Rule(Joi.string().required())
  @ApiProperty({ required: true })
  uid: string;

  @Rule(Joi.string().required())
  @ApiProperty({ required: true })
  creatorName: string;

  @Rule(Joi.string().required())
  @ApiProperty({
    required: true,
    description: '机器人回复策略：content/random/all',
  })
  strategy: string;

  @Rule(Joi.number().required())
  @ApiProperty({ required: true })
  maxRobotReplies: number;

  @Rule(() => Joi.array().items(getSchema(GroupMemberDto)).required())
  @ApiProperty({
    required: true,
    type: 'array',
    items: { $ref: getSchemaPath(GroupMemberDto) },
  })
  members: GroupMemberDto[];

  @Rule(Joi.date().allow(null).required())
  @ApiProperty({
    type: 'string',
    format: 'date-time',
    nullable: true,
    required: false,
  })
  createdAt: Date | null;

  @Rule(Joi.date().allow(null).required())
  @ApiProperty({
    type: 'string',
    format: 'date-time',
    nullable: true,
    required: false,
  })
  updatedAt: Date | null;
}

export class GroupDetailResDto extends SuccessWrapper<GroupDetailDto>(
  GroupDetailDto
) {}

export class GroupCreateResDto extends SuccessWrapper<GroupDetailDto>(
  GroupDetailDto
) {}
