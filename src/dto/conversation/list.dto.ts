import { Rule, getSchema } from '@midwayjs/validation';
import * as Joi from 'joi';
import { ApiProperty, getSchemaPath, ApiExtraModel } from '@midwayjs/swagger';
import { SuccessWrapper } from '../common.dto';

export class ConversationDto {
  @Rule(Joi.string().required())
  @ApiProperty({ required: true })
  id: string;

  @Rule(Joi.string().required())
  @ApiProperty({ required: true })
  name: string;

  @Rule(Joi.array().items(Joi.string()).required())
  @ApiProperty({ required: true, type: 'array', items: { type: 'string' } })
  tags: string[];
}

@ApiExtraModel(ConversationDto)
export class ConversationListDto {
  @Rule(() => Joi.array().items(getSchema(ConversationDto)).required())
  @ApiProperty({
    required: true,
    type: 'array',
    items: { $ref: getSchemaPath(ConversationDto) },
  })
  list: ConversationDto[];
}

export class GetConversationListReqDto {
  @Rule(Joi.array().items(Joi.string()))
  @ApiProperty({ type: 'array', items: { type: 'string' } })
  tags?: string[];
}

export class GetConversationListResDto extends SuccessWrapper<ConversationListDto>(
  ConversationListDto
) {}
