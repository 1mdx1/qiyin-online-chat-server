import '@midwayjs/core';

declare module '@midwayjs/core' {
  interface Context {
    uid: string;
  }
}
