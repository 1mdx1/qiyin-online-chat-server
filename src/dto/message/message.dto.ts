import { Rule } from '@midwayjs/validation';
import * as Joi from 'joi';
import { ApiProperty } from '@midwayjs/swagger';

/** 消息返回结构（个人对话与群组对话通用） */
export class MessageDto {
  @Rule(Joi.string().required())
  @ApiProperty({ required: true })
  id: string;

  @Rule(Joi.string().allow(null).required())
  @ApiProperty({ type: 'string', nullable: true, required: false })
  gid: string | null;

  @Rule(Joi.string().allow(null).required())
  @ApiProperty({ type: 'string', nullable: true, required: false })
  cid: string | null;

  @Rule(Joi.string().required())
  @ApiProperty({ required: true })
  uid: string;

  @Rule(Joi.string().required())
  @ApiProperty({ required: true })
  senderName: string;

  @Rule(Joi.number().required())
  @ApiProperty({ required: true })
  senderType: number;

  @Rule(Joi.number().required())
  @ApiProperty({ required: true, description: '0=正常 1=AI回复失败' })
  status: number;

  @Rule(Joi.string().required())
  @ApiProperty({ required: true })
  message: string;

  @Rule(Joi.date().allow(null).required())
  @ApiProperty({
    type: 'string',
    format: 'date-time',
    nullable: true,
    required: false,
  })
  createdAt: Date | null;
}
