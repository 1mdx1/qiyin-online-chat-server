import { Catch } from '@midwayjs/core';
import { failed } from '../common/res';
import { CustomError } from '../common/error';
import { Context } from '@midwayjs/koa';

@Catch(CustomError)
export class CustomdErrorFilter {
  async catch(error: CustomError, ctx: Context) {
    ctx.logger.error(error);
    return failed(error);
  }
}
