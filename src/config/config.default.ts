import { MidwayConfig } from '@midwayjs/core';
import joi from '@midwayjs/validation-joi';

export default {
  // use for cookie sign key, should change to your own and keep security
  keys: '1786525495028_7674',
  koa: {
    port: 7001,
  },
  validation: {
    validators: {
      joi,
    },
  },
  jwt: {
    secret: 'WB58ZiK2aKGT1016', // fs.readFileSync('xxxxx.key')
    sign: {
      expiresIn: '8h',
    },
  },
  cors: {
    origin: '*',
  },
  swagger: {
    title: 'qiyin-chat',
    description: '',
  },
  typeorm: {
    dataSource: {
      default: {
        type: 'postgres',
        host: '127.0.0.1',
        port: 5432,
        username: 'postgres',
        password: '123456',
        database: 'qiyin',
        synchronize: false,
        logging: false,
        entities: ['**/entity/*.entity.{j,t}s'],
        migrations: ['**/migration/*.ts'],
      },
    },
  },
  redis: {
    client: {
      port: 6379,
      host: '127.0.0.1',
      db: 0,
    },
  },
  /**
   * AI 调用配置
   * - provider: ''（内置模拟回复）| 'http'（自定义 apiUrl）| 'algochat'（algochat.app）
   * - timeout: 单次调用超时（毫秒）
   * - maxRetries: 失败后的最大重试次数
   * - retryDelay: 重试间隔（毫秒）
   */
  ai: {
    provider: 'algochat',
    apiUrl: '',
    model: 'gemini-3-flash-preview',
    timeout: 60000,
    maxRetries: 2,
    retryDelay: 500,
  },
} as MidwayConfig;
