import { Rule } from '@midwayjs/validation';
import * as Joi from 'joi';
import { ApiProperty } from '@midwayjs/swagger';

export class GroupIdReqDto {
  @Rule(Joi.string().required())
  @ApiProperty({ required: true })
  id: string;
}
