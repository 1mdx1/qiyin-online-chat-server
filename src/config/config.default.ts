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
} as MidwayConfig;
