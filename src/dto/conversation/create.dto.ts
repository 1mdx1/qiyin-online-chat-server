import { Rule, getSchema } from '@midwayjs/validation';
import * as Joi from 'joi';
import { ApiProperty, getSchemaPath, ApiExtraModel } from '@midwayjs/swagger';
import { SuccessWrapper } from '../common.dto';
import { MessageDto } from '../message/message.dto';
import { ConversationDto } from './list.dto';

export class CreateConversationReqDto {
  @Rule(Joi.string().required())
  @ApiProperty({ required: true })
  message: string;
}

@ApiExtraModel([ConversationDto, MessageDto])
export class CreateConversationDataDto {
  @Rule(() => getSchema(ConversationDto).required())
  @ApiProperty({
    type: 'object',
    $ref: getSchemaPath(ConversationDto),
    required: true,
  })
  conversation: ConversationDto;

  @Rule(() => getSchema(MessageDto).required())
  @ApiProperty({
    type: 'object',
    $ref: getSchemaPath(MessageDto),
    required: true,
  })
  userMessage: MessageDto;

  @Rule(() => getSchema(MessageDto).allow(null).required())
  @ApiProperty({
    type: 'object',
    $ref: getSchemaPath(MessageDto),
    nullable: true,
    required: false,
  })
  reply: MessageDto | null;
}

export class CreateConversationResDto extends SuccessWrapper<CreateConversationDataDto>(
  CreateConversationDataDto
) {}
