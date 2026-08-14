import { Middleware, IMiddleware } from '@midwayjs/core';
import { NextFunction, Context } from '@midwayjs/koa';
import { success } from '../common/res';

@Middleware()
export class ResMiddleware implements IMiddleware<Context, NextFunction> {
  resolve() {
    return async (ctx: Context, next: NextFunction) => {
      const req = JSON.stringify(Object.assign(ctx.query, ctx.request.body));
      try {
        const res = await next();
        const packRes = success(res);
        ctx.logger.info(
          `${ctx.req.method} ${ctx.req.url} req:${req} res:${JSON.stringify(packRes)}`
        );
        return packRes;
      } catch (error) {
        ctx.logger.error(
          `${ctx.req.method} ${ctx.req.url} req:${req} error:${JSON.stringify(error)}`
        );
        throw error;
      }
    };
  }

  static getName(): string {
    return 'report';
  }
}
