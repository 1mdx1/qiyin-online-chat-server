import { Rule } from '@midwayjs/validation';
import * as Joi from 'joi';
import { ApiProperty } from '@midwayjs/swagger';
import { SuccessWrapper } from '../common.dto';
import { ConversationDto } from './list.dto';

export class UpdateTagsReqDto {
  @Rule(Joi.string().required())
  @ApiProperty({ required: true })
  id: string;

  @Rule(Joi.array().items(Joi.string()).required())
  @ApiProperty({ required: true, type: 'array', items: { type: 'string' } })
  tags: string[];
}

export class UpdateTagsResDto extends SuccessWrapper<ConversationDto>(ConversationDto) {}
