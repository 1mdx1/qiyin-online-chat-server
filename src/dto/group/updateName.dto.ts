import { Rule } from '@midwayjs/validation';
import * as Joi from 'joi';
import { ApiProperty } from '@midwayjs/swagger';
import { SuccessWrapper } from '../common.dto';
import { GroupDto } from './group.dto';

export class UpdateGroupNameReqDto {
  @Rule(Joi.string().required())
  @ApiProperty({ required: true })
  id: string;

  @Rule(Joi.string().required())
  @ApiProperty({ required: true })
  name: string;
}

export class UpdateGroupNameResDto extends SuccessWrapper<GroupDto>(GroupDto) {}
