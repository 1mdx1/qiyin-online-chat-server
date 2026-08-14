import { Rule } from '@midwayjs/validation';
import * as Joi from 'joi';
import { ApiProperty } from '@midwayjs/swagger';

export class CreateGroupReqDto {
  @Rule(Joi.string().required())
  @ApiProperty({ required: true })
  name: string;

  @Rule(Joi.array().items(Joi.string().required()).min(1).required())
  @ApiProperty({ required: true, type: 'array', items: { type: 'string' } })
  robotIds: string[];
}
