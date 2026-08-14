import { Rule } from '@midwayjs/validation';
import * as Joi from 'joi';
import { ApiProperty } from '@midwayjs/swagger';

/** 邀请人类用户加入群组：按账号名（name）精确匹配 */
export class GroupInviteReqDto {
  @Rule(Joi.string().required())
  @ApiProperty({ required: true })
  id: string;

  @Rule(Joi.string().min(1).max(30).required())
  @ApiProperty({ required: true, description: '被邀请用户的账号名' })
  name: string;
}
