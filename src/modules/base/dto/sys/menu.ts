import { Rule, RuleType } from '@midwayjs/validate';

/**
 * 菜单解析请求
 * @example
 * {
 *   "entity": "UserEntity",
 *   "controller": "UserController",
 *   "module": "user"
 * }
 */
export class BaseSysMenuParseDTO {
  /**
   * 实体名称
   * @example "UserEntity"
   */
  @Rule(RuleType.string().required())
  entity: string;

  /**
   * 控制器名称
   * @example "UserController"
   */
  @Rule(RuleType.string().required())
  controller: string;

  /**
   * 模块名称
   * @example "user"
   */
  @Rule(RuleType.string().required())
  module: string;
}

/**
 * 菜单创建请求
 * @example
 * {
 *   "name": "用户管理",
 *   "router": "/user",
 *   "icon": "user",
 *   "type": 1
 * }
 */
export class BaseSysMenuCreateDTO {
  /**
   * 菜单名称
   * @example "用户管理"
   */
  @Rule(RuleType.string().required())
  name: string;

  /**
   * 菜单路由
   * @example "/user"
   */
  @Rule(RuleType.string().required())
  router: string;

  /**
   * 菜单图标
   * @example "user"
   */
  @Rule(RuleType.string())
  icon?: string;

  /**
   * 菜单类型（0-目录，1-菜单，2-按钮）
   * @example 1
   */
  @Rule(RuleType.number())
  type?: number;
}

/**
 * 菜单导出请求
 * @example
 * {
 *   "ids": [1, 2, 3]
 * }
 */
export class BaseSysMenuExportDTO {
  /**
   * 菜单ID列表
   * @example [1, 2, 3]
   */
  @Rule(RuleType.array())
  ids: number[];
}

/**
 * 菜单导入请求
 * @example
 * {
 *   "menus": [
 *     {
 *       "name": "用户管理",
 *       "router": "/user",
 *       "type": 1
 *     }
 *   ]
 * }
 */
export class BaseSysMenuImportDTO {
  /**
   * 菜单列表
   * @example [{"name":"用户管理","router":"/user","type":1}]
   */
  @Rule(RuleType.array())
  menus: any[];
}
