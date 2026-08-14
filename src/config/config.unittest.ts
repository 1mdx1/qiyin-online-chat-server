import { MidwayConfig } from '@midwayjs/core';

export default {
  koa: {
    port: null,
  },
  socketIO: {
    port: 39001,
  },
  // 单元/集成测试使用内置模拟 AI（provider 为空），避免依赖外部 algochat 服务，保证确定性
  ai: {
    provider: '',
  },
} as MidwayConfig;
