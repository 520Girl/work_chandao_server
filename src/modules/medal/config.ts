
import { ModuleConfig } from '@cool-midway/core';

/**
 * 模块配置
 */
export default () => {
  return {
    // 模块名称
    name: '勋章系统',
    // 模块描述
    description: '勋章管理与自动发放',
    // 中间件
    middlewares: [],
    // 全局中间件
    globalMiddlewares: [],
    // 模块加载顺序
    order: 0,
  } as ModuleConfig;
};
