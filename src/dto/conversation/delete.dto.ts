import { Rule } from '@midwayjs/validation';
import * as Joi from 'joi';
import { ApiProperty } from '@midwayjs/swagger';
import { SuccessWrapper } from '../common.dto';

export class DeleteConversationListReqDto {
  @Rule(Joi.string().required())
  @ApiProperty({ required: true })
  id: string;
}

export class DeleteConversationResDto extends SuccessWrapper<void>(Object) {}
