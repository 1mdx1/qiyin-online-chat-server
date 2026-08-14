import { ApiProperty, Type } from '@midwayjs/swagger';

export class ResponseDto<T> {
  @ApiProperty()
  code: number;

  @ApiProperty()
  message: string;

  @ApiProperty({ nullable: true, required: false })
  data?: T;
}

export function SuccessWrapper<T>(ResourceCls: Type<T>): Type<ResponseDto<T>> {
  class Successed {
    @ApiProperty({ description: '状态码' })
    code: number;

    @ApiProperty({ description: '消息' })
    message: string;

    @ApiProperty({
      type: ResourceCls,
    })
    data: T;
  }
  return Successed;
}
