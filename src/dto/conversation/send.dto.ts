import { Rule, getSchema } from '@midwayjs/validation';
import * as Joi from 'joi';
import { ApiProperty, getSchemaPath, ApiExtraModel } from '@midwayjs/swagger';
import { SuccessWrapper } from '../common.dto';
import { MessageDto } from '../message/message.dto';

export class SendMessageReqDto {
  @Rule(Joi.string().required())
  @ApiProperty({ required: true })
  id: string;

  @Rule(Joi.string().min(1).max(2000).required())
  @ApiProperty({ required: true })
  message: string;
}

export class ConversationMessageListReqDto {
  @Rule(Joi.string().required())
  @ApiProperty({ required: true })
  id: string;

  @Rule(Joi.number().integer().min(1).default(1))
  @ApiProperty({ required: false, type: 'number' })
  page?: number;

  @Rule(Joi.number().integer().min(1).max(200).default(50))
  @ApiProperty({ required: false, type: 'number' })
  pageSize?: number;
}

@ApiExtraModel(MessageDto)
export class SendMessageDataDto {
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

export class SendMessageResDto extends SuccessWrapper<SendMessageDataDto>(
  SendMessageDataDto
) {}

@ApiExtraModel(MessageDto)
export class ConversationMessageListDto {
  @Rule(() => Joi.array().items(getSchema(MessageDto)).required())
  @ApiProperty({
    required: true,
    type: 'array',
    items: { $ref: getSchemaPath(MessageDto) },
  })
  list: MessageDto[];

  @Rule(Joi.number().required())
  @ApiProperty({ required: true, description: '消息总数' })
  total: number;

  @Rule(Joi.number().required())
  @ApiProperty({ required: true, description: '当前页码' })
  page: number;

  @Rule(Joi.number().required())
  @ApiProperty({ required: true, description: '每页数量' })
  pageSize: number;
}

export class ConversationMessageListResDto extends SuccessWrapper<ConversationMessageListDto>(
  ConversationMessageListDto
) {}
