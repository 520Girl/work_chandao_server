import { ModuleConfig } from '@cool-midway/core';

/**
 * 模块配置
 */
export default () => {
  return {
    // 模块名称
    name: '团队模块',
    // 模块描述
    description: '团队相关功能',
    // 中间件，只对本模块有效
    middlewares: [],
    // 中间件，全局有效
    globalMiddlewares: [],
    // 模块加载顺序，默认为0，值越大越优先加载
    order: 0,
    // 邀请小程序码 page / env_version / check_path 已迁至根配置 src/config（team），按 config.local / config.prod 与环境变量切换
  } as ModuleConfig;
};
