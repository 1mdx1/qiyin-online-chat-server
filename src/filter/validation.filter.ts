import { Catch } from '@midwayjs/core';
import { failed } from '../common/res';
import { ErrorCode, CustomError } from '../common/error';
import { MidwayValidationError } from '@midwayjs/validation';
import { Context } from '@midwayjs/koa';

@Catch(MidwayValidationError)
export class ValidationErrorFilter {
  async catch(error: MidwayValidationError, ctx: Context) {
    ctx.logger.error(error);
    return failed(new CustomError(ErrorCode.ParamsValidateFailed));
  }
}
