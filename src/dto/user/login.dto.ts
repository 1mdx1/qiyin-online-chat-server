import { Rule, getSchema } from '@midwayjs/validation';
import * as Joi from 'joi';
import { ApiProperty } from '@midwayjs/swagger';
import { SuccessWrapper } from '../common.dto';

export class LoginReqDTO {
  @Rule(Joi.string().required())
  @ApiProperty({ required: true })
  email: string;

  @Rule(Joi.string().min(6))
  @ApiProperty({ required: true })
  password: string;
}

export class UserDto {
  @Rule(Joi.string().required())
  @ApiProperty({ required: true })
  uid: string;

  @Rule(Joi.string().required())
  @ApiProperty({ required: true })
  name: string;
}

export class LoginUserDto {
  @Rule(Joi.string().required())
  @ApiProperty({ required: true })
  token: string;

  @Rule(() => getSchema(UserDto).required())
  @ApiProperty({ type: UserDto, required: true })
  user: UserDto;
}

export class LoginResDTO extends SuccessWrapper<LoginUserDto>(LoginUserDto) {}
