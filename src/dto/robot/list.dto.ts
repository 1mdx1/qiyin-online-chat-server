import { Rule, getSchema } from '@midwayjs/validation';
import * as Joi from 'joi';
import { ApiProperty, getSchemaPath, ApiExtraModel } from '@midwayjs/swagger';
import { SuccessWrapper } from '../common.dto';

export class RobotDto {
  @Rule(Joi.string().required())
  @ApiProperty({ required: true })
  id: string;

  @Rule(Joi.string().required())
  @ApiProperty({ required: true })
  name: string;

  @Rule(Joi.string().allow('').required())
  @ApiProperty({ required: true })
  personality: string;
}

@ApiExtraModel(RobotDto)
export class RobotListDto {
  @Rule(() => Joi.array().items(getSchema(RobotDto)).required())
  @ApiProperty({
    required: true,
    type: 'array',
    items: { $ref: getSchemaPath(RobotDto) },
  })
  list: RobotDto[];
}

export class RobotListResDto extends SuccessWrapper<RobotListDto>(
  RobotListDto
) {}
