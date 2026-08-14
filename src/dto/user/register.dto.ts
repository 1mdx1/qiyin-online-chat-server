import { Rule } from '@midwayjs/validation';
import * as Joi from 'joi';
import { ApiProperty } from '@midwayjs/swagger';

export class RegisterDTO {
  @Rule(Joi.string().required())
  @ApiProperty({ required: true })
  name: string;

  @Rule(Joi.string().min(6))
  @ApiProperty({ required: true })
  password: string;
}
