import { Rule } from '@midwayjs/validation';
import * as Joi from 'joi';
import { ApiProperty } from '@midwayjs/swagger';

export class GroupMembersReqDto {
  @Rule(Joi.string().required())
  @ApiProperty({ required: true })
  id: string;

  @Rule(Joi.array().items(Joi.string().required()).min(1).required())
  @ApiProperty({ required: true, type: 'array', items: { type: 'string' } })
  memberIds: string[];
}
