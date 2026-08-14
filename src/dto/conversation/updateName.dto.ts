import { Rule } from '@midwayjs/validation';
import * as Joi from 'joi';
import { ApiProperty } from '@midwayjs/swagger';
import { SuccessWrapper } from '../common.dto';
import { ConversationDto } from './list.dto';

export class UpdateConversationNameReqDto {
  @Rule(Joi.string().required())
  @ApiProperty({ required: true })
  id: string;

  @Rule(Joi.string().required())
  @ApiProperty({ required: true })
  name: string;
}

export class UpdateConversationNameResDto extends SuccessWrapper<ConversationDto>(
  ConversationDto
) {}
