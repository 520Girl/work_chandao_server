import { ModuleConfig } from '@cool-midway/core';

export default () => {
  return {
    name: '冥想核心模块',
    description: '处理冥想会话、实时生理数据及报告生成',
    middlewares: [],
    globalMiddlewares: [],
    order: 10,
  } as ModuleConfig;
};
