import { Configuration, App, CommonJSFileDetector } from '@midwayjs/core';
import * as koa from '@midwayjs/koa';
import * as validation from '@midwayjs/validation';
import * as info from '@midwayjs/info';
import { join } from 'path';
import { DefaultErrorFilter } from './filter/default.filter';
import { NotFoundErrorFilter } from './filter/notfound.filter';
import { CustomdErrorFilter } from './filter/custom.filter';
import { ValidationErrorFilter } from './filter/validation.filter';
import { ResMiddleware } from './middleware/res.middleware';
import { JwtMiddleware } from './middleware/jwt.middleware';
import * as swagger from '@midwayjs/swagger';
import * as orm from '@midwayjs/typeorm';
import * as jwt from '@midwayjs/jwt';
import * as crossDomain from '@midwayjs/cross-domain';
import * as redis from '@midwayjs/redis';
import * as socketio from '@midwayjs/socketio';
import { RobotService } from './service/robot.service';

@Configuration({
  imports: [
    koa,
    validation,
    {
      component: info,
      enabledEnvironment: ['local'],
    },
    swagger,
    orm,
    jwt,
    crossDomain,
    redis,
    socketio,
  ],
  importConfigs: [join(__dirname, './config')],
  detector: new CommonJSFileDetector(),
})
export class MainConfiguration {
  @App('koa')
  app: koa.Application;

  async onReady() {
    // add middleware
    this.app.useMiddleware([ResMiddleware, JwtMiddleware]);
    // add filter
    this.app.useFilter([
      CustomdErrorFilter,
      ValidationErrorFilter,
      NotFoundErrorFilter,
      DefaultErrorFilter,
    ]);
    // 初始化预设机器人角色
    try {
      const robotService = await this.app
        .getApplicationContext()
        .getAsync(RobotService);
      await robotService.ensureSeed();
    } catch (error) {
      this.app
        .getCoreLogger()
        .error(`[init] 初始化机器人角色失败: ${error.message}`);
    }
  }
}
