import { Catch, httpError, MidwayHttpError } from '@midwayjs/core';
import { failed } from '../common/res';
import { ErrorCode, CustomError } from '../common/error';
import { Context } from '@midwayjs/koa';

@Catch(httpError.NotFoundError)
export class NotFoundErrorFilter {
  async catch(error: MidwayHttpError, ctx: Context) {
    ctx.logger.error(error);
    return failed(new CustomError(ErrorCode.Notfound));
  }
}
