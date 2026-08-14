import { MidwayConfig } from '@midwayjs/core';

export default {
  koa: {
    port: 38001,
  },
  typeorm: {
    dataSource: {
      default: {
        type: 'postgres',
        host: '127.0.0.1',
        port: 5432,
        username: 'postgres',
        password: 'zDRANX1QkDeNkYAR',
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
      password: 'K9MhqJUg',
      db: 0,
    },
  },
} as MidwayConfig;
