import { Catch, MidwayError } from '@midwayjs/core';
import { failed } from '../common/res';
import { ErrorCode, CustomError } from '../common/error';
import { Context } from '@midwayjs/koa';

@Catch()
export class DefaultErrorFilter {
  async catch(error: MidwayError, ctx: Context) {
    ctx.logger.error(error);
    return failed(new CustomError(ErrorCode.Unknown));
  }
}
