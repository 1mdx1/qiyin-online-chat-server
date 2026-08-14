import { Rule } from '@midwayjs/validation';
import * as Joi from 'joi';
import { ApiProperty } from '@midwayjs/swagger';
import { SuccessWrapper } from '../common.dto';
import { GroupDto } from './group.dto';

export class UpdateGroupStrategyReqDto {
  @Rule(Joi.string().required())
  @ApiProperty({ required: true })
  id: string;

  @Rule(Joi.string().valid('content', 'random', 'all').required())
  @ApiProperty({
    required: true,
    description: '机器人回复策略：content/random/all',
  })
  strategy: string;

  @Rule(Joi.number().integer().min(1).max(10).optional())
  @ApiProperty({ required: false, description: '机器人连续回复上限（防循环）' })
  maxRobotReplies?: number;
}

export class UpdateGroupStrategyResDto extends SuccessWrapper<GroupDto>(
  GroupDto
) {}
