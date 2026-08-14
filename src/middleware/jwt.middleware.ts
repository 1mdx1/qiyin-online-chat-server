import { Inject, Middleware, IMiddleware } from '@midwayjs/core';
import { Context, NextFunction } from '@midwayjs/koa';
import { JwtService } from '@midwayjs/jwt';
import { ErrorCode, CustomError } from '../common/error';

@Middleware()
export class JwtMiddleware implements IMiddleware<Context, NextFunction> {
  @Inject()
  jwtService: JwtService;

  resolve() {
    return async (ctx: Context, next: NextFunction) => {
      // 判断下有没有校验信息
      if (!ctx.headers['authorization']) {
        throw new CustomError(ErrorCode.UnauthorizedError);
      }
      // 从 header 上获取校验信息
      const parts = ctx.get('authorization').trim().split(' ');

      if (parts.length !== 2) {
        throw new CustomError(ErrorCode.UnauthorizedError);
      }

      const [scheme, token] = parts;

      if (/^Bearer$/i.test(scheme)) {
        try {
          //jwt.verify方法验证token是否有效
          const jwt = await this.jwtService.verify(token);
          ctx.uid = jwt['uid'];
        } catch (error) {
          throw new CustomError(ErrorCode.UnauthorizedError);
        }
        await next();
      }
    };
  }

  // 配置忽略鉴权的路由地址
  public ignore(ctx: Context): boolean {
    return ctx.path.startsWith('/user');
  }
}
